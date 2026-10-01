const router = require('express').Router();

const ctrl = require('../controllers/artist.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const artist = [authenticate, requireRole('ARTIST')];

router.post('/market', ...artist, ctrl.createMarket);

router.get('/market', ...artist, ctrl.myMarket);

router.get('/products', ...artist, ctrl.myProducts);

module.exports = router;