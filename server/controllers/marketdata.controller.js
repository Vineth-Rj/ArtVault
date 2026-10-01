const svc = require('../services/marketdata.service');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => res.json(await svc.listMarkets(req.query)));
exports.detail = asyncHandler(async (req, res) => res.json(await svc.getMarket(req.params.artistId)));
exports.history = asyncHandler(async (req, res) => res.json(await svc.getPriceHistory(req.params.artistId, req.query)));
exports.activity = asyncHandler(async (req, res) => res.json(await svc.getActivity(req.params.artistId, req.query)));