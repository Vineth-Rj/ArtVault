const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../db/client');
const config = require('../utils/config');
const HttpError = require('../utils/httpError');
const { toCents, fromCents } = require('../utils/money');
const { toNum } = require('../utils/serialize');
const { splitPrimary, splitSecondary } = require('./royalty.service');
const wallet = require('./wallet.service');

const TX_OPTS = { timeout: 30000, maxWait: 10000 };
const MAX_QTY = 20;
const MAX_PRICE = 1000000;

// Lock order used everywhere: artist market -> sell order -> unit -> wallets (sorted).
// A single consistent order prevents deadlocks; the market lock serialises all trading per artist.
async function lockMarket(tx, artistId) {
  const rows = await tx.$queryRaw`SELECT id FROM artist_markets WHERE artist_id = ${artistId} FOR UPDATE`;
  if (!rows.length) throw new HttpError(404, 'This artist has not issued units');
  return tx.artistMarket.findUnique({ where: { artistId } });
}

async function countHolders(tx, artistId) {
  const rows = await tx.$queryRaw`SELECT COUNT(DISTINCT owner_id)::int AS n FROM art_units WHERE artist_id = ${artistId} AND owner_id IS NOT NULL`;
  return rows[0].n;
}

function checkExpected(body, priceCents) {
  if (body.expectedPrice !== undefined && toCents(body.expectedPrice) !== priceCents) {
    throw new HttpError(409, `Price changed to ${fromCents(priceCents)}. Please review and try again.`);
  }
}

// POST /api/market/buy
//   { artistId, quantity }  -> buy new units at the current market price
//   { sellOrderId }         -> buy a listed unit at its asking price
async function buy(user, body) {
  if (body.sellOrderId) return buySecondary(user, body);
  if (body.artistId) return buyPrimary(user, body);
  throw new HttpError(400, 'Provide sellOrderId (resale) or artistId (new units)');
}

