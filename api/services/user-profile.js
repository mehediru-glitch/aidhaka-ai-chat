const db = require('../database');
const logger = require('../logger');
const security = require('../security');

async function getUserProfile(userId) {
  return await db.get(`SELECT * FROM user_profiles WHERE user_id = ?`, [userId]);
}

async function getProfileWithInsights(userId) {
  const profile = await getUserProfile(userId);
  if (!profile) {
    return null;
  }

  let preferences = {};
  let knownEntities = {};
  let preferredProviders = [];

  try {
    preferences = profile.preferences ? JSON.parse(profile.preferences) : {};
  } catch (e) {
    preferences = {};
  }

  try {
    knownEntities = profile.known_entities ? JSON.parse(profile.known_entities) : {};
  } catch (e) {
    knownEntities = {};
  }

  try {
    preferredProviders = profile.preferred_providers ? JSON.parse(profile.preferred_providers) : [];
  } catch (e) {
    preferredProviders = [];
  }

  return {
    userId: profile.user_id,
    preferences,
    knownEntities,
    interactionCount: profile.interaction_count || 0,
    avgSatisfaction: profile.avg_satisfaction || 0,
    preferredProviders,
    firstSeenAt: profile.first_seen_at,
    lastSeenAt: profile.last_seen_at
  };
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

async function getOrCreateProfile(userId) {
  let profile = await getUserProfile(userId);
  if (!profile) {
    await db.run(
      `INSERT INTO user_profiles (user_id, preferences, known_entities, interaction_count) VALUES (?, ?, ?, 1)`,
      [userId, JSON.stringify({}), JSON.stringify({})]
    );
    profile = await getUserProfile(userId);
  }
  return profile;
}

function getDefaultPreferences() {
  return {
    dataRetentionDays: 30,
    allowPersonalization: true,
    allowAnalytics: true,
    allowConversationStorage: true,
    exportFormat: 'json',
    anonymizeAfterRetention: true
  };
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

async function updatePreferences(userId, preferences) {
  const existing = await getOrCreateProfile(userId);
  const currentPrefs = existing.preferences ? JSON.parse(existing.preferences) : {};
  const updatedPrefs = { ...currentPrefs, ...preferences };
  
  await db.run(
    `UPDATE user_profiles SET preferences = ?, last_seen_at = NOW() WHERE user_id = ?`,
    [JSON.stringify(updatedPrefs), userId]
  );
  return getUserProfile(userId);
}

async function updatePreferredProviders(userId, preferredProviders) {
  const existing = await getOrCreateProfile(userId);
  const providersArray = Array.isArray(preferredProviders) ? preferredProviders : [preferredProviders];
  
  await db.run(
    `UPDATE user_profiles SET preferred_providers = ?, last_seen_at = NOW() WHERE user_id = ?`,
    [JSON.stringify(providersArray), userId]
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

async function getKnownEntities(userId, type = null) {
  const profile = await getUserProfile(userId);
  if (!profile || !profile.known_entities) return [];
  
  try {
    const entities = JSON.parse(profile.known_entities);
    if (type) {
      return Object.entries(entities)
        .filter(([_, data]) => data.type === type)
        .map(([name, data]) => ({ name, ...data }));
    }
    return Object.entries(entities).map(([name, data]) => ({ name, ...data }));
  } catch {
    return [];
  }
}

async function addKnownEntity(userId, entity, type = 'unknown') {
  const profile = await getOrCreateProfile(userId);
  const entities = profile.known_entities ? JSON.parse(profile.known_entities) : {};
  
  entities[entity] = {
    type,
    addedAt: new Date().toISOString(),
    mentionCount: (entities[entity]?.mentionCount || 0) + 1
  };
  
  await db.run(
    `UPDATE user_profiles SET known_entities = ?, last_seen_at = NOW() WHERE user_id = ?`,
    [JSON.stringify(entities), userId]
  );
  
  return getUserProfile(userId);
}

async function deleteUserData(userId) {
  await db.run(`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)`, [userId]);
  await db.run(`DELETE FROM topics WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)`, [userId]);
  await db.run(`DELETE FROM conversations WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM routing_history WHERE session_id = ?`, [userId]);
  await db.run(`DELETE FROM chat_history WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM user_profiles WHERE user_id = ?`, [userId]);
}

async function anonymizeProfile(userId, anonymizedId) {
  const profile = await getUserProfile(userId);
  if (!profile) return;
  
  const entities = profile.known_entities ? JSON.parse(profile.known_entities) : {};
  const anonymizedEntities = {};
  
  for (const [key, value] of Object.entries(entities)) {
    const anonKey = security.hashString(key).substring(0, 16);
    anonymizedEntities[anonKey] = { ...value, originalKey: key };
  }
  
  await db.run(
    `UPDATE user_profiles SET user_id = ?, known_entities = ?, last_seen_at = NOW() WHERE user_id = ?`,
    [anonymizedId, JSON.stringify(anonymizedEntities), userId]
  );
}

module.exports = {
  getUserProfile,
  getProfileWithInsights,
  createUserProfile,
  getOrCreateProfile,
  getDefaultPreferences,
  updateUserProfile,
  updatePreferences,
  updatePreferredProviders,
  incrementInteractionCount,
  getPreferredProviders,
  getKnownEntities,
  addKnownEntity,
  deleteUserData,
  anonymizeProfile
};
