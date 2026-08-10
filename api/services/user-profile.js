const db = require('../database');

async function getUserProfile(userId) {
  return await db.get(`SELECT * FROM user_profiles WHERE user_id = ?`, [userId]);
}

async function createUserProfile(userId, preferences = {}) {
  const existing = await getUserProfile(userId);
  if (existing) return existing;

  await db.run(
    `INSERT INTO user_profiles (user_id, preferences, known_entities, interaction_count) VALUES (?, ?, ?, 1)`,
    [userId, JSON.stringify(preferences), JSON.stringify({})]
  );
  return getUserProfile(userId);
}

async function updateUserProfile(userId, updates = {}) {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  if (!fields) return getUserProfile(userId);
  
  const values = Object.values(updates);
  values.push(userId);
  
  await db.run(
    `UPDATE user_profiles SET ${fields} WHERE user_id = ?`,
    values
  );
  return getUserProfile(userId);
}

async function incrementInteractionCount(userId) {
  await db.run(
    `UPDATE user_profiles SET interaction_count = interaction_count + 1, last_seen_at = NOW() WHERE user_id = ?`,
    [userId]
  );
}

async function getPreferredProviders(userId) {
  const profile = await getUserProfile(userId);
  if (!profile || !profile.preferred_providers) return [];
  try {
    return JSON.parse(profile.preferred_providers);
  } catch {
    return [];
  }
}

module.exports = {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  incrementInteractionCount,
  getPreferredProviders
};
