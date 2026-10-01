const router = require('express').Router();

const ctrl = require('../controllers/ai.controllers');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/ai/analyze-artwork  — requires auth (artist can only analyse own products)
router.post('/analyze-artwork', authenticate, asyncHandler(ctrl.analyze));

// GET  /api/ai/status           — public (shows if Gemini is configured)
router.get('/status', ctrl.status);

// GET  /api/ai/expand-query?q=  — public (Gemini search expansion)
router.get('/expand-query', asyncHandler(ctrl.search));

module.exports = router;