const trading = require('../services/trading.service');
const asyncHandler = require('../utils/asyncHandler');

exports.buy = asyncHandler(async (req, res) => res.status(201).json(await trading.buy(req.user, req.body || {})));
exports.sell = asyncHandler(async (req, res) => res.status(201).json(await trading.sell(req.user, req.body || {})));
exports.cancel = asyncHandler(async (req, res) => res.json(await trading.cancel(req.user, req.params.id)));
exports.orders = asyncHandler(async (req, res) => res.json({ orders: await trading.listOrders(req.query) }));