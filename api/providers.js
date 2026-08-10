const config = require('./config');

const PROVIDER_TIMEOUT = parseInt(process.env.PROVIDER_TIMEOUT || '60000', 10);

const SYSTEM_PROMPT = `You are Aidhaka AI, the world's most advanced offline-first AI assistant.

CORE PRINCIPLES:
- DEFAULT: Return ALL code in a SINGLE combined file unless user explicitly asks for separate files
- Combine HTML, CSS, JavaScript into one file when possible
- Only split into separate files if user explicitly says "separate files", "split files", or "individual files"
- Keep responses concise, accurate, and helpful
- Use markdown formatting for readability
- Show reasoning steps for complex problems
- Provide examples when explaining concepts
- Be direct and actionable

REASONING APPROACH:
1. Understand the user's intent deeply
2. Break complex problems into steps
3. Show your work for math/logic/coding
4. Self-correct if you notice errors
5. Provide the best possible answer

CAPABILITIES:
- Code generation in any language
- Debugging and optimization
- Creative writing and brainstorming
- Analysis and research synthesis
- Math and logical reasoning
- Multi-language support (English, Bangla, Hindi, etc.)
- Step-by-step explanations
- Architecture and system design
- Data analysis and visualization guidance`;

const providerUsage = {};
const providerHealthData = {};
const dailyUsage = {};
let lastResetDate = new Date().toDateString();

function resetDailyUsageIfNeeded() {
  const currentDate = new Date().toDateString();
  if (currentDate !== lastResetDate) {
    for (const provider of Object.keys(dailyUsage)) {
      dailyUsage[provider] = 0;
    }
    lastResetDate = currentDate;
    console.log('Daily usage counters reset');
  }
}

function getProviderUsage(provider) {
  return dailyUsage[provider] || 0;
}

function incrementProviderUsage(provider) {
  dailyUsage[provider] = (dailyUsage[provider] || 0) + 1;
}

function getProviderHealthScore(provider) {
  const health = providerHealthData[provider];
  if (!health || health.total === 0) return 100;

  const successRate = (health.success / health.total) * 100;
  const avgTime = health.avgResponseTime || 1000;
  const timeScore = Math.max(0, 100 - (avgTime / 100));

  return (successRate * 0.7) + (timeScore * 0.3);
}

function isProviderHealthy(provider) {
  const health = providerHealthData[provider];
  if (!health) return true;

  if (health.consecutiveFailures >= 5) return false;
  if (health.total > 0 && (health.success / health.total) < 0.8) return false;
  if (health.avgResponseTime > 5000) return false;
  return true;
}

function isProviderAvailable(provider) {
  const apiKey = (config.providers || {})[provider];
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') return false;
  if (!isProviderHealthy(provider)) return false;
  return true;
}

function getProviderLimit(provider) {
  const limits = {
    groq: 30,
    gemini: 60,
    deepseek: 50,
    openrouter: 100,
    cohere: 100,
    pollinations: Infinity,
    ollama: Infinity,
    lmstudio: Infinity,
    localai: Infinity
  };
  return limits[provider] || 1000;
}

function isProviderNearLimit(provider) {
  const limit = getProviderLimit(provider);
  if (limit <= 0 || limit === Infinity) return false;
  const usage = getProviderUsage(provider);
  return usage >= limit * 0.9;
}

function getAvailableProviders() {
  const allProviders = ['groq', 'gemini', 'deepseek', 'openrouter', 'cohere', 'pollinations', 'ollama', 'lmstudio', 'localai'];
  return allProviders.filter(p => {
    if (['ollama', 'lmstudio', 'localai', 'pollinations'].includes(p)) {
      return true;
    }
    return isProviderAvailable(p) && !isProviderNearLimit(p);
  });
}

function recordProviderSuccess(provider, responseTime) {
  if (!providerHealthData[provider]) {
    providerHealthData[provider] = {
      total: 0,
      success: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      consecutiveFailures: 0
    };
  }

  const health = providerHealthData[provider];
  health.total++;
  health.success++;
  health.avgResponseTime = ((health.avgResponseTime * (health.total - 1)) + responseTime) / health.total;
  health.minResponseTime = Math.min(health.minResponseTime, responseTime);
  health.maxResponseTime = Math.max(health.maxResponseTime, responseTime);
  health.consecutiveFailures = 0;
}

