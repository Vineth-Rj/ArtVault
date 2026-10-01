const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db/client');
const config = require('../utils/config');
const HttpError = require('../utils/httpError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELF_SERVE_ROLES = ['COLLECTOR', 'ARTIST']; // ADMIN can never be self-assigned

function signToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, { subject: user.id, expiresIn: '7d' });
}

async function register({ name, email, password, role }) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) throw new HttpError(400, 'Name must be at least 2 characters');
  if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required');
  if (!password || typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const finalRole = role || 'COLLECTOR';
  if (!SELF_SERVE_ROLES.includes(finalRole)) throw new HttpError(400, 'Role must be COLLECTOR or ARTIST');

  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) throw new HttpError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const credits = config.market.startingCredits;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalized,
          passwordHash,
          role: finalRole,
          walletBalance: credits,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
        },
      });
      await tx.walletTransaction.create({
        data: { userId: u.id, amount: credits, type: 'DEPOSIT', description: 'Simulated starting credits' },
      });
      return u;
    });
    return { user, token: signToken(user) };
  } catch (e) {
    if (e.code === 'P2002') throw new HttpError(409, 'Email already registered'); // race on unique email
    throw e;
  }
}

async function login({ email, password }) {
  if (!email || !password) throw new HttpError(400, 'Email and password are required');
  const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  const ok = user && (await bcrypt.compare(String(password), user.passwordHash));
  if (!ok) throw new HttpError(401, 'Invalid email or password'); // same message for both cases
  return { user, token: signToken(user) };
}

module.exports = { register, login, signToken };