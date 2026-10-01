const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');

exports.checkout = asyncHandler(async (req, res) => res.status(201).json(await orderService.checkout(req.user, req.body || {})));
exports.mine = asyncHandler(async (req, res) => res.json({ orders: await orderService.listMine(req.user) }));