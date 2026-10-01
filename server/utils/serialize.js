// Prisma returns Decimal objects; the API sends plain numbers.
const toNum = (d) => (d === null || d === undefined ? d : Number(d));

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    bio: u.bio,
    role: u.role,
    walletBalance: toNum(u.walletBalance),
    createdAt: u.createdAt,
  };
}

module.exports = { toNum, publicUser };