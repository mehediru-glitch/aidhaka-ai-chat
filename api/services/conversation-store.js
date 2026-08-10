const db = require('../database');

async function getConversationBySession(sessionId) {
  return await db.get(
    `SELECT * FROM conversations WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
    [sessionId]
  );
}

async function createConversation(userId = null, sessionId = null, metadata = {}) {
  const session = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const result = await db.run(
    `INSERT INTO conversations (user_id, session_id, metadata) VALUES (?, ?, ?)`,
    [userId, session, JSON.stringify(metadata)]
  );
  return getConversation(result.id);
}

async function getConversation(conversationId) {
  return await db.get(`SELECT * FROM conversations WHERE id = ?`, [conversationId]);
}

async function getUserConversations(userId, limit = 20, offset = 0) {
  return await db.all(
    `SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
}

async function updateConversation(conversationId, updates = {}) {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(conversationId);
  
  await db.run(
    `UPDATE conversations SET ${fields}, updated_at = NOW() WHERE id = ?`,
    values
  );
  return getConversation(conversationId);
}

async function addMessage(conversationId, role, content, metadata = {}) {
  const result = await db.run(
    `INSERT INTO messages (conversation_id, role, content, sanitized_content, provider, quality_score) VALUES (?, ?, ?, ?, ?, ?)`,
    [conversationId, role, content, metadata.sanitized_content || content, metadata.provider || null, metadata.quality_score || null]
  );
  
  await db.run(
    `UPDATE conversations SET turn_count = turn_count + 1, updated_at = NOW() WHERE id = ?`,
    [conversationId]
  );
  
  return getMessage(result.id);
}

async function getMessage(messageId) {
  return await db.get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
}

async function getConversationHistory(conversationId, limit = 50) {
  return await db.all(
    `SELECT * FROM messages WHERE conversation_id = ? ORDER BY turn_number DESC LIMIT ?`,
    [conversationId, limit]
  );
}

async function getRecentMessages(conversationId, limit = 10) {
  return await db.all(
    `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?`,
    [conversationId, limit]
  );
}

async function deleteConversation(conversationId) {
  await db.run(`DELETE FROM messages WHERE conversation_id = ?`, [conversationId]);
  await db.run(`DELETE FROM topics WHERE conversation_id = ?`, [conversationId]);
  await db.run(`DELETE FROM conversations WHERE id = ?`, [conversationId]);
}

async function getConversationTopics(conversationId) {
  return await db.all(
    `SELECT * FROM topics WHERE conversation_id = ? ORDER BY last_mentioned_at DESC`,
    [conversationId]
  );
}

async function searchConversations(userId, query, limit = 10) {
  return await db.all(
    `SELECT * FROM conversations WHERE user_id = ? AND (title LIKE ? OR summary LIKE ?) ORDER BY updated_at DESC LIMIT ?`,
    [userId, `%${query}%`, `%${query}%`, limit]
  );
}

async function updateConversationUserIds(oldUserId, newUserId) {
  await db.run(
    `UPDATE conversations SET user_id = ? WHERE user_id = ?`,
    [newUserId, oldUserId]
  );
  await db.run(
    `UPDATE user_profiles SET user_id = ? WHERE user_id = ?`,
    [newUserId, oldUserId]
  );
}

module.exports = {
  getConversationBySession,
  createConversation,
  getConversation,
  getUserConversations,
  updateConversation,
  addMessage,
  getMessage,
  getConversationHistory,
  getRecentMessages,
  deleteConversation,
  getConversationTopics,
  searchConversations,
  updateConversationUserIds
};
