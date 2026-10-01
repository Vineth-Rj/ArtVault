const { Prisma } = require('@prisma/client');
const { toCents, fromCents } = require('../utils/money');

// Locks the given users' rows (always in id order to avoid deadlocks) and
// returns a Map of userId -> balance in cents, read AFTER the lock is held.
async function lockUsers(tx, ids) {
  const unique = [...new Set(ids)].sort();
  const rows = await tx.$queryRaw`
    SELECT id, wallet_balance FROM users WHERE id IN (${Prisma.join(unique)}) ORDER BY id FOR UPDATE`;
  return new Map(rows.map((r) => [r.id, toCents(r.wallet_balance)]));
}

// entries: [{ userId, cents (signed), type, referenceId, description }]
// Updates balances and writes the ledger in the same transaction.
async function applyEntries(tx, entries) {
  const net = new Map();
  for (const e of entries) net.set(e.userId, (net.get(e.userId) || 0) + e.cents);

  for (const id of [...net.keys()].sort()) {
    const cents = net.get(id);
    if (cents !== 0) {
      await tx.user.update({ where: { id }, data: { walletBalance: { increment: fromCents(cents) } } });
    }
  }

  const rows = entries.filter((e) => e.cents !== 0);
  if (rows.length) {
    await tx.walletTransaction.createMany({
      data: rows.map((e) => ({
        userId: e.userId,
        amount: fromCents(e.cents),
        type: e.type,
        referenceId: e.referenceId || null,
        description: e.description || null,
      })),
    });
  }
}

module.exports = { lockUsers, applyEntries };