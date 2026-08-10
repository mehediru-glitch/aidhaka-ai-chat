const fs = require('fs');
const path = require('path');

function loadConfig() {
  let config = {
    providers: {
      groq: process.env.GROQ_API_KEY || '',
      gemini: process.env.GEMINI_API_KEY || '',
      deepseek: process.env.DEEPSEEK_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
      cohere: process.env.COHERE_API_KEY || '',
      pollinations: 'free'
    },
    providerLimits: {
      groq: 43200,
      gemini: 86400,
      deepseek: 50,
      cohere: 100,
      openrouter: 1000,
      pollinations: Infinity
    },
    routing: {
      cacheTTL: 300000,
      semanticCacheSize: 1000,
      providerTimeout: 60000
    },
    security: {
      rateLimitWindow: 15 * 60 * 1000,
      rateLimitMax: 100,
      maxRequestSize: '1mb',
      piiDetection: true,
      promptInjectionDetection: true
    },
    ai: {
      reasoningDepth: process.env.REASONING_DEPTH || 'deep',
      enableStreaming: process.env.ENABLE_STREAMING === 'true',
      enableCodeExecution: process.env.ENABLE_CODE_EXECUTION === 'true',
      enableMultimodal: process.env.ENABLE_MULTIMODAL === 'true',
      maxConversationHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY || '50'),
      cacheTtl: parseInt(process.env.CACHE_TTL || '300000')
    }
  };

  const activeProviders = Object.entries(config.providers)
    .filter(([key, value]) => value && typeof value === 'string' && value.trim() !== '')
    .map(([key]) => key);

  console.log(`Active providers: ${activeProviders.join(', ') || 'none (offline mode)'}`);

  return config;
}

const config = loadConfig();

module.exports = { loadConfig, config };
