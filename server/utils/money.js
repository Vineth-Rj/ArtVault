// All money math is done in integer cents to avoid floating point drift.
const toCents = (n) => Math.round(Number(n) * 100);
const fromCents = (c) => c / 100;

module.exports = { toCents, fromCents };