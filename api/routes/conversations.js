const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const conversationStore = require('../services/conversation-store');
const multiLevelCache = require('../services/multi-level-cache');
const security = require('../security');
const db = require('../database');
const logger = require('../logger');

router.get('/', asyncHandler(async (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  const conversations = await conversationStore.getUserConversations(user_id, 20, 0);
  res.json({ success: true, conversations });
}));

router.post('/', asyncHandler(async (req, res) => {
  const user_id = req.body.user_id;
  const sessionId = req.body.session_id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const metadata = req.body.metadata || {};

  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  const conversation = await conversationStore.createConversation(user_id, sessionId, metadata);
  res.status(201).json({ success: true, conversation });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id, 10);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid conversation ID' });
  }

  const conversation = await conversationStore.getConversationHistory(conversationId, 50);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  res.json({ success: true, conversation });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id, 10);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid conversation ID' });
  }

  await conversationStore.deleteConversation(conversationId);
  res.json({ success: true, message: 'Conversation deleted' });
}));

router.post('/:id/messages', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id, 10);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid conversation ID' });
  }

  const { role, content, metadata = {} } = req.body;

  if (!['user', 'assistant', 'system'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }

  const message = await conversationStore.addMessage(conversationId, role, content, metadata);
  res.json({ success: true, message });
}));

router.get('/:id/messages', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id, 10);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid conversation ID' });
  }

  const limit = parseInt(req.query.limit || '50', 10);
  const offset = parseInt(req.query.offset || '0', 10);

  const messages = await conversationStore.getConversationHistory(conversationId, limit);
  res.json({ success: true, messages });
}));

router.get('/:id/topics', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id, 10);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid conversation ID' });
  }

  const topics = await conversationStore.getConversationTopics(conversationId);
  res.json({ success: true, topics });
}));

router.post('/search', asyncHandler(async (req, res) => {
  const user_id = req.body.user_id;
  const query = req.body.query;
  const limit = parseInt(req.body.limit || '10', 10);

  if (!user_id || !query) {
    return res.status(400).json({ success: false, error: 'user_id and query are required' });
  }

  const results = await conversationStore.searchConversations(user_id, query, limit);
  res.json({ success: true, results });
}));

module.exports = router;