function recordProviderFailure(provider, error) {
  if (!providerHealthData[provider]) {
    providerHealthData[provider] = {
      total: 0,
      success: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      consecutiveFailures: 0
    };
  }

  const health = providerHealthData[provider];
  health.total++;
  health.consecutiveFailures++;

  console.warn(`Provider ${provider} failure recorded. Consecutive failures: ${health.consecutiveFailures}`);
}

async function callGroq(question) {
  const apiKey = config.providers.groq;
  if (!apiKey) throw new Error('Groq API key not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question }
        ],
        max_tokens: parseInt(process.env.GROQ_MAX_TOKENS || '2048', 10),
        temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.7'),
        top_p: 0.9
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error('Empty response from Groq');

    return reply;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function callGemini(question) {
  const apiKey = config.providers.gemini;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: question }] }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('Empty response from Gemini');

    return reply;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function callDeepSeek(question) {
  const apiKey = config.providers.deepseek;
  if (!apiKey) throw new Error('DeepSeek API key not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question }
        ],
        max_tokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2048', 10),
        temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7')
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error('Empty response from DeepSeek');

    return reply;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function callOpenRouter(question) {
  const apiKey = config.providers.openrouter;
  if (!apiKey) throw new Error('OpenRouter API key not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question }
        ],
        max_tokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '2048', 10),
        temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7')
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error('Empty response from OpenRouter');

    return reply;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function callCohere(question) {
  const apiKey = config.providers.cohere;
  if (!apiKey) throw new Error('Cohere API key not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);

  try {
    const response = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.COHERE_MODEL || 'command-r',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question }
        ],
        max_tokens: parseInt(process.env.COHERE_MAX_TOKENS || '2048', 10),
        temperature: parseFloat(process.env.COHERE_TEMPERATURE || '0.7')
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cohere API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const reply = data.text || data.message?.content;
    if (!reply) throw new Error('Empty response from Cohere');

    return reply;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function callPollinations(question) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);

  try {
    const encodedQuestion = encodeURIComponent(question);
    const response = await fetch(`https://text.pollinations.ai/${encodedQuestion}`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Pollinations API error: ${response.status}`);
    }

    const text = await response.text();
    if (!text) throw new Error('Empty response from Pollinations');

    return text;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

const providerCallers = {
  groq: callGroq,
  gemini: callGemini,
  deepseek: callDeepSeek,
  openrouter: callOpenRouter,
  cohere: callCohere,
  pollinations: callPollinations
};

async function tryProviderWithFallback(question, category, preferredProvider) {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    return { success: false, error: 'No providers available', provider: 'none' };
  }

  let selectedProvider = preferredProvider && providers.includes(preferredProvider) ? preferredProvider : providers[0];

  const errors = [];
  const tryProviders = selectedProvider && providers.includes(selectedProvider)
    ? [selectedProvider, ...providers.filter(p => p !== selectedProvider)]
    : providers;

  for (const provider of tryProviders) {
    if (!isProviderAvailable(provider)) continue;

    try {
      const startTime = Date.now();
      const reply = await providerCallers[provider](question);
      const responseTime = Date.now() - startTime;

      recordProviderSuccess(provider, responseTime);
      incrementProviderUsage(provider);

      return { success: true, reply, provider };
    } catch (error) {
      recordProviderFailure(provider, error.message);
      errors.push({ provider, error: error.message });
      continue;
    }
  }

  return {
    success: false,
    error: `All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(', ')}`,
    provider: 'none'
  };
}

function ensembleProviders(question) {
  const providers = getAvailableProviders();
  return {
    providers,
    selected: providers[0] || 'none',
    count: providers.length
  };
}

module.exports = {
  resetDailyUsageIfNeeded,
  getProviderUsage,
  incrementProviderUsage,
  getProviderHealthScore,
  isProviderHealthy,
  isProviderAvailable,
  getProviderLimit,
  isProviderNearLimit,
  getAvailableProviders,
  recordProviderSuccess,
  recordProviderFailure,
  tryProviderWithFallback,
  ensembleProviders,
  providerHealthData
};
