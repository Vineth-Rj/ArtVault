const marketService = require('../services/market.service');
const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');

exports.createMarket = asyncHandler(async (req, res) => {
  const market = await marketService.createMarket(req.user, req.body || {});
  res.status(201).json({ market });
});

exports.myMarket = asyncHandler(async (req, res) => {
  res.json(await marketService.getMyMarket(req.user));
});

exports.myProducts = asyncHandler(async (req, res) => {
  res.json({ products: await productService.listMine(req.user) });
});