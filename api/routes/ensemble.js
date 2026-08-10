const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const providers = require('../providers');
const routing = require('../intelligent-routing');
const logger = require('../logger');

router.post('/ensemble', asyncHandler(async (req, res) => {
  const requestId = req.id;
  const { question, providers: providerList, category } = req.body;
  
  if (!question || typeof question !== 'string' || !question.trim()) {
    throw new AidhakaError('Message cannot be empty', 400, 'EMPTY_MESSAGE');
  }
  
  if (question.length > 10000) {
    throw new AidhakaError('Message too long', 400, 'MESSAGE_TOO_LONG');
  }
  
  const availableProviders = providers.getAvailableProviders();
  if (availableProviders.length < 2) {
    throw new AidhakaError('At least 2 providers required for ensemble', 400, 'INSUFFICIENT_PROVIDERS');
  }
  
  const selectedProviders = providerList && Array.isArray(providerList)
    ? providerList.filter(p => availableProviders.includes(p))
    : availableProviders.slice(0, 3);
  
  if (selectedProviders.length < 2) {
    throw new AidhakaError('At least 2 providers required for ensemble', 400, 'INSUFFICIENT_PROVIDERS');
  }
  
  const startTime = Date.now();
  const responses = [];
  const responseProviders = [];
  
  for (const provider of selectedProviders) {
    try {
      const result = await providers.tryProviderWithFallback(question, category || 'unknown', provider);
      if (result.success) {
        responses.push(result.reply);
        responseProviders.push(provider);
      }
    } catch (err) {
      logger.warn(`[${requestId}] Ensemble provider ${provider} failed:`, err.message);
    }
  }
  
  if (responses.length === 0) {
    throw new AidhakaError('All ensemble providers failed', 500, 'ENSEMBLE_ERROR');
  }
  
  const scored = responses.map((reply, idx) => ({
    provider: responseProviders[idx],
    reply,
    quality: routing.scoreResponseQuality(question, reply)
  }));
  
  const best = scored.reduce((a, b) => a.quality > b.quality ? a : b);
  const avgQuality = scored.reduce((sum, s) => sum + s.quality, 0) / scored.length;
  const responseTime = Date.now() - startTime;
  
  res.json({
    success: true,
    reply: best.reply,
    provider: 'ensemble',
    bestProvider: best.provider,
    responses: scored,
    analytics: {
      responseTime,
      avgQuality: Math.round(avgQuality),
      bestQuality: best.quality,
      providerCount: scored.length,
      providerScores: scored.map(s => ({ provider: s.provider, quality: s.quality }))
    }
  });
}));

module.exports = router;