async function buyPrimary(user, body) {
  const artistId = String(body.artistId);
  const qty = body.quantity === undefined ? 1 : Number(body.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new HttpError(400, `Quantity must be a whole number from 1 to ${MAX_QTY}`);
  if (artistId === user.id) throw new HttpError(403, 'Artists cannot buy their own units');

  return prisma.$transaction(async (tx) => {
    const market = await lockMarket(tx, artistId);
    const priceCents = toCents(market.currentPrice);
    checkExpected(body, priceCents);

    const units = await tx.$queryRaw`
      SELECT id, unit_number FROM art_units
      WHERE artist_id = ${artistId} AND status = 'AVAILABLE'
      ORDER BY unit_number LIMIT ${qty} FOR UPDATE`;
    if (units.length < qty) throw new HttpError(409, units.length === 0 ? 'UNIT NO LONGER AVAILABLE: this artist is sold out' : `Only ${units.length} unit(s) available`);

    const totalCents = priceCents * qty;
    const balances = await wallet.lockUsers(tx, [user.id, artistId]);
    const buyerBalance = balances.get(user.id) ?? 0;
    if (buyerBalance < totalCents) throw new HttpError(400, 'Insufficient credits');

    const { feeCents, artistCents } = splitPrimary({ priceCents, feeRate: config.market.primaryUnitFeeRate });
    const artist = await tx.user.findUnique({ where: { id: artistId }, select: { name: true } });
    const txIds = units.map(() => crypto.randomUUID());

    await tx.transaction.createMany({
      data: units.map((u, i) => ({
        id: txIds[i], artistId, unitId: u.id, buyerId: user.id, sellerId: null,
        price: fromCents(priceCents), platformFee: fromCents(feeCents), artistRoyalty: 0, transactionType: 'PRIMARY',
      })),
    });
    await tx.artUnit.updateMany({
      where: { id: { in: units.map((u) => u.id) } },
      data: { ownerId: user.id, purchasePrice: fromCents(priceCents), currentValue: fromCents(priceCents), status: 'OWNED' },
    });

    await wallet.applyEntries(tx, units.flatMap((u, i) => [
      { userId: user.id, cents: -priceCents, type: 'UNIT_PURCHASE', referenceId: txIds[i], description: `${artist.name} unit #${u.unit_number}` },
      { userId: artistId, cents: artistCents, type: 'UNIT_PRIMARY_EARNING', referenceId: txIds[i], description: `Unit sale #${u.unit_number}` },
    ]));

    // price stays at the last executed trade price; volume, units sold and holders update
    await tx.artistMarket.update({
      where: { artistId },
      data: {
        unitsSold: { increment: qty },
        tradingVolume: { increment: fromCents(totalCents) },
        totalHolders: await countHolders(tx, artistId),
      },
    });

    return {
      trades: units.map((u, i) => ({ transactionId: txIds[i], unitId: u.id, unitNumber: u.unit_number, price: fromCents(priceCents) })),
      totalPaid: fromCents(totalCents),
      newBalance: fromCents(buyerBalance - totalCents),
    };
  }, TX_OPTS);
}

async function buySecondary(user, body) {
  const sellOrderId = String(body.sellOrderId);
  const peek = await prisma.sellOrder.findUnique({ where: { id: sellOrderId }, include: { unit: { select: { artistId: true } } } });
  if (!peek || peek.status !== 'OPEN') throw new HttpError(409, 'UNIT NO LONGER AVAILABLE');
  const artistId = peek.unit.artistId;
  if (artistId === user.id) throw new HttpError(403, 'Artists cannot buy their own units');

  return prisma.$transaction(async (tx) => {
    await lockMarket(tx, artistId);

    // Re-read everything inside the locks. The second buyer of the same unit fails here.
    const orders = await tx.$queryRaw`
      SELECT id, unit_id, seller_id, asking_price FROM sell_orders WHERE id = ${sellOrderId} AND status = 'OPEN' FOR UPDATE`;
    if (!orders.length) throw new HttpError(409, 'UNIT NO LONGER AVAILABLE');
    const order = orders[0];
    if (order.seller_id === user.id) throw new HttpError(403, 'You cannot buy your own listing');

    const urows = await tx.$queryRaw`SELECT id, unit_number, owner_id, status FROM art_units WHERE id = ${order.unit_id} FOR UPDATE`;
    const unit = urows[0];
    if (!unit || unit.owner_id !== order.seller_id || unit.status !== 'LISTED') throw new HttpError(409, 'UNIT NO LONGER AVAILABLE');

    const priceCents = toCents(order.asking_price);
    checkExpected(body, priceCents);

    const balances = await wallet.lockUsers(tx, [user.id, order.seller_id, artistId]);
    const buyerBalance = balances.get(user.id) ?? 0;
    if (buyerBalance < priceCents) throw new HttpError(400, 'Insufficient credits');

    const { royaltyCents, feeCents, sellerCents } = splitSecondary({
      priceCents,
      royaltyRate: config.market.secondaryRoyaltyRate,
      feeRate: config.market.secondaryFeeRate,
    });

    const txId = crypto.randomUUID();
    const artist = await tx.user.findUnique({ where: { id: artistId }, select: { name: true } });

    await tx.transaction.create({
      data: {
        id: txId, artistId, unitId: unit.id, buyerId: user.id, sellerId: order.seller_id,
        price: fromCents(priceCents), platformFee: fromCents(feeCents), artistRoyalty: fromCents(royaltyCents), transactionType: 'SECONDARY',
      },
    });
    // ownership transfer
    await tx.artUnit.update({
      where: { id: unit.id },
      data: { ownerId: user.id, purchasePrice: fromCents(priceCents), currentValue: fromCents(priceCents), status: 'OWNED' },
    });
    await tx.sellOrder.update({ where: { id: order.id }, data: { status: 'FILLED' } });

    await wallet.applyEntries(tx, [
      { userId: user.id, cents: -priceCents, type: 'UNIT_PURCHASE', referenceId: txId, description: `${artist.name} unit #${unit.unit_number}` },
      { userId: order.seller_id, cents: sellerCents, type: 'UNIT_SALE', referenceId: txId, description: `Sold ${artist.name} unit #${unit.unit_number}` },
      { userId: artistId, cents: royaltyCents, type: 'ROYALTY', referenceId: txId, description: `Royalty: unit #${unit.unit_number}` },
    ]);

    // market price = latest executed trade price
    await tx.artistMarket.update({
      where: { artistId },
      data: {
        currentPrice: fromCents(priceCents),
        tradingVolume: { increment: fromCents(priceCents) },
        totalHolders: await countHolders(tx, artistId),
      },
    });
    await tx.artUnit.updateMany({ where: { artistId }, data: { currentValue: fromCents(priceCents) } });

    return {
      trade: { transactionId: txId, unitId: unit.id, unitNumber: unit.unit_number, price: fromCents(priceCents) },
      split: { sellerReceived: fromCents(sellerCents), artistRoyalty: fromCents(royaltyCents), platformFee: fromCents(feeCents) },
      newBalance: fromCents(buyerBalance - priceCents),
    };
  }, TX_OPTS);
}

// POST /api/market/sell  { unitId, askingPrice }
async function sell(user, body) {
  const price = Number(body.askingPrice);
  if (!body.unitId) throw new HttpError(400, 'unitId is required');
  if (!(price > 0) || price > MAX_PRICE) throw new HttpError(400, 'askingPrice must be greater than 0');
  const priceCents = toCents(price);
  if (priceCents < 1) throw new HttpError(400, 'askingPrice is too small');

  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`SELECT id, unit_number, owner_id, status FROM art_units WHERE id = ${String(body.unitId)} FOR UPDATE`;
      const unit = rows[0];
      if (!unit) throw new HttpError(404, 'Unit not found');
      if (unit.owner_id !== user.id) throw new HttpError(403, 'You do not own this unit'); // ownership is verified from the DB, never from the client
      if (unit.status === 'LISTED') throw new HttpError(409, 'This unit is already listed for sale');

      const order = await tx.sellOrder.create({ data: { unitId: unit.id, sellerId: user.id, askingPrice: fromCents(priceCents) } });
      await tx.artUnit.update({ where: { id: unit.id }, data: { status: 'LISTED' } });
      return { order: { id: order.id, unitId: unit.id, unitNumber: unit.unit_number, askingPrice: fromCents(priceCents), status: order.status } };
    }, TX_OPTS);
  } catch (e) {
    if (e.code === 'P2002') throw new HttpError(409, 'This unit is already listed for sale');
    throw e;
  }
}

