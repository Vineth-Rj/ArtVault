const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// Mounted on /api/artist AFTER artist.routes.js.
router.use(authenticate, requireRole('ARTIST'));
router.get('/dashboard', ctrl.dashboard);
router.get('/earnings', ctrl.earnings);
router.get('/holders', ctrl.holders);

module.exports = router;