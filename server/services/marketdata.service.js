const prisma = require('../db/client');
const HttpError = require('../utils/httpError');
const { toNum } = require('../utils/serialize');
const { paging } = require('../utils/paging');

const r2 = (n) => Math.round(n * 100) / 100;
const DAY = 24 * 60 * 60 * 1000;
const ARTIST_SELECT = { id: true, name: true, avatar: true, bio: true };
const num = (v) => toNum(v) || 0;

function shape(m, volume24h = 0) {
  const initial = num(m.initialPrice);
  const current = num(m.currentPrice);
  return {
    artistId: m.artistId,
    totalUnits: m.totalUnits,
    unitsSold: m.unitsSold,
    unitsAvailable: m.totalUnits - m.unitsSold,
    holders: m.totalHolders,
    initialPrice: initial,
    currentPrice: current,
    changePercent: initial > 0 ? r2(((current - initial) / initial) * 100) : 0,
    earningsSharePercent: num(m.earningsSharePercent),
    tradingVolume: num(m.tradingVolume),
    volume24h,
    createdAt: m.createdAt,
  };
}

async function volumes24h(artistIds) {
  if (!artistIds.length) return new Map();
  const rows = await prisma.transaction.groupBy({
    by: ['artistId'],
    where: { artistId: { in: artistIds }, createdAt: { gte: new Date(Date.now() - DAY) } },
    _sum: { price: true },
  });
  return new Map(rows.map((r) => [r.artistId, num(r._sum.price)]));
}

const SORTERS = {
  trending: (a, b) => b.volume24h - a.volume24h || b.tradingVolume - a.tradingVolume,
  price_desc: (a, b) => b.currentPrice - a.currentPrice,
  price_asc: (a, b) => a.currentPrice - b.currentPrice,
  change_desc: (a, b) => b.changePercent - a.changePercent,
  change_asc: (a, b) => a.changePercent - b.changePercent,
  volume_desc: (a, b) => b.tradingVolume - a.tradingVolume,
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
};

// GET /api/market  — the marketplace table: one row per artist market
async function listMarkets(query) {
  const { page, limit, skip } = paging(query, 20, 50);
  const where = {};
  if (query.q) where.artist = { name: { contains: String(query.q).trim(), mode: 'insensitive' } };

  const markets = await prisma.artistMarket.findMany({ where, include: { artist: { select: ARTIST_SELECT } } });
  const vol = await volumes24h(markets.map((m) => m.artistId));

  const items = markets
    .map((m) => ({ artist: m.artist, ...shape(m, vol.get(m.artistId) || 0) }))
    .sort(SORTERS[query.sort] || SORTERS.trending);

  return { items: items.slice(skip, skip + limit), page, limit, total: items.length, pages: Math.ceil(items.length / limit) };
}

// GET /api/market/:artistId
async function getMarket(artistId) {
  const artist = await prisma.user.findFirst({ where: { id: artistId, role: 'ARTIST' }, select: ARTIST_SELECT });
  if (!artist) throw new HttpError(404, 'Artist not found');

  const [market, perks, products, vol, listings, earnings] = await Promise.all([
    prisma.artistMarket.findUnique({ where: { artistId } }),
    prisma.perk.findMany({ where: { artistId }, orderBy: { minUnits: 'asc' } }),
    prisma.product.findMany({ where: { artistId, status: { in: ['ACTIVE', 'SOLD_OUT'] } }, orderBy: { createdAt: 'desc' } }),
    volumes24h([artistId]),
    prisma.sellOrder.aggregate({ where: { status: 'OPEN', unit: { artistId } }, _min: { askingPrice: true }, _count: { _all: true } }),
    prisma.artistEarning.aggregate({ where: { artistId }, _sum: { grossAmount: true, holdersPaid: true }, _count: { _all: true } }),
  ]);

  return {
    artist,
    market: market ? shape(market, vol.get(artistId) || 0) : null,
    perks,
    products: products.map((p) => ({ ...p, price: num(p.price) })),
    listings: { count: listings._count._all, lowestAsk: listings._min.askingPrice === null ? null : num(listings._min.askingPrice) },
    earnings: { events: earnings._count._all, gross: num(earnings._sum.grossAmount), paidToHolders: num(earnings._sum.holdersPaid) },
  };
}

// GET /api/market/:artistId/history  — price points (every executed trade) + daily volume
async function getPriceHistory(artistId, query = {}) {
  const market = await prisma.artistMarket.findUnique({ where: { artistId } });
  if (!market) throw new HttpError(404, 'This artist has not issued units');
  const take = Math.min(Math.max(parseInt(query.limit, 10) || 500, 1), 1000);

  const trades = await prisma.transaction.findMany({
    where: { artistId },
    orderBy: { createdAt: 'desc' },
    take,
    select: { createdAt: true, price: true, transactionType: true },
  });
  trades.reverse();

  const points = [
    { time: market.createdAt, price: num(market.initialPrice), type: 'LAUNCH' },
    ...trades.map((t) => ({ time: t.createdAt, price: num(t.price), type: t.transactionType })),
  ];

  const byDay = new Map();
  for (const t of trades) {
    const day = t.createdAt.toISOString().slice(0, 10);
    const d = byDay.get(day) || { date: day, volume: 0, trades: 0 };
    d.volume = r2(d.volume + num(t.price));
    d.trades += 1;
    byDay.set(day, d);
  }
  return { points, daily: [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1)) };
}

// GET /api/market/:artistId/activity  — live feed of trades and earning events
async function getActivity(artistId, query = {}) {
  const take = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
  const [trades, earnings] = await Promise.all([
    prisma.transaction.findMany({
      where: { artistId }, orderBy: { createdAt: 'desc' }, take,
      include: { buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } }, unit: { select: { unitNumber: true } } },
    }),
    prisma.artistEarning.findMany({ where: { artistId }, orderBy: { createdAt: 'desc' }, take }),
  ]);

  const events = [
    ...trades.map((t) => ({
      kind: 'TRADE', time: t.createdAt, type: t.transactionType, unitNumber: t.unit.unitNumber,
      price: num(t.price), buyer: t.buyer, seller: t.seller,
    })),
    ...earnings.map((e) => ({
      kind: 'EARNING', time: e.createdAt, source: e.source, description: e.description,
      gross: num(e.grossAmount), paidToHolders: num(e.holdersPaid),
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  return { events: events.slice(0, take) };
}

module.exports = { listMarkets, getMarket, getPriceHistory, getActivity, shape };