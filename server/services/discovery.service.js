const prisma = require('../db/client');
const HttpError = require('../utils/httpError');
const { toNum } = require('../utils/serialize');
const { tokenize, scoreProduct } = require('../utils/aiText');
const gemini = require('./gemini.service');
const { shape } = require('./marketdata.service');

const ARTIST_SELECT = { id: true, name: true, avatar: true };
const num = (v) => toNum(v) || 0;
const shapeProduct = (p) => ({ ...p, price: num(p.price) });

// Run Gemini on a product and store the result. Used by the API and the tagging script.
async function applyAnalysis(product) {
  const a = await gemini.analyzeArtwork(product);
  await prisma.product.update({
    where: { id: product.id },
    data: {
      aiTags: a.tags,
      aiStyle: a.style || null,
      aiMood: a.mood || null,
      aiThemes: a.themes,
      aiKeywords: a.keywords,
      aiDescription: a.shortDescription || null,
    },
  });
  return { productId: product.id, analysis: a, suggestedCategory: a.category };
}

// POST /api/ai/analyze-artwork   { productId }
async function analyzeProduct(user, productId) {
  if (!productId) throw new HttpError(400, 'productId is required');
  const product = await prisma.product.findUnique({ where: { id: String(productId) } });
  if (!product || product.status === 'REMOVED') throw new HttpError(404, 'Product not found');
  if (user.role !== 'ADMIN' && product.artistId !== user.id) throw new HttpError(403, 'You can only analyse your own products');
  return applyAnalysis(product);
}

// GET /api/ai/search?q=peaceful nature paintings
// Gemini expands the text into related terms; matching and ranking happen in our own code.
// If Gemini is unavailable the search still works using the user's own words.
async function search(query) {
  const q = String(query.q || '').trim().slice(0, 100);
  if (q.length < 2) throw new HttpError(400, 'Search text must be at least 2 characters');
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 50);

  const own = [...new Set([q.toLowerCase(), ...tokenize(q)])];
  let aiTerms = [];
  let usedAi = false;
  if (gemini.isConfigured()) {
    try {
      aiTerms = (await gemini.expandQuery(q)).filter((t) => !own.includes(t));
      usedAi = aiTerms.length > 0;
    } catch (e) {
      console.warn('Gemini query expansion failed, using plain search:', e.message);
    }
  }
  const terms = [...own.map((t) => ({ t, w: 2 })), ...aiTerms.map((t) => ({ t, w: 1 }))];

  // Fine for hackathon-sized catalogues; move to a database full-text index if it grows large.
  const products = await prisma.product.findMany({
    where: { status: { in: ['ACTIVE', 'SOLD_OUT'] } },
    take: 500,
    include: { artist: { select: ARTIST_SELECT } },
  });

  const ranked = products
    .map((p) => ({ p, ...scoreProduct(p, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.p.soldCount - a.p.soldCount);

  const items = ranked.slice((page - 1) * limit, page * limit).map((r) => ({ ...shapeProduct(r.p), matchedTerms: r.matched.slice(0, 6) }));
  return { query: q, usedAi, expandedTerms: aiTerms, items, page, limit, total: ranked.length, pages: Math.ceil(ranked.length / limit) };
}

// GET /api/ai/recommendations   (personalised when a token is sent)
// Interest profile = tags of artists you hold units of or bought from. Candidates are ranked by tag overlap.
// Artists you already back are left out so the list is about discovering someone new.
async function recommendations(user, query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 8, 1), 24);
  const weights = new Map();
  const excluded = new Set();

  if (user) {
    excluded.add(user.id);
    const [units, orders] = await Promise.all([
      prisma.artUnit.groupBy({ by: ['artistId'], where: { ownerId: user.id }, _count: { _all: true } }),
      prisma.productOrder.groupBy({ by: ['artistId'], where: { buyerId: user.id }, _count: { _all: true } }),
    ]);
    const aw = new Map();
    for (const u of units) aw.set(u.artistId, (aw.get(u.artistId) || 0) + u._count._all);
    for (const o of orders) aw.set(o.artistId, (aw.get(o.artistId) || 0) + 2 * o._count._all);
    for (const id of aw.keys()) excluded.add(id);

    if (aw.size) {
      const seen = await prisma.product.findMany({
        where: { artistId: { in: [...aw.keys()] }, status: { not: 'REMOVED' } },
        select: { artistId: true, aiTags: true, aiThemes: true, category: true },
      });
      for (const p of seen) {
        const w = 1 + Math.log(1 + aw.get(p.artistId));
        for (const t of [...p.aiTags, ...p.aiThemes, p.category.toLowerCase()]) weights.set(t, (weights.get(t) || 0) + w);
      }
    }
  }

  const candidates = await prisma.product.findMany({
    where: { status: 'ACTIVE', artistId: { notIn: [...excluded] } },
    orderBy: { soldCount: 'desc' },
    take: 200,
    include: { artist: { select: ARTIST_SELECT } },
  });

  const personalized = weights.size > 0;
  const scored = candidates.map((p) => {
    const terms = [...p.aiTags, ...p.aiThemes, p.category.toLowerCase()];
    const matched = [...new Set(terms.filter((t) => weights.has(t)))];
    const overlap = matched.reduce((n, t) => n + weights.get(t), 0);
    const ageDays = (Date.now() - new Date(p.createdAt).getTime()) / 86400000;
    const score = personalized ? overlap * 3 + Math.log(1 + p.soldCount) : p.soldCount + 1 / (1 + ageDays / 7);
    return { p, matched, score };
  }).sort((a, b) => b.score - a.score);

  const products = scored.slice(0, limit).map((r) => ({ ...shapeProduct(r.p), matchedTags: r.matched.slice(0, 4) }));

  const byArtist = new Map();
  for (const r of scored) {
    const e = byArtist.get(r.p.artistId) || { artist: r.p.artist, score: 0, tags: new Set() };
    e.score = Math.max(e.score, r.score);
    r.matched.forEach((t) => e.tags.add(t));
    byArtist.set(r.p.artistId, e);
  }
  const topIds = [...byArtist.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, 12).map(([id]) => id);
  const markets = topIds.length ? await prisma.artistMarket.findMany({ where: { artistId: { in: topIds } } }) : [];
  const artists = markets
    .map((m) => ({ artist: byArtist.get(m.artistId).artist, market: shape(m), matchedTags: [...byArtist.get(m.artistId).tags].slice(0, 4), _s: byArtist.get(m.artistId).score }))
    .sort((a, b) => b._s - a._s || a.market.holders - b.market.holders) // ties favour less-discovered artists
    .slice(0, 5)
    .map(({ _s, ...rest }) => rest);

  const basedOn = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  return { personalized, basedOn, products, artists };
}

module.exports = { analyzeProduct, applyAnalysis, search, recommendations };