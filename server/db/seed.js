require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const PRODUCT_FEE = num(process.env.PRODUCT_PLATFORM_FEE_RATE, 0.05);
const HOLDERS_SHARE = num(process.env.HOLDERS_SHARE_RATE, 0.2);
const PRIMARY_FEE = num(process.env.PRIMARY_UNIT_FEE_RATE, 0.05);
const SECONDARY_FEE = num(process.env.SECONDARY_FEE_RATE, 0.025);
const ROYALTY = num(process.env.SECONDARY_ROYALTY_RATE, 0.05);
const START = num(process.env.STARTING_CREDITS, 10000);

const r2 = (n) => Math.round(n * 100) / 100;
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const DAY = 24 * 60 * 60 * 1000;

const ARTISTS = [
  { name: 'Rahul', units: 200, price: 50, products: [
    { title: 'Sunset Dreams', category: 'Painting', artType: 'Acrylic', price: 1200, stock: 25, desc: 'A warm coastal sunset blending amber and violet skies.' },
    { title: 'Forgotten Village', category: 'Painting', artType: 'Oil', price: 2000, stock: 10, desc: 'An abandoned hill village slowly reclaimed by nature.' },
  ] },
  { name: 'Ananya', units: 100, price: 80, products: [
    { title: 'Coastal Memories', category: 'Painting', artType: 'Watercolor', price: 1500, stock: 15, desc: 'Fishing boats and quiet tides painted from childhood memory.' },
  ] },
  { name: 'Meera', units: 150, price: 40, products: [
    { title: 'The Last Monsoon', category: 'Illustration', artType: 'Digital', price: 900, stock: 30, desc: 'Rain-soaked streets under a heavy monsoon sky.' },
  ] },
  { name: 'Arjun', units: 120, price: 60, products: [
    { title: 'Folk Rhythms', category: 'Folk Art', artType: 'Mixed Media', price: 1100, stock: 20, desc: 'Dancers and drummers in vivid traditional patterns.' },
  ] },
];

const delta = {};   // userId -> balance change from seeded activity
const ledger = [];  // wallet transactions to insert at the end
const bump = (id, amt) => (delta[id] = r2((delta[id] || 0) + amt));
const log = (userId, amount, type, referenceId, description, createdAt) =>
  ledger.push({ userId, amount, type, referenceId, description, createdAt });

// Splits an earning between platform, holders (per unit) and artist.
async function earn({ artist, totalUnits, owner, gross, source, orderId, description, when }) {
  const fee = r2(gross * PRODUCT_FEE);
  const net = r2(gross - fee);
  const pool = r2(net * HOLDERS_SHARE);
  const perUnit = r6(pool / totalUnits);

  const holdings = {};
  for (const uid of Object.values(owner)) holdings[uid] = (holdings[uid] || 0) + 1;

  const payouts = [];
  let paid = 0;
  let unitsPaid = 0;
  for (const [holderId, unitsHeld] of Object.entries(holdings)) {
    const amount = r2(unitsHeld * perUnit);
    if (amount <= 0) continue;
    payouts.push({ holderId, unitsHeld, amount });
    paid = r2(paid + amount);
    unitsPaid += unitsHeld;
  }
  const artistNet = r2(net - paid); // includes unsold units' share

  const earning = await prisma.artistEarning.create({
    data: {
      artistId: artist.id, source, orderId: orderId || null, grossAmount: gross, platformFee: fee,
      holdersPool: pool, perUnitPayout: perUnit, unitsPaid, holdersPaid: paid, artistNet,
      description, createdAt: when,
    },
  });
  if (payouts.length) {
    await prisma.unitPayout.createMany({
      data: payouts.map((p) => ({ ...p, earningId: earning.id, createdAt: when })),
    });
  }
  bump(artist.id, artistNet);
  log(artist.id, artistNet, source === 'ORDER' ? 'PRODUCT_EARNING' : 'COLLAB_EARNING', earning.id, description, when);
  for (const p of payouts) {
    bump(p.holderId, p.amount);
    log(p.holderId, p.amount, 'UNIT_PAYOUT', earning.id, `Payout: ${artist.name} (${p.unitsHeld} units)`, when);
  }
}

