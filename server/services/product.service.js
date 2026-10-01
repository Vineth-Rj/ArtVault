const prisma = require('../db/client');
const HttpError = require('../utils/httpError');
const { toNum } = require('../utils/serialize');
const { uploadImage } = require('./storage.service');
const { serializeMarket } = require('./market.service');

const r2 = (n) => Math.round(n * 100) / 100;
const ARTIST_SELECT = { id: true, name: true, avatar: true };

function serializeProduct(p) {
  return { ...p, price: toNum(p.price) };
}

function clean(body) {
  const str = (v) => (typeof v === 'string' ? v.trim() : v);
  return {
    title: str(body.title),
    description: str(body.description),
    story: str(body.story),
    category: str(body.category),
    artType: str(body.artType),
    price: body.price,
    stock: body.stock,
    imageUrl: str(body.imageUrl),
  };
}

function validateFields(f, { partial }) {
  const need = (cond, msg) => { if (!cond) throw new HttpError(400, msg); };
  const has = (v) => v !== undefined && v !== '';
  if (!partial || has(f.title)) need(typeof f.title === 'string' && f.title.length >= 2 && f.title.length <= 120, 'Title must be 2-120 characters');
  if (!partial || has(f.description)) need(typeof f.description === 'string' && f.description.length >= 10 && f.description.length <= 2000, 'Description must be 10-2000 characters');
  if (!partial || has(f.category)) need(typeof f.category === 'string' && f.category.length >= 2, 'Category is required');
  if (!partial || has(f.artType)) need(typeof f.artType === 'string' && f.artType.length >= 2, 'Art type is required');
  if (!partial || has(f.price)) need(Number(f.price) > 0 && Number(f.price) <= 1000000, 'Price must be greater than 0');
  if (!partial || has(f.stock)) {
    const s = Number(f.stock);
    need(Number.isInteger(s) && s >= (partial ? 0 : 1) && s <= 10000, partial ? 'Stock must be a whole number from 0 to 10000' : 'Stock must be a whole number from 1 to 10000');
  }
}

async function create(user, body, file) {
  const f = clean(body || {});
  validateFields(f, { partial: false });

  let imageUrl = f.imageUrl;
  if (file) imageUrl = await uploadImage(file, `products/${user.id}`);
  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) throw new HttpError(400, 'An image file (field "image") or an imageUrl is required');

  const product = await prisma.product.create({
    data: {
      artistId: user.id,
      title: f.title,
      description: f.description,
      story: f.story || null,
      category: f.category,
      artType: f.artType,
      price: r2(Number(f.price)),
      stock: Number(f.stock),
      imageUrl,
    },
  });
  return serializeProduct(product);
}

const SORTS = {
  newest: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  popular: { soldCount: 'desc' },
};

async function list({ category, artistId, q, sort, page, limit }) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);

  const where = { status: { in: ['ACTIVE', 'SOLD_OUT'] } };
  if (category) where.category = { equals: String(category), mode: 'insensitive' };
  if (artistId) where.artistId = String(artistId);
  if (q) {
    const term = String(q).trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
      { aiKeywords: { has: term.toLowerCase() } },
      { aiTags: { has: term.toLowerCase() } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: SORTS[sort] || SORTS.newest,
      skip: (pageNum - 1) * take,
      take,
      include: { artist: { select: ARTIST_SELECT } },
    }),
    prisma.product.count({ where }),
  ]);

  return { items: items.map(serializeProduct), page: pageNum, limit: take, total, pages: Math.ceil(total / take) };
}

async function getById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { artist: { select: { ...ARTIST_SELECT, bio: true } } },
  });
  if (!product || product.status === 'REMOVED') throw new HttpError(404, 'Product not found');
  const [market, perks] = await Promise.all([
    prisma.artistMarket.findUnique({ where: { artistId: product.artistId } }),
    prisma.perk.findMany({ where: { artistId: product.artistId }, orderBy: { minUnits: 'asc' } }),
  ]);
  return { product: serializeProduct(product), market: serializeMarket(market), perks };
}

async function update(user, id, body) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.status === 'REMOVED') throw new HttpError(404, 'Product not found');
  if (product.artistId !== user.id) throw new HttpError(403, 'You can only edit your own products');

  const f = clean(body || {});
  validateFields(f, { partial: true });

  const data = {};
  for (const k of ['title', 'description', 'story', 'category', 'artType']) if (f[k] !== undefined && f[k] !== '') data[k] = f[k];
  if (f.price !== undefined && f.price !== '') data.price = r2(Number(f.price));
  if (f.stock !== undefined && f.stock !== '') {
    data.stock = Number(f.stock);
    data.status = data.stock === 0 ? 'SOLD_OUT' : 'ACTIVE';
  }
  if (!Object.keys(data).length) throw new HttpError(400, 'Nothing to update');

  return serializeProduct(await prisma.product.update({ where: { id }, data }));
}

async function remove(user, id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.status === 'REMOVED') throw new HttpError(404, 'Product not found');
  if (product.artistId !== user.id && user.role !== 'ADMIN') throw new HttpError(403, 'You cannot remove this product');
  await prisma.product.update({ where: { id }, data: { status: 'REMOVED' } }); // soft delete keeps order history intact
}

async function listMine(user) {
  const items = await prisma.product.findMany({
    where: { artistId: user.id, status: { not: 'REMOVED' } },
    orderBy: { createdAt: 'desc' },
  });
  return items.map(serializeProduct);
}

module.exports = { create, list, getById, update, remove, listMine };