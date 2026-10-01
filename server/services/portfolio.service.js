const prisma = require('../db/client');
const { toNum } = require('../utils/serialize');
const { toCents, fromCents } = require('../utils/money');
const { paging } = require('../utils/paging');

const num = (v) => toNum(v) || 0;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0);

// GET /api/portfolio — summary plus holdings grouped by artist
async function getPortfolio(user) {
  const units = await prisma.artUnit.findMany({
    where: { ownerId: user.id },
    select: { artistId: true, purchasePrice: true, currentValue: true },
  });

  const byArtist = new Map();
  for (const u of units) {
    const e = byArtist.get(u.artistId) || { units: 0, investedCents: 0, valueCents: 0 };
    e.units += 1;
    e.investedCents += toCents(u.purchasePrice ?? 0);
    e.valueCents += toCents(u.currentValue);
    byArtist.set(u.artistId, e);
  }
  const ids = [...byArtist.keys()];

  const [artists, markets, payoutRows, payoutTotal] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, avatar: true } }),
    prisma.artistMarket.findMany({ where: { artistId: { in: ids } }, select: { artistId: true, currentPrice: true } }),
    prisma.$queryRaw`
      SELECT e.artist_id AS artist_id, SUM(p.amount) AS total
      FROM unit_payouts p JOIN artist_earnings e ON e.id = p.earning_id
      WHERE p.holder_id = ${user.id} GROUP BY e.artist_id`,
    prisma.unitPayout.aggregate({ where: { holderId: user.id }, _sum: { amount: true } }),
  ]);
  const artistMap = new Map(artists.map((a) => [a.id, a]));
  const priceMap = new Map(markets.map((m) => [m.artistId, num(m.currentPrice)]));
  const payoutMap = new Map(payoutRows.map((r) => [r.artist_id, num(r.total)]));

  let investedCents = 0;
  let valueCents = 0;
  const holdings = ids
    .map((id) => {
      const e = byArtist.get(id);
      investedCents += e.investedCents;
      valueCents += e.valueCents;
      return {
        artist: artistMap.get(id),
        units: e.units,
        avgBuyPrice: fromCents(Math.round(e.investedCents / e.units)),
        currentPrice: priceMap.get(id) ?? 0,
        invested: fromCents(e.investedCents),
        value: fromCents(e.valueCents),
        unrealizedPnl: fromCents(e.valueCents - e.investedCents),
        unrealizedPnlPercent: pct(e.valueCents - e.investedCents, e.investedCents),
        payoutsReceived: payoutMap.get(id) || 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    summary: {
      walletBalance: num(user.walletBalance),
      unitsHeld: units.length,
      portfolioValue: fromCents(valueCents),
      totalInvested: fromCents(investedCents),
      unrealizedPnl: fromCents(valueCents - investedCents),
      unrealizedPnlPercent: pct(valueCents - investedCents, investedCents),
      totalPayouts: num(payoutTotal._sum.amount),
    },
    holdings,
  };
}

// GET /api/portfolio/units?artistId=&status=OWNED|LISTED
async function getUnits(user, query) {
  const where = { ownerId: user.id };
  if (query.artistId) where.artistId = String(query.artistId);
  if (['OWNED', 'LISTED'].includes(query.status)) where.status = query.status;

  const units = await prisma.artUnit.findMany({
    where,
    orderBy: [{ artistId: 'asc' }, { unitNumber: 'asc' }],
    include: { artist: { select: { id: true, name: true, avatar: true } } },
  });

  const listedIds = units.filter((u) => u.status === 'LISTED').map((u) => u.id);
  const orders = listedIds.length
    ? await prisma.sellOrder.findMany({ where: { sellerId: user.id, status: 'OPEN', unitId: { in: listedIds } } })
    : [];
  const orderMap = new Map(orders.map((o) => [o.unitId, o]));

  return {
    units: units.map((u) => {
      const bought = num(u.purchasePrice);
      const value = num(u.currentValue);
      const order = orderMap.get(u.id);
      return {
        id: u.id,
        artist: u.artist,
        unitNumber: u.unitNumber,
        status: u.status,
        purchasePrice: bought,
        currentValue: value,
        unrealizedPnl: fromCents(toCents(value) - toCents(bought)),
        listing: order ? { orderId: order.id, askingPrice: num(order.askingPrice) } : null,
      };
    }),
  };
}

// GET /api/portfolio/history — unit trades where you were buyer or seller
async function getHistory(user, query) {
  const { page, limit, skip } = paging(query);
  const where = { OR: [{ buyerId: user.id }, { sellerId: user.id }] };
  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: { artist: { select: { id: true, name: true } }, unit: { select: { unitNumber: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  const items = rows.map((t) => {
    const isBuy = t.buyerId === user.id;
    const price = toCents(t.price);
    return {
      id: t.id,
      direction: isBuy ? 'BUY' : 'SELL',
      type: t.transactionType,
      artist: t.artist,
      unitNumber: t.unit.unitNumber,
      price: fromCents(price),
      youPaid: isBuy ? fromCents(price) : null,
      youReceived: isBuy ? null : fromCents(price - toCents(t.platformFee) - toCents(t.artistRoyalty)),
      createdAt: t.createdAt,
    };
  });
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}

// GET /api/portfolio/wallet — full wallet ledger
async function getWallet(user, query) {
  const { page, limit, skip } = paging(query);
  const where = { userId: user.id };
  const [rows, total] = await Promise.all([
    prisma.walletTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.walletTransaction.count({ where }),
  ]);
  return {
    balance: num(user.walletBalance),
    items: rows.map((r) => ({ ...r, amount: num(r.amount) })),
    page, limit, total, pages: Math.ceil(total / limit),
  };
}

// GET /api/portfolio/payouts — what unit holdings have paid you
async function getPayouts(user, query) {
  const { page, limit, skip } = paging(query);
  const where = { holderId: user.id };
  const [rows, total] = await Promise.all([
    prisma.unitPayout.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: { earning: { select: { source: true, description: true, artist: { select: { id: true, name: true } } } } },
    }),
    prisma.unitPayout.count({ where }),
  ]);
  return {
    items: rows.map((p) => ({
      id: p.id, amount: num(p.amount), unitsHeld: p.unitsHeld, createdAt: p.createdAt,
      artist: p.earning.artist, source: p.earning.source, description: p.earning.description,
    })),
    page, limit, total, pages: Math.ceil(total / limit),
  };
}

module.exports = { getPortfolio, getUnits, getHistory, getWallet, getPayouts };