const svc = require('../services/portfolio.service');
const asyncHandler = require('../utils/asyncHandler');

exports.summary = asyncHandler(async (req, res) => res.json(await svc.getPortfolio(req.user)));
exports.units = asyncHandler(async (req, res) => res.json(await svc.getUnits(req.user, req.query)));
exports.history = asyncHandler(async (req, res) => res.json(await svc.getHistory(req.user, req.query)));
exports.wallet = asyncHandler(async (req, res) => res.json(await svc.getWallet(req.user, req.query)));
exports.payouts = asyncHandler(async (req, res) => res.json(await svc.getPayouts(req.user, req.query)));