const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authenticate, requireRole('ARTIST'), uploadImage, ctrl.create);
router.put('/:id', authenticate, requireRole('ARTIST'), ctrl.update);
router.delete('/:id', authenticate, requireRole('ARTIST', 'ADMIN'), ctrl.remove);

module.exports = router;