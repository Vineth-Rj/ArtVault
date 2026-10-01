const svc = require('../services/discovery.service');
const gemini = require('../services/gemini.service');
const asyncHandler = require('../utils/asyncHandler');

exports.analyze = asyncHandler(async (req, res) => res.json(await svc.analyzeProduct(req.user, (req.body || {}).productId)));
exports.search = asyncHandler(async (req, res) => res.json(await svc.search(req.query)));
exports.recommendations = asyncHandler(async (req, res) => res.json(await svc.recommendations(req.user, req.query)));
exports.status = (_req, res) => res.json(gemini.status());