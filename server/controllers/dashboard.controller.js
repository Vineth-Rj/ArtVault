const svc = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');

exports.dashboard = asyncHandler(async (req, res) => res.json(await svc.getDashboard(req.user)));
exports.earnings = asyncHandler(async (req, res) => res.json(await svc.getEarnings(req.user, req.query)));
exports.holders = asyncHandler(async (req, res) => res.json(await svc.getHolders(req.user, req.query)));