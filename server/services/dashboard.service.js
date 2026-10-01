const prisma = require('../db/client');
const { toNum } = require('../utils/serialize');
const { toCents, fromCents } = require('../utils/money');
const { paging } = require('../utils/paging');
const { shape, getPriceHistory } = require('./marketdata.service');

const num = (v) => toNum(v) || 0;
const DAY = 24 * 60 * 60 * 1000;

// GET /api/artist/dashboard
async function getDashboard(user) {
  const artistId = user.id;
  const market = await prisma.artistMarket.findUnique({ where: { artistId } });

  const [products, bySource, unitSales, royalties, vol24, holderGroups, recent, last30] = await Promise.all([
    prisma.product.findMany({ where: { artistId, status: { not: 'REMOVED' } }, orderBy: { createdAt: 'desc' } }),
    prisma.artistEarning.groupBy({
      by: ['source'], where: { artistId },
      _sum: { grossAmount: true, platformFee: true, holdersPaid: true, artistNet: true }, _count: { _all: true },
    }),
    prisma.walletTransaction.aggregate({ where: { userId: artistId, type: 'UNIT_PRIMARY_EARNING' }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.walletTransaction.aggregate({ where: { userId: artistId, type: 'ROYALTY' }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.transaction.aggregate({ where: { artistId, createdAt: { gte: new Date(Date.now() - DAY) } }, _sum: { price: true } }),
    prisma.artUnit.groupBy({
      by: ['ownerId'], where: { artistId, ownerId: { not: null } },
      _count: { _all: true }, orderBy: { _count: { ownerId: 'desc' } }, take: 5,
    }),
    prisma.artistEarning.findMany({ where: { artistId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.artistEarning.findMany({
      where: { artistId, createdAt: { gte: new Date(Date.now() - 30 * DAY) } },
      orderBy: { createdAt: 'asc' }, select: { createdAt: true, grossAmount: true, artistNet: true, holdersPaid: true },
    }),
  ]);

  const src = (name) => bySource.find((s) => s.source === name);
  const orderRow = src('ORDER');
  const collabRow = src('COLLAB');
  const productNet = num(orderRow?._sum.artistNet);
  const collabNet = num(collabRow?._sum.artistNet);
  const unitSalesTotal = num(unitSales._sum.amount);
  const royaltyTotal = num(royalties._sum.amount);

  const holderUsers = holderGroups.length
    ? await prisma.user.findMany({ where: { id: { in: holderGroups.map((h) => h.ownerId) } }, select: { id: true, name: true, avatar: true } })
    : [];
  const holderMap = new Map(holderUsers.map((u) => [u.id, u]));

  const byDay = new Map();
  for (const e of last30) {
    const day = e.createdAt.toISOString().slice(0, 10);
    const d = byDay.get(day) || { date: day, gross: 0, artistNet: 0, paidToHolders: 0 };
    d.gross = fromCents(toCents(d.gross) + toCents(e.grossAmount));
    d.artistNet = fromCents(toCents(d.artistNet) + toCents(e.artistNet));
    d.paidToHolders = fromCents(toCents(d.paidToHolders) + toCents(e.holdersPaid));
    byDay.set(day, d);
  }

  const history = market ? await getPriceHistory(artistId, { limit: 200 }) : { points: [], daily: [] };
  const shaped = market ? shape(market, num(vol24._sum.price)) : null;

  return {
    market: shaped,
    earnings: {
      total: fromCents(toCents(productNet) + toCents(collabNet) + toCents(unitSalesTotal) + toCents(royaltyTotal)),
      productSales: { orders: orderRow?._count._all || 0, gross: num(orderRow?._sum.grossAmount), net: productNet },
      collaboration: { events: collabRow?._count._all || 0, net: collabNet },
      unitSales: { trades: unitSales._count._all, net: unitSalesTotal },
      royalties: { trades: royalties._count._all, net: royaltyTotal },
      paidToHolders: fromCents(bySource.reduce((n, s) => n + toCents(s._sum.holdersPaid), 0)),
      platformFees: fromCents(bySource.reduce((n, s) => n + toCents(s._sum.platformFee), 0)),
    },
    products: products.map((p) => ({ ...p, price: num(p.price) })),
    topHolders: holderGroups.map((h) => ({
      holder: holderMap.get(h.ownerId),
      units: h._count._all,
      sharePercent: market ? Math.round((h._count._all / market.totalUnits) * 10000) / 100 : 0,
    })),
    recentEarnings: recent.map(serializeEarning),
    charts: { priceHistory: history.points, dailyVolume: history.daily, earningsByDay: [...byDay.values()] },
  };
}

function serializeEarning(e) {
  return {
    id: e.id, source: e.source, description: e.description, createdAt: e.createdAt,
    gross: num(e.grossAmount), platformFee: num(e.platformFee), holdersPool: num(e.holdersPool),
    perUnitPayout: num(e.perUnitPayout), unitsPaid: e.unitsPaid, paidToHolders: num(e.holdersPaid), artistNet: num(e.artistNet),
  };
}

// GET /api/artist/earnings
async function getEarnings(user, query) {
  const { page, limit, skip } = paging(query);
  const where = { artistId: user.id };
  const [rows, total] = await Promise.all([
    prisma.artistEarning.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: {
        _count: { select: { payouts: true } },
        order: { select: { quantity: true, product: { select: { title: true } }, buyer: { select: { id: true, name: true } } } },
      },
    }),
    prisma.artistEarning.count({ where }),
  ]);
  return {
    items: rows.map((e) => ({ ...serializeEarning(e), holdersPaidCount: e._count.payouts, order: e.order })),
    page, limit, total, pages: Math.ceil(total / limit),
  };
}

// GET /api/artist/holders
async function getHolders(user, query) {
  const artistId = user.id;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const market = await prisma.artistMarket.findUnique({ where: { artistId } });
  if (!market) return { totalUnits: 0, holders: [] };

  const groups = await prisma.artUnit.groupBy({
    by: ['ownerId'], where: { artistId, ownerId: { not: null } },
    _count: { _all: true }, orderBy: { _count: { ownerId: 'desc' } }, take: limit,
  });
  const ids = groups.map((g) => g.ownerId);

  const [users, payoutRows] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, avatar: true } }),
    prisma.$queryRaw`
      SELECT p.holder_id AS holder_id, SUM(p.amount) AS total
      FROM unit_payouts p JOIN artist_earnings e ON e.id = p.earning_id
      WHERE e.artist_id = ${artistId} GROUP BY p.holder_id`,
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const payoutMap = new Map(payoutRows.map((r) => [r.holder_id, num(r.total)]));

  return {
    totalUnits: market.totalUnits,
    holders: groups.map((g) => ({
      holder: userMap.get(g.ownerId),
      units: g._count._all,
      sharePercent: Math.round((g._count._all / market.totalUnits) * 10000) / 100,
      payoutsReceived: payoutMap.get(g.ownerId) || 0,
    })),
  };
}

module.exports = { getDashboard, getEarnings, getHolders };