const db = require('../database');

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

module.exports = {
  getCache,
  setCache,
  deleteCache,
  clearExpired,
  clearAll
};
