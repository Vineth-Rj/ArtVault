const router = require('express').Router();
const ctrl = require('../controllers/market.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const trader = [authenticate, requireRole('COLLECTOR', 'ARTIST')];

router.get('/orders', ctrl.orders);
router.post('/buy', ...trader, ctrl.buy);
router.post('/sell', ...trader, ctrl.sell);
router.delete('/orders/:id', ...trader, ctrl.cancel);

module.exports = router;