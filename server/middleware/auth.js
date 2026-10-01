const jwt = require('jsonwebtoken');
const prisma = require('../db/client');
const config = require('../utils/config');
const HttpError = require('../utils/httpError');

// Verifies the Bearer token and loads the user from the DB on every request,
// so req.user always has the current role and balance. Never trust ids sent by the client.
async function authenticate(req, _res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Authentication required');

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new HttpError(401, 'Invalid or expired token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new HttpError(401, 'User no longer exists');
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do this'));
  next();
};

module.exports = { authenticate, requireRole };