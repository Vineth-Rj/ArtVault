const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./utils/config');
const prisma = require('./db/client');

const app = express();

/*
 * Route loader
 *
 * Supports route files exporting:
 *   module.exports = router
 *   module.exports = { router }
 *   exports.router = router
 *   module.exports.default = router
 */
function loadRouter(path) {
  const routeModule = require(path);

  if (typeof routeModule === 'function') {
    return routeModule;
  }

  if (routeModule && typeof routeModule.router === 'function') {
    return routeModule.router;
  }

  if (routeModule && typeof routeModule.default === 'function') {
    return routeModule.default;
  }

  throw new TypeError(
    `Invalid Express router export from ${path}. ` +
    `Expected an Express router function.`
  );
}

app.use(helmet());

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

app.use(morgan('dev'));

/*
 * Health check
 */
app.get('/api/health', async (_req, res) => {
  try {
    const users = await prisma.user.count();

    res.json({
      ok: true,
      users,
    });
  } catch (e) {
    console.error('Health check failed:', e);

    res.status(500).json({
      ok: false,
      error: e.message,
    });
  }
});

/*
 * API Routes
 */
app.use('/api/auth', loadRouter('./routes/auth.routes'));
app.use('/api/products', loadRouter('./routes/product.routes'));
app.use('/api/orders', loadRouter('./routes/order.routes'));
app.use('/api/market', loadRouter('./routes/market.routes'));
app.use('/api/portfolio', loadRouter('./routes/portfolio.routes'));
app.use('/api/artist', loadRouter('./routes/artist.routes'));
app.use('/api/ai', loadRouter('./routes/ai.routes'));

/*
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
  });
});

/*
 * Global error handler
 */
app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(err.status || 500).json({
    error: err.message || 'Server error',
  });
});

/*
 * Start server
 */
app.listen(config.port, () => {
  console.log(`ARTVAULT API on :${config.port}`);
});