const crypto = require('crypto');
const prisma = require('../db/client');
const config = require('../utils/config');
const HttpError = require('../utils/httpError');
const { toCents, fromCents } = require('../utils/money');
const { toNum } = require('../utils/serialize');
const { splitEarning } = require('./royalty.service');
const wallet = require('./wallet.service');

const TX_OPTS = { timeout: 30000, maxWait: 10000 };
const MAX_QTY = 10;

// A buyer purchases a product. In ONE database transaction:
// stock check -> buyer debited -> order created -> earning split between
// platform / unit holders / artist -> wallets and ledger updated.
async function checkout(user, body) {
  const qty = body.quantity === undefined ? 1 : Number(body.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new HttpError(400, `Quantity must be a whole number from 1 to ${MAX_QTY}`);
  if (!body.productId) throw new HttpError(400, 'productId is required');

  const first = await prisma.product.findUnique({ where: { id: String(body.productId) } });
  if (!first || first.status === 'REMOVED') throw new HttpError(404, 'Product not found');
  if (first.artistId === user.id) throw new HttpError(403, 'You cannot buy your own product'); // wash-trading protection
  const artistId = first.artistId;

  return prisma.$transaction(async (tx) => {
    // 1. Lock the artist's market first so unit ownership cannot change while we split the earning.
    const mrows = await tx.$queryRaw`SELECT id FROM artist_markets WHERE artist_id = ${artistId} FOR UPDATE`;
    const market = mrows.length ? await tx.artistMarket.findUnique({ where: { artistId } }) : null;

    // 2. Lock the product row and re-check stock inside the lock.
    const prow = await tx.$queryRaw`SELECT id, price, stock, status FROM products WHERE id = ${first.id} FOR UPDATE`;
    const product = prow[0];
    if (!product || product.status === 'REMOVED') throw new HttpError(404, 'Product not found');
    if (product.status !== 'ACTIVE' || product.stock < qty) throw new HttpError(409, 'Not enough stock available');

    const grossCents = toCents(product.price) * qty;

    // 3. Who holds units right now.
    let holdings = [];
    if (market) {
      const groups = await tx.artUnit.groupBy({ by: ['ownerId'], where: { artistId, ownerId: { not: null } }, _count: { _all: true } });
      holdings = groups.map((g) => ({ holderId: g.ownerId, units: g._count._all }));
    }

    // 4. Lock every wallet involved (sorted) and check the buyer can pay.
    const balances = await wallet.lockUsers(tx, [user.id, artistId, ...holdings.map((h) => h.holderId)]);
    const buyerBalance = balances.get(user.id) ?? 0;
    if (buyerBalance < grossCents) throw new HttpError(400, 'Insufficient credits');

    // 5. Split the money.
    const split = splitEarning({
      grossCents,
      feeRate: config.market.productPlatformFeeRate,
      sharePercent: market ? toNum(market.earningsSharePercent) : 0,
      totalUnits: market ? market.totalUnits : 0,
      holdings,
    });

    const orderId = crypto.randomUUID();
    const earningId = crypto.randomUUID();

    await tx.productOrder.create({
      data: { id: orderId, productId: first.id, buyerId: user.id, artistId, quantity: qty, totalPrice: fromCents(grossCents) },
    });
    const newStock = product.stock - qty;
    await tx.product.update({
      where: { id: first.id },
      data: { stock: { decrement: qty }, soldCount: { increment: qty }, status: newStock === 0 ? 'SOLD_OUT' : 'ACTIVE' },
    });

    await tx.artistEarning.create({
      data: {
        id: earningId, artistId, source: 'ORDER', orderId,
        grossAmount: fromCents(grossCents), platformFee: fromCents(split.feeCents),
        holdersPool: fromCents(split.poolCents), perUnitPayout: split.perUnitPayout,
        unitsPaid: split.unitsPaid, holdersPaid: fromCents(split.paidCents), artistNet: fromCents(split.artistNetCents),
        description: `Sale: ${first.title}${qty > 1 ? ` x${qty}` : ''}`,
      },
    });
    if (split.payouts.length) {
      await tx.unitPayout.createMany({
        data: split.payouts.map((p) => ({ earningId, holderId: p.holderId, unitsHeld: p.units, amount: fromCents(p.cents) })),
      });
    }

    await wallet.applyEntries(tx, [
      { userId: user.id, cents: -grossCents, type: 'PRODUCT_PURCHASE', referenceId: orderId, description: first.title },
      { userId: artistId, cents: split.artistNetCents, type: 'PRODUCT_EARNING', referenceId: orderId, description: `Sale: ${first.title}` },
      ...split.payouts.map((p) => ({
        userId: p.holderId, cents: p.cents, type: 'UNIT_PAYOUT', referenceId: earningId,
        description: `Payout from sale: ${first.title} (${p.units} units)`,
      })),
    ]);

    return {
      order: { id: orderId, productId: first.id, title: first.title, quantity: qty, totalPrice: fromCents(grossCents) },
      split: {
        platformFee: fromCents(split.feeCents),
        paidToHolders: fromCents(split.paidCents),
        holdersReceiving: split.payouts.length,
        artistReceived: fromCents(split.artistNetCents),
      },
      newBalance: fromCents(buyerBalance - grossCents + (split.payouts.find((p) => p.holderId === user.id)?.cents || 0)),
    };
  }, TX_OPTS);
}

async function listMine(user) {
  const orders = await prisma.productOrder.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { id: true, title: true, imageUrl: true } }, artist: { select: { id: true, name: true } } },
  });
  return orders.map((o) => ({ ...o, totalPrice: toNum(o.totalPrice) }));
}

module.exports = { checkout, listMine };