const router = require('express').Router();
const ctrl = require('../controllers/order.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/', authenticate, requireRole('COLLECTOR', 'ARTIST'), ctrl.checkout);
router.get('/', authenticate, ctrl.mine);

module.exports = router;