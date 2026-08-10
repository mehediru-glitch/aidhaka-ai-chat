const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const userProfile = require('../services/user-profile');
const summarizer = require('../services/summarizer');
const clarificationFlow = require('../services/clarification-flow');
const security = require('../security');
const logger = require('../logger');

/**
 * GET /api/profile
 * Get current user profile with insights
 * Query: user_id (required)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const profile = await userProfile.getProfileWithInsights(user_id);
  
  res.json({
    success: true,
    profile
  });
}));

/**
 * PATCH /api/profile
 * Update user preferences
 * Query: user_id (required)
 * Body: { preferences?, preferred_providers? }
 */
router.patch('/', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  const { preferences, preferred_providers } = req.body;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  let profile;
  if (preferences) {
    profile = await userProfile.updatePreferences(user_id, preferences);
  } else if (preferred_providers) {
    profile = await userProfile.updatePreferredProviders(user_id, preferred_providers);
  } else {
    throw new AidhakaError('No updates provided', 400, 'NO_UPDATES');
  }
  
  res.json({
    success: true,
    profile: {
      userId: profile.user_id,
      preferences: profile.preferences ? JSON.parse(profile.preferences) : {},
      preferredProviders: profile.preferred_providers ? JSON.parse(profile.preferred_providers) : {},
      updatedAt: profile.last_seen_at
    }
  });
}));

/**
 * DELETE /api/profile
 * Delete all user data (GDPR compliance)
 * Query: user_id (required)
 */
router.delete('/', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  await userProfile.deleteUserData(user_id);
  
  res.json({ success: true, message: 'All user data deleted' });
}));

/**
 * GET /api/profile/entities
 * Get known entities for user
 * Query: user_id (required), type? (optional filter)
 */
router.get('/entities', asyncHandler(async (req, res) => {
  const { user_id, type } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const entities = await userProfile.getKnownEntities(user_id, type);
  
  res.json({
    success: true,
    entities
  });
}));

/**
 * POST /api/profile/entities
 * Add known entity to user profile
 * Query: user_id (required)
 * Body: { entity, type }
 */
router.post('/entities', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  const { entity, type } = req.body;
  
  if (!user_id || !entity) {
    throw new AidhakaError('user_id and entity are required', 400, 'MISSING_FIELDS');
  }
  
  const profile = await userProfile.addKnownEntity(user_id, entity, type || 'unknown');
  const knownEntities = profile.known_entities ? JSON.parse(profile.known_entities) : {};
  
  res.status(201).json({
    success: true,
    entity: {
      name: entity,
      ...knownEntities[entity]
    }
  });
}));

/**
 * GET /api/profile/preferences
 * Get user preferences
 * Query: user_id (required)
 */
router.get('/preferences', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const profile = await userProfile.getOrCreateProfile(user_id);
  const preferences = profile.preferences ? JSON.parse(profile.preferences) : userProfile.getDefaultPreferences();
  
  res.json({
    success: true,
    preferences
  });
}));

/**
 * POST /api/summarize
 * Summarize a conversation
 * Body: { conversation_id }
 */
router.post('/summarize', asyncHandler(async (req, res) => {
  const { conversation_id } = req.body;
  
  if (!conversation_id) {
    throw new AidhakaError('conversation_id is required', 400, 'MISSING_CONVERSATION_ID');
  }
  
  const conversationStore = require('../services/conversation-store');
  const history = await conversationStore.getConversationHistory(conversation_id, 100);
  
  if (!history || !history.messages) {
    throw new AidhakaError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }
  
  const summary = summarizer.generateSummary(history.messages);
  const title = summarizer.generateTitle(history.messages);
  const actionItems = summarizer.extractActionItems(history.messages);
  const decisions = summarizer.extractDecisions(history.messages);
  
  await conversationStore.updateConversation(conversation_id, {
    summary,
    title
  });
  
  res.json({
    success: true,
    summary,
    title,
    actionItems,
    decisions,
    messageCount: history.messages.length
  });
}));

/**
 * POST /api/clarify
 * Check if message needs clarification
 * Body: { message, history? }
 */
router.post('/clarify', asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  
  if (!message) {
    throw new AidhakaError('message is required', 400, 'MISSING_MESSAGE');
  }
  
  const assessment = clarificationFlow.needsClarification(message, history || []);
  
  let clarificationQuestion = null;
  if (assessment.needsClarification) {
    clarificationQuestion = clarificationFlow.generateClarification(message, assessment.ambiguousTerms, history || []);
  }
  
  res.json({
    success: true,
    needsClarification: assessment.needsClarification,
    reason: assessment.reason,
    ambiguousTerms: assessment.ambiguousTerms,
    clarificationQuestion
  });
}));

module.exports = router;