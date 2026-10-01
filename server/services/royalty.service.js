// Pure functions: how a sale is split. No database access, easy to test.
// Every split conserves money exactly: parts always add up to the total.

function splitPrimary({ priceCents, feeRate }) {
  const feeCents = Math.round(priceCents * feeRate);
  return { feeCents, artistCents: priceCents - feeCents };
}

function splitSecondary({ priceCents, royaltyRate, feeRate }) {
  const royaltyCents = Math.round(priceCents * royaltyRate);
  const feeCents = Math.round(priceCents * feeRate);
  const sellerCents = priceCents - royaltyCents - feeCents;
  if (sellerCents < 0) throw new Error('Fees exceed sale price');
  return { royaltyCents, feeCents, sellerCents };
}

// Splits artist income between platform, unit holders and the artist.
//   net         = gross - fee
//   pool        = net * sharePercent
//   holder gets = floor(units * pool / totalUnits)   (never overpays)
//   artist gets = net - total paid to holders        (includes unsold units' share and rounding dust)
function splitEarning({ grossCents, feeRate, sharePercent, totalUnits, holdings }) {
  const feeCents = Math.round(grossCents * feeRate);
  const netCents = grossCents - feeCents;
  const poolCents = totalUnits > 0 ? Math.round((netCents * sharePercent) / 100) : 0;

  const payouts = [];
  let paidCents = 0;
  let unitsPaid = 0;
  if (totalUnits > 0) {
    const sorted = [...holdings].sort((a, b) => (a.holderId < b.holderId ? -1 : 1));
    for (const h of sorted) {
      const cents = Math.floor((h.units * poolCents) / totalUnits);
      if (cents > 0) {
        payouts.push({ holderId: h.holderId, units: h.units, cents });
        paidCents += cents;
        unitsPaid += h.units;
      }
    }
  }

  const perUnitPayout = totalUnits > 0 ? Math.round((poolCents / totalUnits / 100) * 1e6) / 1e6 : 0;
  return { feeCents, netCents, poolCents, perUnitPayout, payouts, paidCents, unitsPaid, artistNetCents: netCents - paidCents };
}

module.exports = { splitPrimary, splitSecondary, splitEarning };