function paging(q = {}, defLimit = 20, max = 100) {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || defLimit, 1), max);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { paging };