// DELETE /api/market/orders/:id
async function cancel(user, orderId) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT id, unit_id, seller_id, status FROM sell_orders WHERE id = ${orderId} FOR UPDATE`;
    const order = rows[0];
    if (!order) throw new HttpError(404, 'Listing not found');
    if (order.seller_id !== user.id) throw new HttpError(403, 'This is not your listing');
    if (order.status !== 'OPEN') throw new HttpError(409, 'This listing is no longer open');

    await tx.sellOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    await tx.artUnit.updateMany({ where: { id: order.unit_id, status: 'LISTED' }, data: { status: 'OWNED' } });
    return { ok: true };
  }, TX_OPTS);
}

// GET /api/market/orders?artistId=...   open listings, cheapest first
async function listOrders({ artistId, limit }) {
  if (!artistId) throw new HttpError(400, 'artistId is required');
  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const orders = await prisma.sellOrder.findMany({
    where: { status: 'OPEN', unit: { artistId: String(artistId) } },
    orderBy: [{ askingPrice: 'asc' }, { createdAt: 'asc' }],
    take,
    include: { unit: { select: { unitNumber: true } }, seller: { select: { id: true, name: true } } },
  });
  return orders.map((o) => ({
    id: o.id, unitId: o.unitId, unitNumber: o.unit.unitNumber,
    askingPrice: toNum(o.askingPrice), seller: o.seller, createdAt: o.createdAt,
  }));
}

module.exports = { buy, sell, cancel, listOrders };