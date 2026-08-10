const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const conversationStore = require('../services/conversation-store');
const userProfile = require('../services/user-profile');
const security = require('../security');
const logger = require('../logger');

/**
 * GET /api/privacy/settings
 * Get privacy settings for user
 * Query: user_id (required)
 */
router.get('/settings', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const profile = await userProfile.getOrCreateProfile(user_id);
  const preferences = profile.preferences ? JSON.parse(profile.preferences) : {};
  
  res.json({
    success: true,
    settings: {
      dataRetentionDays: preferences.dataRetentionDays || 30,
      allowPersonalization: preferences.allowPersonalization !== false,
      allowAnalytics: preferences.allowAnalytics !== false,
      allowConversationStorage: preferences.allowConversationStorage !== false,
      exportFormat: preferences.exportFormat || 'json',
      anonymizeAfterRetention: preferences.anonymizeAfterRetention !== false
    }
  });
}));

/**
 * PATCH /api/privacy/settings
 * Update privacy settings
 * Query: user_id (required)
 * Body: { dataRetentionDays?, allowPersonalization?, allowAnalytics?, allowConversationStorage?, exportFormat?, anonymizeAfterRetention? }
 */
router.patch('/settings', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  const updates = req.body;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const allowedUpdates = {};
  const allowedFields = ['dataRetentionDays', 'allowPersonalization', 'allowAnalytics', 'allowConversationStorage', 'exportFormat', 'anonymizeAfterRetention'];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      allowedUpdates[key] = value;
    }
  }
  
  const profile = await userProfile.updatePreferences(user_id, allowedUpdates);
  const preferences = profile.preferences ? JSON.parse(profile.preferences) : {};
  
  res.json({
    success: true,
    settings: {
      dataRetentionDays: preferences.dataRetentionDays || 30,
      allowPersonalization: preferences.allowPersonalization !== false,
      allowAnalytics: preferences.allowAnalytics !== false,
      allowConversationStorage: preferences.allowConversationStorage !== false,
      exportFormat: preferences.exportFormat || 'json',
      anonymizeAfterRetention: preferences.anonymizeAfterRetention !== false
    }
  });
}));

/**
 * GET /api/privacy/export
 * Export all user data (GDPR compliance)
 * Query: user_id (required), format? (json|csv, default json)
 */
router.get('/export', asyncHandler(async (req, res) => {
  const { user_id, format = 'json' } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const profile = await userProfile.getProfileWithInsights(user_id);
  const conversations = await conversationStore.getUserConversations(user_id, 1000, 0);
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      userId: profile.userId,
      preferences: profile.preferences,
      knownEntities: profile.knownEntities,
      interactionCount: profile.interactionCount,
      avgSatisfaction: profile.avgSatisfaction,
      preferredProviders: profile.preferredProviders,
      firstSeenAt: profile.firstSeenAt,
      lastSeenAt: profile.lastSeenAt
    },
    conversations: conversations.map(c => ({
      id: c.id,
      session_id: c.session_id,
      title: c.title,
      summary: c.summary,
      topic_tags: c.topic_tags ? JSON.parse(c.topic_tags) : [],
      turn_count: c.turn_count,
      created_at: c.created_at,
      updated_at: c.updated_at,
      messages: c.messages || []
    }))
  };
  
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="user_data_${user_id}.csv"`);
    const csv = convertToCSV(exportData);
    res.send(csv);
  } else {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="user_data_${user_id}.json"`);
  res.json({
    success: true,
    data: exportData
  });
  }
}));

/**
 * DELETE /api/privacy/delete
 * Delete all user data (GDPR right to be forgotten)
 * Query: user_id (required), confirm? (must be "true")
 */
router.delete('/delete', asyncHandler(async (req, res) => {
  const { user_id, confirm } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  if (confirm !== 'true') {
    throw new AidhakaError('Confirmation required. Add ?confirm=true to confirm deletion.', 400, 'CONFIRMATION_REQUIRED');
  }
  
  await userProfile.deleteUserData(user_id);
  
  res.json({
    success: true,
    message: 'All user data has been permanently deleted',
    deletedAt: new Date().toISOString()
  });
}));

/**
 * POST /api/privacy/anonymize
 * Anonymize user data (remove PII but keep analytics)
 * Query: user_id (required)
 */
router.post('/anonymize', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const anonymizedId = security.hashString(user_id).substring(0, 16);
  
  await conversationStore.updateConversationUserIds(user_id, anonymizedId);
  await userProfile.anonymizeProfile(user_id, anonymizedId);
  
  res.json({
    success: true,
    message: 'User data anonymized',
    anonymizedId
  });
}));

/**
 * GET /api/privacy/retention-report
 * Get data retention report
 * Query: user_id (required)
 */
router.get('/retention-report', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const profile = await userProfile.getOrCreateProfile(user_id);
  const preferences = profile.preferences ? JSON.parse(profile.preferences) : {};
  const retentionDays = preferences.dataRetentionDays || 30;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const conversations = await conversationStore.getUserConversations(user_id, 1000, 0);
  const activeConversations = conversations.filter(c => new Date(c.created_at) >= cutoffDate);
  const expiredConversations = conversations.filter(c => new Date(c.created_at) < cutoffDate);
  
  res.json({
    success: true,
    report: {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalConversations: conversations.length,
      activeConversations: activeConversations.length,
      expiredConversations: expiredConversations.length,
      willBeDeleted: expiredConversations.map(c => ({
        id: c.id,
        title: c.title,
        created_at: c.created_at
      }))
    }
  });
}));

/**
 * POST /api/privacy/cleanup
 * Manually trigger cleanup of expired conversations
 * Query: user_id (required)
 */
router.post('/cleanup', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const profile = await userProfile.getOrCreateProfile(user_id);
  const preferences = profile.preferences ? JSON.parse(profile.preferences) : {};
  const retentionDays = preferences.dataRetentionDays || 30;
  
  const deletedCount = await conversationStore.cleanupExpiredConversations(retentionDays);
  
  res.json({
    success: true,
    deletedCount,
    retentionDays,
    message: `Cleaned up ${deletedCount} expired conversations`
  });
}));

/**
 * Simple CSV converter
 * @param {Object} data - Export data
 * @returns {string} CSV string
 */
function convertToCSV(data) {
  const rows = [];
  rows.push('Type,ID,Title,Content,Created At');
  
  for (const conv of data.conversations) {
    rows.push(`Conversation,${conv.id},"${conv.title || ''}","",${conv.created_at}`);
    for (const msg of (conv.messages || [])) {
      const content = (msg.content || '').replace(/"/g, '""').substring(0, 200);
      rows.push(`Message,${msg.id},"","${content}",${msg.created_at}`);
    }
  }
  
  return rows.join('\n');
}

module.exports = router;