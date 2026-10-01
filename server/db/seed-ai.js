// Adds hand-written AI-style tags to the 5 demo products so search and recommendations
// work in the demo even without a Gemini key.  Run after the main seed:  node db/seed-ai.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DATA = {
  'Sunset Dreams': {
    tags: ['sunset', 'coastal', 'warm colors', 'seascape', 'acrylic'], style: 'impressionist', mood: 'warm calm',
    themes: ['nature', 'evening', 'sea'],
    keywords: ['sunset', 'beach', 'coastal art', 'traditional coastal art', 'sea', 'golden hour', 'peaceful nature', 'landscape', 'orange sky'],
    desc: 'A warm coastal sunset in amber and violet tones.',
  },
  'Coastal Memories': {
    tags: ['coastal', 'fishing boats', 'watercolor', 'nostalgic', 'harbour'], style: 'watercolor realism', mood: 'nostalgic',
    themes: ['memory', 'sea', 'village life'],
    keywords: ['coastal art', 'traditional coastal art', 'boats', 'fishermen', 'sea', 'harbour', 'childhood', 'peaceful nature', 'watercolour'],
    desc: 'Fishing boats resting at a quiet shore, painted in soft watercolor.',
  },
  'The Last Monsoon': {
    tags: ['monsoon', 'rain', 'city street', 'digital illustration', 'moody'], style: 'digital illustration', mood: 'moody',
    themes: ['weather', 'urban life', 'seasons'],
    keywords: ['rain', 'monsoon', 'street', 'city', 'storm', 'umbrella', 'digital art', 'illustration', 'wet streets'],
    desc: 'Rain-soaked streets under a heavy monsoon sky.',
  },
  'Folk Rhythms': {
    tags: ['folk art', 'dance', 'music', 'traditional', 'vibrant'], style: 'folk', mood: 'joyful',
    themes: ['culture', 'celebration', 'tradition'],
    keywords: ['folk art', 'traditional art', 'dance', 'drummers', 'festival', 'indian folk', 'colorful', 'culture', 'patterns'],
    desc: 'Dancers and drummers in vivid traditional patterns.',
  },
  'Forgotten Village': {
    tags: ['village', 'hills', 'abandoned', 'oil painting', 'nature reclaiming'], style: 'romantic landscape', mood: 'quiet melancholy',
    themes: ['nature', 'solitude', 'time'],
    keywords: ['village', 'hills', 'landscape', 'abandoned', 'rural', 'peaceful nature', 'oil painting', 'mountains', 'countryside'],
    desc: 'An abandoned hill village slowly reclaimed by nature.',
  },
};

(async () => {
  for (const [title, d] of Object.entries(DATA)) {
    const r = await prisma.product.updateMany({
      where: { title },
      data: { aiTags: d.tags, aiStyle: d.style, aiMood: d.mood, aiThemes: d.themes, aiKeywords: d.keywords, aiDescription: d.desc },
    });
    console.log(`${title}: ${r.count} product(s) tagged`);
  }
})().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());