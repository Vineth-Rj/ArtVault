const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { publicUser } = require('../utils/serialize');

exports.register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body || {});
  res.status(201).json({ user: publicUser(user), token });
});

exports.login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body || {});
  res.json({ user: publicUser(user), token });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});