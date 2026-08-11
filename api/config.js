const fs = require('fs');
const path = require('path');

function loadConfig() {
  const config = {
    providers: {
      groq: process.env.GROQ_API_KEY || '',
      gemini: process.env.GEMINI_API_KEY || '',
      deepseek: process.env.DEEPSEEK_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || process.env.OMNIROUTE_API_KEY || '',
      cohere: process.env.COHERE_API_KEY || '',
      pollinations: 'free'
    },
    providerLimits: {
      groq: parseInt(process.env.DAILY_LIMIT_GROQ || '43200', 10),
      gemini: parseInt(process.env.DAILY_LIMIT_GEMINI || '86400', 10),
      deepseek: parseInt(process.env.DAILY_LIMIT_DEEPSEEK || '50', 10),
      cohere: parseInt(process.env.DAILY_LIMIT_COHERE || '100', 10),
      openrouter: parseInt(process.env.DAILY_LIMIT_OPENROUTER || '200', 10),
      pollinations: Infinity
    },
    routing: {
      cacheTTL: parseInt(process.env.CACHE_TTL || '300000', 10),
      semanticCacheSize: 1000,
      providerTimeout: parseInt(process.env.PROVIDER_TIMEOUT || '60000', 10)
    },
    security: {
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      maxRequestSize: process.env.MAX_REQUEST_SIZE || '1048576',
      piiDetection: process.env.ENABLE_PII_DETECTION !== 'false',
      promptInjectionDetection: process.env.ENABLE_PROMPT_INJECTION_DETECTION !== 'false'
    },
    ai: {
      reasoningDepth: process.env.REASONING_DEPTH || 'deep',
      enableStreaming: process.env.ENABLE_STREAMING === 'true',
      enableCodeExecution: process.env.ENABLE_CODE_EXECUTION === 'true',
      enableMultimodal: process.env.ENABLE_MULTIMODAL === 'true',
      maxConversationHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY || '50', 10),
      cacheTtl: parseInt(process.env.CACHE_TTL || '300000', 10)
    }
  };

  const activeProviders = Object.entries(config.providers)
    .filter(([key, value]) => value && typeof value === 'string' && value.trim() !== '')
    .map(([key]) => key);

  console.log(`Active providers: ${activeProviders.join(', ') || 'none (offline mode)'}`);

  return config;
}

const config = loadConfig();

module.exports = loadConfig();
