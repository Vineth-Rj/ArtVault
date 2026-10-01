const router = require('express').Router();
const ctrl = require('../controllers/marketdata.controller');

// Public read-only market data. Mounted on /api/market AFTER market.routes.js.
router.get('/', ctrl.list);
router.get('/:artistId', ctrl.detail);
router.get('/:artistId/history', ctrl.history);
router.get('/:artistId/activity', ctrl.activity);

module.exports = router;