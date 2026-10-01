const multer = require('multer');
const HttpError = require('../utils/httpError');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Image must be JPEG, PNG, WEBP or GIF')),
});

// Accepts an optional single file in the "image" form field.
const uploadImage = (req, res, next) =>
  uploader.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(new HttpError(400, err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB' : err.message));
    }
    next(err);
  });

module.exports = { uploadImage };