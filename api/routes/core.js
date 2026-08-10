const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const providers = require('../providers');
const security = require('../security');
const routing = require('../intelligent-routing');
const db = require('../database');
const logger = require('../logger');

router.get('/health', asyncHandler(async (req, res) => {
  providers.resetDailyUsageIfNeeded();

  const providerStatus = {};
  for (const provider of ['groq', 'gemini', 'deepseek', 'openrouter', 'cohere', 'pollinations', 'ollama', 'lmstudio', 'localai']) {
    providerStatus[provider] = {
      available: providers.isProviderAvailable(provider),
      healthy: providers.isProviderHealthy(provider),
      usage: providers.getProviderUsage(provider),
      healthScore: providers.getProviderHealthScore(provider)
    };
  }

  let databaseStatus = 'disconnected';
  try {
    const dbHealthy = await db.isHealthy();
    databaseStatus = dbHealthy ? 'connected' : 'disconnected';
  } catch (err) {
    databaseStatus = 'disconnected';
  }

  res.json({
    success: true,
    message: 'Aidhaka AI API is running',
    timestamp: new Date().toISOString(),
    mode: 'unlimited',
    status: 'operational',
    database: databaseStatus,
    uptime: process.uptime(),
    providers: providerStatus,
    analytics: routing.getAnalytics()
  });
}));

router.get('/usage', asyncHandler(async (req, res) => {
  providers.resetDailyUsageIfNeeded();

  const usage = {};
  for (const provider of ['groq', 'gemini', 'deepseek', 'openrouter', 'cohere', 'pollinations', 'ollama', 'lmstudio', 'localai']) {
    usage[provider] = {
      daily: providers.getProviderUsage(provider),
      limit: providers.getProviderLimit(provider),
      remaining: providers.getProviderLimit(provider) === Infinity ? 'unlimited' : Math.max(0, providers.getProviderLimit(provider) - providers.getProviderUsage(provider)),
      health: providers.providerHealthData[provider] || null
    };
  }

  res.json({ success: true, usage });
}));

router.get('/routing-categories', (req, res) => {
  const categories = routing.ROUTING_CATEGORIES.map(cat => ({
    id: cat.id,
    name: cat.name,
    primaryProvider: cat.provider,
    keywordCount: cat.keywords.length
  }));

  res.json({ success: true, categories });
});

router.get('/status', asyncHandler(async (req, res) => {
  const providerStatus = {};
  for (const provider of ['groq', 'gemini', 'deepseek', 'openrouter', 'cohere', 'pollinations', 'ollama', 'lmstudio', 'localai']) {
    providerStatus[provider] = {
      health: providers.providerHealthData[provider] || null,
      usage: providers.getProviderUsage(provider),
      limit: providers.getProviderLimit(provider),
      available: providers.isProviderAvailable(provider)
    };
  }

  res.json({
    success: true,
    status: 'operational',
    uptime: process.uptime(),
    providers: providerStatus,
    analytics: routing.getAnalytics()
  });
}));

module.exports = router;
