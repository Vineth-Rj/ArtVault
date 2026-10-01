require('dotenv').config();

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

module.exports = {
  port: num(process.env.PORT, 4000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  geminiKey: process.env.GEMINI_API_KEY,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'artworks',
  },
  market: {
    productPlatformFeeRate: num(process.env.PRODUCT_PLATFORM_FEE_RATE, 0.05), // on product sales / collab income
    holdersShareRate: num(process.env.HOLDERS_SHARE_RATE, 0.2),               // of net earnings, split across all units
    primaryUnitFeeRate: num(process.env.PRIMARY_UNIT_FEE_RATE, 0.05),         // on first sale of a unit
    secondaryFeeRate: num(process.env.SECONDARY_FEE_RATE, 0.025),             // on resales
    secondaryRoyaltyRate: num(process.env.SECONDARY_ROYALTY_RATE, 0.05),      // to artist on resales
    startingCredits: num(process.env.STARTING_CREDITS, 10000),
  },
};