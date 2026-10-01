const router = require('express').Router();
const ctrl = require('../controllers/portfolio.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.summary);
router.get('/units', ctrl.units);
router.get('/history', ctrl.history);
router.get('/wallet', ctrl.wallet);
router.get('/payouts', ctrl.payouts);

module.exports = router;