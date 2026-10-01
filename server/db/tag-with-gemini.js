// Runs Gemini on every product that has no AI tags yet.  Usage:  node db/tag-with-gemini.js
require('dotenv').config();
const prisma = require('./client');
const { applyAnalysis } = require('../services/discovery.service');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const products = await prisma.product.findMany({ where: { aiTags: { isEmpty: true }, status: { not: 'REMOVED' } } });
  console.log(`${products.length} product(s) to tag`);
  for (const p of products) {
    try {
      const r = await applyAnalysis(p);
      console.log(`OK   ${p.title}: ${r.analysis.tags.join(', ')}`);
    } catch (e) {
      console.log(`FAIL ${p.title}: ${e.message}`);
    }
    await sleep(1500); // stay inside free-tier rate limits
  }
})().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());