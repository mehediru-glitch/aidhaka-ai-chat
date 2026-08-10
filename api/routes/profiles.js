const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const userProfile = require('../services/user-profile');
const summarizer = require('../services/summarizer');
const clarificationFlow = require('../services/clarification-flow');
const security = require('../security');
const logger = require('../logger');

router.get('/', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  const profile = await userProfile.getProfileWithInsights(user_id);
  
  if (!profile) {
    return res.status(404).json({ success: false, error: 'Profile not found' });
  }
  
  res.json({
    success: true,
    profile
  });
}));

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
  
  const preferencesJson = profile.preferences ? JSON.parse(profile.preferences) : userProfile.getDefaultPreferences();
  const preferredProvidersJson = profile.preferred_providers ? JSON.parse(profile.preferred_providers) : [];
  
  res.json({
    success: true,
    profile: {
      userId: profile.user_id,
      preferences: preferencesJson,
      preferredProviders: preferredProvidersJson,
      updatedAt: profile.last_seen_at
    }
  });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    throw new AidhakaError('user_id is required', 400, 'MISSING_USER_ID');
  }
  
  await userProfile.deleteUserData(user_id);
  
  res.json({ success: true, message: 'All user data deleted' });
}));

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

router.post('/summarize', asyncHandler(async (req, res) => {
  const { conversation_id } = req.body;
  
  if (!conversation_id) {
    throw new AidhakaError('conversation_id is required', 400, 'MISSING_CONVERSATION_ID');
  }
  
  const conversationStore = require('../services/conversation-store');
  const history = await conversationStore.getConversationHistory(conversation_id, 100);
  
  if (!history || !Array.isArray(history)) {
    throw new AidhakaError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }
  
  const summary = summarizer.generateSummary(history);
  const title = summarizer.generateTitle(history);
  const actionItems = summarizer.extractActionItems(history);
  const decisions = summarizer.extractDecisions(history);
  
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
    messageCount: history.length
  });
}));

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
