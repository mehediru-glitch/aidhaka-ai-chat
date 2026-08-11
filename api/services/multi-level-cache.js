const db = require('../database');
const logger = require('../logger');

async function getCache(key) {
  const row = await db.get(
    `SELECT value FROM cache_entries WHERE cache_key = ? AND expires_at > ?`,
    [key, Date.now()]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

async function setCache(key, value, ttl = 300000) {
  const expiresAt = Date.now() + ttl;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  
  await db.run(
    `INSERT INTO cache_entries (cache_key, value, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, expires_at = ?`,
    [key, serialized, expiresAt, serialized, expiresAt]
  );
}

async function deleteCache(key) {
  await db.run(`DELETE FROM cache_entries WHERE cache_key = ?`, [key]);
}

async function clearExpired() {
  await db.run(`DELETE FROM cache_entries WHERE expires_at < ?`, [Date.now()]);
}

async function clearAll() {
  await db.run(`DELETE FROM cache_entries`);
}

async function getStats() {
  const countResult = await db.get(`SELECT COUNT(*) as count FROM cache_entries`);
  const expiredResult = await db.get(`SELECT COUNT(*) as count FROM cache_entries WHERE expires_at < ?`, [Date.now()]);
  
  return {
    totalEntries: countResult?.count || 0,
    expiredEntries: expiredResult?.count || 0,
    activeEntries: (countResult?.count || 0) - (expiredResult?.count || 0)
  };
}

async function invalidate(key) {
  await deleteCache(key);
}

module.exports = {
  getCache,
  setCache,
  get: getCache,
  set: setCache,
  deleteCache,
  clearExpired,
  clearAll,
  getStats,
  invalidate
};