async function main() {
  console.log('Clearing data...');
  await prisma.unitPayout.deleteMany();
  await prisma.artistEarning.deleteMany();
  await prisma.productOrder.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.sellOrder.deleteMany();
  await prisma.buyOrder.deleteMany();
  await prisma.perk.deleteMany();
  await prisma.artUnit.deleteMany();
  await prisma.product.deleteMany();
  await prisma.artistMarket.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);
  const mk = (name, role, email) =>
    prisma.user.create({
      data: {
        name, role,
        email: email || `${name.toLowerCase().replace(/\s+/g, '')}@artvault.dev`,
        passwordHash, walletBalance: START,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        bio: role === 'ARTIST' ? 'Emerging artist on ARTVAULT.' : null,
      },
    });

  const artistUsers = {};
  for (const a of ARTISTS) artistUsers[a.name] = await mk(a.name, 'ARTIST');
  const collectors = [];
  for (const n of ['Collector A', 'Collector B', 'Collector C']) collectors.push(await mk(n, 'COLLECTOR'));
  await mk('Admin', 'ADMIN', 'admin@artvault.dev');

  const everyone = await prisma.user.findMany();
  const t0 = new Date(Date.now() - 13 * DAY);
  await prisma.walletTransaction.createMany({
    data: everyone.map((u) => ({ userId: u.id, amount: START, type: 'DEPOSIT', description: 'Simulated starting credits', createdAt: t0 })),
  });

  for (const a of ARTISTS) {
    const artist = artistUsers[a.name];
    let clock = Date.now() - 12 * DAY;
    const tick = () => new Date((clock += DAY / 2));

    await prisma.artistMarket.create({
      data: { artistId: artist.id, totalUnits: a.units, initialPrice: a.price, currentPrice: a.price, earningsSharePercent: HOLDERS_SHARE * 100 },
    });
    await prisma.artUnit.createMany({
      data: Array.from({ length: a.units }, (_, i) => ({ artistId: artist.id, unitNumber: i + 1, currentValue: a.price, status: 'AVAILABLE' })),
    });
    await prisma.perk.createMany({
      data: [
        { artistId: artist.id, title: 'Early access to new drops', description: 'Shop new products 24h before everyone else.', minUnits: 1 },
        { artistId: artist.id, title: 'Vote on next collaboration', description: 'Help choose the artist\'s next collaboration.', minUnits: 5 },
      ],
    });

    const products = [];
    for (const p of a.products) {
      const slug = p.title.toLowerCase().replace(/\s+/g, '-');
      products.push(await prisma.product.create({
        data: {
          artistId: artist.id, title: p.title, description: p.desc,
          story: `Inspired by memories that shaped ${a.name}'s early years.`,
          imageUrl: `https://picsum.photos/seed/${slug}/800/600`,
          category: p.category, artType: p.artType, price: p.price, stock: p.stock,
        },
      }));
    }

    const TRADES = 14;
    const units = await prisma.artUnit.findMany({ where: { artistId: artist.id }, orderBy: { unitNumber: 'asc' }, take: TRADES });
    const owner = {}; // unit.id -> userId
    let price = a.price;
    let volume = 0;

    for (let i = 0; i < TRADES; i++) {
      // primary unit purchase on a rising price curve
      const t = i / (TRADES - 1);
      price = r2(Math.max(a.price * 0.9, a.price * (1 + 1.5 * t + Math.sin(i * 1.7) * 0.08)));
      const buyer = collectors[i % 3];
      const fee = r2(price * PRIMARY_FEE);
      const when = tick();
      const unit = units[i];

      const tx = await prisma.transaction.create({
        data: { artistId: artist.id, unitId: unit.id, buyerId: buyer.id, sellerId: null, price, platformFee: fee, artistRoyalty: 0, transactionType: 'PRIMARY', createdAt: when },
      });
      await prisma.artUnit.update({ where: { id: unit.id }, data: { ownerId: buyer.id, purchasePrice: price, currentValue: price, status: 'OWNED' } });
      owner[unit.id] = buyer.id;
      volume += price;
      bump(buyer.id, -price); bump(artist.id, price - fee);
      log(buyer.id, -price, 'UNIT_PURCHASE', tx.id, `${a.name} unit #${unit.unitNumber}`, when);
      log(artist.id, r2(price - fee), 'UNIT_PRIMARY_EARNING', tx.id, `Unit sale #${unit.unitNumber}`, when);

      // two real product orders during the timeline -> payouts to current holders
      if (i === 5 || i === 11) {
        const product = i === 5 ? products[0] : products[products.length - 1];
        const orderBuyer = collectors[(i + 1) % 3];
        const gross = r2(product.price);
        const orderTime = tick();
        const order = await prisma.productOrder.create({
          data: { productId: product.id, buyerId: orderBuyer.id, artistId: artist.id, quantity: 1, totalPrice: gross, createdAt: orderTime },
        });
        await prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: 1 }, soldCount: { increment: 1 } } });
        bump(orderBuyer.id, -gross);
        log(orderBuyer.id, -gross, 'PRODUCT_PURCHASE', order.id, product.title, orderTime);
        await earn({ artist, totalUnits: a.units, owner, gross, source: 'ORDER', orderId: order.id, description: `Sale: ${product.title}`, when: orderTime });
      }
    }

    // three resales between collectors
    for (let j = 0; j < 3; j++) {
      const unit = units[j];
      const sellerId = owner[unit.id];
      const buyer = collectors.find((c) => c.id !== sellerId);
      price = r2(price * (1 + 0.04 * (j + 1)));
      const royalty = r2(price * ROYALTY);
      const fee = r2(price * SECONDARY_FEE);
      const when = tick();

      const tx = await prisma.transaction.create({
        data: { artistId: artist.id, unitId: unit.id, buyerId: buyer.id, sellerId, price, platformFee: fee, artistRoyalty: royalty, transactionType: 'SECONDARY', createdAt: when },
      });
      await prisma.artUnit.update({ where: { id: unit.id }, data: { ownerId: buyer.id, purchasePrice: price, currentValue: price, status: 'OWNED' } });
      owner[unit.id] = buyer.id;
      volume += price;
      bump(buyer.id, -price); bump(sellerId, price - royalty - fee); bump(artist.id, royalty);
      log(buyer.id, -price, 'UNIT_PURCHASE', tx.id, `${a.name} unit #${unit.unitNumber}`, when);
      log(sellerId, r2(price - royalty - fee), 'UNIT_SALE', tx.id, `Sold ${a.name} unit #${unit.unitNumber}`, when);
      log(artist.id, royalty, 'ROYALTY', tx.id, `Royalty: unit #${unit.unitNumber}`, when);
    }

    // one collaboration income event (shows non-product income also flows to holders)
    await earn({ artist, totalUnits: a.units, owner, gross: 800, source: 'COLLAB', description: 'Collaboration payment', when: tick() });

    const holders = new Set(Object.values(owner)).size;
    await prisma.artistMarket.update({
      where: { artistId: artist.id },
      data: { currentPrice: price, unitsSold: TRADES, totalHolders: holders, tradingVolume: r2(volume) },
    });
    await prisma.artUnit.updateMany({ where: { artistId: artist.id }, data: { currentValue: price } });
    console.log(`Seeded ${a.name}: ${a.units} units, price ${a.price} -> ${price}, ${a.products.length} product(s)`);
  }

  await prisma.walletTransaction.createMany({ data: ledger });
  for (const [id, d] of Object.entries(delta)) {
    await prisma.user.update({ where: { id }, data: { walletBalance: { increment: d } } });
  }

  const negative = await prisma.user.findMany({ where: { walletBalance: { lt: 0 } } });
  if (negative.length) throw new Error(`Seed produced negative balances: ${negative.map((u) => u.name).join(', ')}`);

  console.log('\nDone. Login with any seeded email + password "password123":');
  console.log('  rahul@artvault.dev (artist), collectora@artvault.dev (collector), admin@artvault.dev');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());