const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const providers = require('../providers');
const security = require('../security');
const routing = require('../intelligent-routing');
const db = require('../database');
const logger = require('../logger');
const conversationStore = require('../services/conversation-store');
const multiLevelCache = require('../services/multi-level-cache');

router.post('/chat', asyncHandler(async (req, res) => {
  const requestId = req.id;
  const clientIp = req.ip || req.connection.remoteAddress;

  const { question, provider, user_id, history } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    throw new AidhakaError('Message cannot be empty', 400, 'EMPTY_MESSAGE');
  }

  if (question.length > 10000) {
    throw new AidhakaError('Message too long', 400, 'MESSAGE_TOO_LONG');
  }

  let conversation = null;
  let conversationId = null;
  let recentMessages = [];

  if (user_id) {
    try {
      const sessionId = req.id;
      const existing = await conversationStore.getConversationBySession(sessionId);
      if (existing) {
        conversation = existing;
        conversationId = existing.id;
        recentMessages = await conversationStore.getRecentMessages(existing.id, 10);
      } else {
        conversation = await conversationStore.createConversation(user_id, sessionId);
        conversationId = conversation.id;
      }
    } catch (err) {
      logger.warn(`[${requestId}] Conversation store error:`, err.message);
    }
  }

  let result;
  let usedProvider = 'offline';
  let responseTime = 0;
  let qualityScore = 0;
  let category = 'unknown';

  providers.resetDailyUsageIfNeeded();
  const startTime = Date.now();

  const effectiveQuestion = question;

  const injectionCheck = security.detectPromptInjection(effectiveQuestion);
  if (injectionCheck.detected) {
    logger.warn(`[${requestId}] Prompt injection detected: ${injectionCheck.type}`);
    throw new AidhakaError('Invalid request detected', 400, 'PROMPT_INJECTION');
  }

  const piiCheck = security.detectAndRedactPII(effectiveQuestion);
  const sanitizedQuestion = piiCheck.hasPII ? piiCheck.question : security.sanitizeInput(effectiveQuestion);

  const cacheKey = `chat:${security.hashString(sanitizedQuestion)}`;
  const cachedResponse = await multiLevelCache.get(cacheKey);
  if (cachedResponse && !provider) {
    return res.json({
      success: true,
      reply: cachedResponse.reply,
      provider: cachedResponse.provider,
      cached: true,
      analytics: {
        responseTime: 0,
        qualityScore: cachedResponse.qualityScore,
        category: cachedResponse.category
      }
    });
  }

  if (provider && ['groq', 'gemini', 'deepseek', 'openrouter', 'cohere', 'pollinations', 'ollama', 'lmstudio', 'localai'].includes(provider)) {
    try {
      const reply = await providers.tryProviderWithFallback(sanitizedQuestion, 'forced', provider);
      if (!reply.success) {
        throw new Error(reply.error);
      }

      qualityScore = routing.scoreResponseQuality(sanitizedQuestion, reply.reply);
      category = 'forced';

      if (qualityScore > 60) {
        multiLevelCache.set(cacheKey, {
          reply: reply.reply,
          provider: reply.provider,
          qualityScore,
          category
        }, 300000);
      }

      result = { success: true, reply: reply.reply.trim() };
      usedProvider = reply.provider;
      responseTime = Date.now() - startTime;
      logger.info(`[${requestId}] Forced provider ${provider} succeeded via ${usedProvider} (quality: ${qualityScore}%)`);
    } catch (err) {
      logger.error(`[${requestId}] Forced provider ${provider} failed:`, err.message);
      result = routing.getOfflineResponse(sanitizedQuestion, history || []);
      usedProvider = 'offline';
    }
  } else {
    try {
      const selected = routing.selectProviderByQuestion(sanitizedQuestion);
      category = selected.category?.id || 'default';
      const preferredProvider = selected.provider;

      const reply = await providers.tryProviderWithFallback(sanitizedQuestion, category, preferredProvider);
      if (!reply.success) {
        throw new Error(reply.error);
      }

      qualityScore = routing.scoreResponseQuality(sanitizedQuestion, reply.reply);
      responseTime = Date.now() - startTime;

      if (qualityScore > 60) {
        multiLevelCache.set(cacheKey, {
          reply: reply.reply,
          provider: reply.provider,
          qualityScore,
          category
        }, 300000);
      }

      result = { success: true, reply: reply.reply.trim() };
      usedProvider = reply.provider;
      logger.info(`[${requestId}] Smart routing: ${usedProvider} (category: ${category}, quality: ${qualityScore}%)`);
    } catch (err) {
      logger.error(`[${requestId}] Online AI failed:`, err.message);
      result = routing.getOfflineResponse(sanitizedQuestion, history || []);
      usedProvider = 'offline';
    }
  }

  if (user_id && result && result.success) {
    try {
      await db.run(
        'INSERT INTO routing_history (session_id, question_hash, question, selected_provider, category, quality_score, response_time, success) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user_id, security.hashString(sanitizedQuestion), sanitizedQuestion, usedProvider, category, qualityScore, responseTime, 1]
      );
    } catch (dbErr) {
      logger.error(`[${requestId}] DB save error:`, dbErr.message);
    }

    if (conversationId) {
      try {
        await conversationStore.addMessage(conversationId, 'user', question, {
          sanitized_content: sanitizedQuestion
        });

        await conversationStore.addMessage(conversationId, 'assistant', result.reply, {
          provider: usedProvider,
          quality_score: qualityScore
        });
      } catch (convErr) {
        logger.error(`[${requestId}] Conversation save error:`, convErr.message);
      }
    }
  }

  if (!result || !result.success) {
    throw new AidhakaError('Something went wrong. Please try again.', 500, 'CHAT_ERROR');
  }

  res.json({
    success: true,
    reply: result.reply,
    provider: usedProvider,
    conversationId,
    turnNumber: conversation ? (conversation.turn_count || 0) + 1 : null,
    analytics: {
      responseTime,
      qualityScore,
      category,
      piiDetected: piiCheck.hasPII
    }
  });
}));

module.exports = router;
