const db = require('../database');
const logger = require('../logger');

async function startCleanupScheduler({ interval = 'daily', retentionDays = 30 }) {
  const intervalMs = interval === 'daily' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

  setInterval(async () => {
    try {
      await cleanupOldConversations(retentionDays);
      await clearExpiredCache();
      logger.info('Cleanup completed successfully');
    } catch (error) {
      logger.error('Cleanup error:', error.message);
    }
  }, intervalMs);

  logger.info(`Cleanup scheduler started (${interval}, retention: ${retentionDays} days)`);
}

async function cleanupOldConversations(retentionDays) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  const expiredConversations = await db.all(
    `SELECT id FROM conversations WHERE updated_at < ?`,
    [cutoffDate]
  );

  for (const conv of expiredConversations) {
    await db.run(`DELETE FROM messages WHERE conversation_id = ?`, [conv.id]);
    await db.run(`DELETE FROM topics WHERE conversation_id = ?`, [conv.id]);
    await db.run(`DELETE FROM conversations WHERE id = ?`, [conv.id]);
  }

  if (expiredConversations.length > 0) {
    logger.info(`Cleaned up ${expiredConversations.length} old conversations`);
  }
}

async function clearExpiredCache() {
  await db.run(`DELETE FROM cache_entries WHERE expires_at < ?`, [Date.now()]);
}

module.exports = {
  startCleanupScheduler,
  cleanupOldConversations,
  clearExpiredCache
};
