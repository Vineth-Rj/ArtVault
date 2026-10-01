const prisma = require('../db/client');
const config = require('../utils/config');
const HttpError = require('../utils/httpError');
const { toNum } = require('../utils/serialize');

const r2 = (n) => Math.round(n * 100) / 100;

function serializeMarket(m) {
  if (!m) return null;
  return {
    id: m.id,
    artistId: m.artistId,
    totalUnits: m.totalUnits,
    unitsSold: m.unitsSold,
    unitsAvailable: m.totalUnits - m.unitsSold,
    totalHolders: m.totalHolders,
    initialPrice: toNum(m.initialPrice),
    currentPrice: toNum(m.currentPrice),
    priceChangePercent: m.initialPrice > 0 ? r2(((toNum(m.currentPrice) - toNum(m.initialPrice)) / toNum(m.initialPrice)) * 100) : 0,
    earningsSharePercent: toNum(m.earningsSharePercent),
    tradingVolume: toNum(m.tradingVolume),
    createdAt: m.createdAt,
  };
}

// An artist issues a fixed supply of units exactly once.
async function createMarket(user, body) {
  const total = Number(body.totalUnits);
  const price = Number(body.initialPrice);
  if (!Number.isInteger(total) || total < 10 || total > 2000) throw new HttpError(400, 'totalUnits must be a whole number between 10 and 2000');
  if (!(price > 0) || price > 100000) throw new HttpError(400, 'initialPrice must be greater than 0');

  const perks = body.perks === undefined ? [] : body.perks;
  if (!Array.isArray(perks) || perks.length > 5) throw new HttpError(400, 'perks must be an array of at most 5 items');
  for (const p of perks) {
    if (!p || typeof p.title !== 'string' || p.title.trim().length < 2 || typeof p.description !== 'string' || !p.description.trim())
      throw new HttpError(400, 'Each perk needs a title and a description');
    if (p.minUnits !== undefined && (!Number.isInteger(Number(p.minUnits)) || Number(p.minUnits) < 1))
      throw new HttpError(400, 'perk minUnits must be a whole number of at least 1');
  }

  const existing = await prisma.artistMarket.findUnique({ where: { artistId: user.id } });
  if (existing) throw new HttpError(409, 'You have already issued units. Supply is fixed and cannot be changed.');

  try {
    const market = await prisma.$transaction(
      async (tx) => {
        const m = await tx.artistMarket.create({
          data: {
            artistId: user.id,
            totalUnits: total,
            initialPrice: r2(price),
            currentPrice: r2(price),
            earningsSharePercent: config.market.holdersShareRate * 100,
          },
        });
        await tx.artUnit.createMany({
          data: Array.from({ length: total }, (_, i) => ({
            artistId: user.id,
            unitNumber: i + 1,
            currentValue: r2(price),
            status: 'AVAILABLE',
          })),
        });
        if (perks.length) {
          await tx.perk.createMany({
            data: perks.map((p) => ({
              artistId: user.id,
              title: p.title.trim(),
              description: p.description.trim(),
              minUnits: p.minUnits ? Number(p.minUnits) : 1,
            })),
          });
        }
        return m;
      },
      { timeout: 60000, maxWait: 10000 }
    );
    return serializeMarket(market);
  } catch (e) {
    if (e.code === 'P2002') throw new HttpError(409, 'You have already issued units.');
    throw e;
  }
}

async function getMyMarket(user) {
  const m = await prisma.artistMarket.findUnique({ where: { artistId: user.id } });
  const perks = await prisma.perk.findMany({ where: { artistId: user.id }, orderBy: { minUnits: 'asc' } });
  return { market: serializeMarket(m), perks };
}

module.exports = { createMarket, getMyMarket, serializeMarket };