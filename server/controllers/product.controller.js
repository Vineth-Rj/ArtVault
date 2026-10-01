const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const product = await productService.create(req.user, req.body, req.file);
  res.status(201).json({ product });
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await productService.list(req.query));
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json(await productService.getById(req.params.id));
});

exports.update = asyncHandler(async (req, res) => {
  res.json({ product: await productService.update(req.user, req.params.id, req.body) });
});

exports.remove = asyncHandler(async (req, res) => {
  await productService.remove(req.user, req.params.id);
  res.json({ ok: true });
});