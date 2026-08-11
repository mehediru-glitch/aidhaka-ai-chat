const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const providers = require('../providers');
const security = require('../security');
const routing = require('../intelligent-routing');

router.post('/chat', asyncHandler(async (req, res) => {
  const requestId = req.id;

  let question, provider, user_id, history;
  try {
    ({ question, provider, user_id, history } = req.body);
  } catch (e) {
    throw new AidhakaError('Invalid request body', 400, 'INVALID_BODY');
  }

  if (!question || typeof question !== 'string' || !question.trim()) {
    throw new AidhakaError('Message cannot be empty', 400, 'EMPTY_MESSAGE');
  }

  if (question.length > 10000) {
    throw new AidhakaError('Message too long', 400, 'MESSAGE_TOO_LONG');
  }

  let conversationId = null;

  if (user_id) {
    try {
      const conversationStore = require('../services/conversation-store');
      const sessionId = req.id;
      const existing = await conversationStore.getConversationBySession(sessionId);
      if (existing) {
        conversationId = existing.id;
      } else {
        const conversation = await conversationStore.createConversation(user_id, sessionId);
        conversationId = conversation.id;
      }
    } catch (err) {
      conversationId = null;
    }
  }

  providers.resetDailyUsageIfNeeded();
  const startTime = Date.now();

  let injectionCheck;
  try {
    injectionCheck = security.detectPromptInjection(question);
  } catch (e) {
    injectionCheck = { detected: false };
  }

  if (injectionCheck.detected) {
    throw new AidhakaError('Invalid request detected', 400, 'PROMPT_INJECTION');
  }

  let sanitizedQuestion = question;
  try {
    const piiCheck = security.detectAndRedactPII(question);
    sanitizedQuestion = piiCheck.hasPII ? piiCheck.question : security.sanitizeInput(question);
  } catch (e) {
    sanitizedQuestion = question.replace(/[<>]/g, '').trim();
  }

  let cachedReply = null;
  try {
    const multiLevelCache = require('../services/multi-level-cache');
    const cacheKey = `chat:${security.hashString(sanitizedQuestion)}`;
    cachedReply = await multiLevelCache.get(cacheKey);
  } catch (e) {
    cachedReply = null;
  }

  if (cachedReply && !provider) {
    return res.json({
      success: true,
      reply: cachedReply.reply,
      provider: cachedReply.provider,
      cached: true,
      analytics: {
        responseTime: 0,
        qualityScore: cachedReply.qualityScore,
        category: cachedReply.category
      }
    });
  }

  let result;
  let usedProvider = 'offline';
  let responseTime = 0;
  let qualityScore = 0;
  let category = 'default';

  try {
    let selected;
    try {
      selected = routing.selectProviderByQuestion(sanitizedQuestion);
      category = selected.category?.id || 'default';
    } catch (e) {
      selected = { provider: 'groq', category: { id: 'default' } };
      category = 'default';
    }

    const preferredProvider = provider || selected.provider;

    try {
      const reply = await providers.tryProviderWithFallback(sanitizedQuestion, category, preferredProvider);
      if (reply.success && reply.reply) {
        qualityScore = 70;
        try {
          qualityScore = routing.scoreResponseQuality(sanitizedQuestion, reply.reply);
        } catch (e) { }

        if (qualityScore > 60) {
          try {
            const multiLevelCache = require('../services/multi-level-cache');
            const cacheKey = `chat:${security.hashString(sanitizedQuestion)}`;
            await multiLevelCache.set(cacheKey, {
              reply: reply.reply,
              provider: reply.provider,
              qualityScore,
              category
            }, 300000);
          } catch (e) { }
        }

        result = { success: true, reply: reply.reply.trim() };
        usedProvider = reply.provider;
      } else {
        throw new Error(reply.error || 'Provider returned no reply');
      }
    } catch (providerErr) {
      try {
        const offlineReply = routing.getOfflineResponse(sanitizedQuestion, history || []);
        result = { success: true, reply: offlineReply };
        usedProvider = 'offline';
      } catch (offlineErr) {
        result = { success: true, reply: "I'm currently unable to process your request. Please try again later." };
        usedProvider = 'offline';
      }
    }
  } catch (err) {
    result = { success: true, reply: "I'm currently unable to process your request. Please try again later." };
    usedProvider = 'offline';
  }

  responseTime = Date.now() - startTime;

  if (user_id && result && result.success) {
    try {
      const db = require('../database');
      await db.run(
        'INSERT INTO routing_history (session_id, question_hash, question, selected_provider, category, quality_score, response_time, success) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user_id, security.hashString(sanitizedQuestion), sanitizedQuestion, usedProvider, category, qualityScore, responseTime, 1]
      );
    } catch (dbErr) { }

    if (conversationId) {
      try {
        const conversationStore = require('../services/conversation-store');
        await conversationStore.addMessage(conversationId, 'user', question, {
          sanitized_content: sanitizedQuestion
        });
        await conversationStore.addMessage(conversationId, 'assistant', result.reply, {
          provider: usedProvider,
          quality_score: qualityScore
        });
      } catch (convErr) { }
    }
  }

  if (!result || !result.success) {
    result = { success: true, reply: "I'm currently unable to process your request. Please try again later." };
    usedProvider = 'offline';
  }

  res.json({
    success: true,
    reply: result.reply,
    provider: usedProvider,
    conversationId,
    turnNumber: null,
    analytics: {
      responseTime,
      qualityScore,
      category,
      piiDetected: injectionCheck.detected
    }
  });
}));

module.exports = router;
