const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./utils/config');
const prisma = require('./db/client');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  try {
    const users = await prisma.user.count();
    res.json({ ok: true, users });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Routes are mounted here in later parts:
 app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
// app.use('/api/market', require('./routes/market.routes'));   // artist unit markets
// app.use('/api/portfolio', require('./routes/portfolio.routes'));
// app.use('/api/artist', require('./routes/artist.routes'));
// app.use('/api/ai', require('./routes/ai.routes'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(config.port, () => console.log(`ARTVAULT API on :${config.port}`));