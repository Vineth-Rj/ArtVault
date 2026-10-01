const jwt = require('jsonwebtoken');
const prisma = require('../db/client');
const config = require('../utils/config');

// Like authenticate, but never fails: sets req.user when a valid token is sent, otherwise carries on.
async function optionalAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) req.user = user;
    } catch { /* ignore invalid tokens */ }
  }
  next();
}

module.exports = { optionalAuth };