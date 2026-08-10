const logger = require('./logger');
const security = require('./security');
const db = require('./database');
const wordTokenizer = { tokenize: (text) => text.toLowerCase().split(/\s+/) };

const ROUTING_CATEGORIES = [
  {
    id: 'coding',
    name: 'Coding & Technical',
    provider: 'deepseek',
    keywords: [
      'code', 'program', 'function', 'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'typescript',
      'react', 'vue', 'angular', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'rails',
      'sql', 'database', 'mongodb', 'postgresql', 'mysql', 'redis', 'api', 'rest', 'graphql',
      'debug', 'error', 'bug', 'exception', 'stack trace', 'compile', 'syntax',
      'algorithm', 'data structure', 'linked list', 'binary tree', 'hash map',
      'git', 'github', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'cloud',
      'frontend', 'backend', 'fullstack', 'web development', 'mobile app',
      'sort', 'array', 'object', 'class', 'method', 'variable', 'loop', 'condition',
      'html', 'css', 'sass', 'less', 'webpack', 'vite', 'babel', 'eslint',
      'testing', 'jest', 'mocha', 'cypress', 'selenium', 'unit test', 'integration test',
      'ci/cd', 'devops', 'agile', 'scrum', 'kanban', 'jira', 'confluence',
      'swift', 'kotlin', 'bash', 'shell', 'terminal', 'command', 'cli', 'gui',
      'server', 'client', 'app', 'android', 'ios', 'desktop', 'windows', 'linux', 'mac',
      'software', 'hardware', 'network', 'security', 'encryption', 'authentication', 'authorization'
    ]
  },
  {
    id: 'creative',
    name: 'Creative & Writing',
    provider: 'gemini',
    keywords: [
      'write', 'story', 'poem', 'essay', 'creative', 'blog', 'article', 'content',
      'copywriting', 'marketing', 'advertisement', 'social media', 'post', 'caption',
      'fiction', 'novel', 'character', 'plot', 'dialogue', 'narrative',
      'song', 'lyrics', 'music', 'script', 'screenplay', 'dialogue',
      'imagine', 'dream', 'fantasy', 'describe', 'vivid', 'colorful',
      'creative writing', 'brainstorm', 'ideas', 'inspiration', 'muse'
    ]
  },
  {
    id: 'complex',
    name: 'Complex & Academic',
    provider: 'openrouter',
    keywords: [
      'analyze', 'analysis', 'research', 'paper', 'thesis', 'dissertation',
      'mathematics', 'physics', 'chemistry', 'biology', 'calculus', 'statistics',
      'philosophy', 'psychology', 'sociology', 'economics', 'politics',
      'history', 'literature', 'comparison', 'contrast', 'evaluate',
      'critique', 'review', 'summary', 'abstract', 'methodology',
      'hypothesis', 'theory', 'proof', 'evidence', 'data analysis'
    ]
  },
  {
    id: 'fast',
    name: 'Fast & Summarize',
    provider: 'groq',
    keywords: [
      'summarize', 'summary', 'brief', 'quick', 'fast', 'short',
      'tldr', 'tl;dr', 'overview', 'highlight', 'key points',
      'bullet points', 'concise', 'rapid', 'instant', 'immediate'
    ]
  },
  {
    id: 'generation',
    name: 'Generation & Copywriting',
    provider: 'cohere',
    keywords: [
      'generate', 'create', 'make', 'build', 'compose',
      'email', 'letter', 'proposal', 'report', 'document',
      'template', 'format', 'structure', 'outline',
      'headline', 'title', 'subject line', 'call to action'
    ]
  },
  {
    id: 'multilingual',
    name: 'Multilingual',
    provider: 'deepseek',
    keywords: [
      'translate', 'translation', 'bengali', 'hindi', 'bangla', 'spanish', 'french',
      'german', 'chinese', 'japanese', 'korean', 'arabic', 'portuguese',
      'multilingual', 'language', 'linguistics', 'grammar', 'vocabulary'
    ]
  },
  {
    id: 'tutorial',
    name: 'Tutorial & Learning',
    provider: 'gemini',
    keywords: [
      'learn', 'tutorial', 'guide', 'how to', 'step by step', 'instructions',
      'explain', 'teach', 'lesson', 'course', 'training',
      'beginner', 'intermediate', 'advanced', 'fundamentals',
      'understand', 'concept', 'principle', 'foundation'
    ]
  },
  {
    id: 'business',
    name: 'Business & Professional',
    provider: 'openrouter',
    keywords: [
      'business', 'professional', 'corporate', 'enterprise', 'strategy',
      'meeting', 'presentation', 'proposal', 'pitch', 'sales',
      'marketing', 'branding', 'seo', 'analytics', 'kpi', 'roi',
      'management', 'leadership', 'team', 'project', 'agile',
      'startup', 'funding', 'investment', 'revenue', 'growth'
    ]
  },
  {
    id: 'personal',
    name: 'Personal & Emotional',
    provider: 'gemini',
    keywords: [
      'feel', 'feeling', 'emotion', 'personal', 'relationship', 'advice',
      'help me', 'struggling', 'difficult', 'challenge', 'problem',
      'support', 'encouragement', 'motivation', 'inspiration',
      'life', 'career', 'future', 'decision', 'choice'
    ]
  },
  {
    id: 'fun',
    name: 'Fun & Casual',
    provider: 'groq',
    keywords: [
      'joke', 'funny', 'humor', 'entertainment', 'game', 'play',
      'casual', 'chat', 'talk', 'conversation', 'friend',
      'movie', 'book', 'recommendation', 'suggestion',
      'trivia', 'quiz', 'riddle', 'puzzle', 'brain teaser'
    ]
  }
];

const analytics = {
  totalRequests: 0,
  cacheHits: 0,
  categoryDistribution: {},
  providerUsage: {},
  avgResponseTime: 0,
  totalResponseTime: 0
};

const semanticCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

function getAnalytics() {
  return {
    totalRequests: analytics.totalRequests,
    cacheHitRate: analytics.totalRequests > 0 ? ((analytics.cacheHits / analytics.totalRequests) * 100).toFixed(1) : '0.0',
    avgResponseTime: analytics.totalRequests > 0 ? Math.round(analytics.totalResponseTime / analytics.totalRequests) : 0,
    topCategories: Object.entries(analytics.categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    topProviders: Object.entries(analytics.providerUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  };
}

function updateAnalytics(category, provider, responseTime) {
  analytics.totalRequests++;
  analytics.totalResponseTime += responseTime || 0;
  analytics.categoryDistribution[category] = (analytics.categoryDistribution[category] || 0) + 1;
  analytics.providerUsage[provider] = (analytics.providerUsage[provider] || 0) + 1;
}

function tokenize(text) {
  return wordTokenizer.tokenize(text);
}

function calculateConfidence(question, category) {
  const tokens = tokenize(question);
  const keywords = category.keywords || [];
  const matches = tokens.filter(token => keywords.some(kw => token.includes(kw) || kw.includes(token)));
  const baseScore = (matches.length / Math.max(tokens.length, 1)) * 100;
  const lengthBonus = Math.min(question.length / 100, 10);
  return Math.min(baseScore + lengthBonus, 100);
}

function selectProviderByQuestion(question) {
  const tokens = tokenize(question);
  let bestCategory = null;
  let bestScore = 0;

  for (const category of ROUTING_CATEGORIES) {
    const score = calculateConfidence(question, category);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  if (!bestCategory || bestScore < 10) {
    return { category: { id: 'default', name: 'Default' }, provider: 'groq', confidence: 0 };
  }

  return {
    category: bestCategory,
    provider: bestCategory.provider,
    confidence: bestScore
  };
}

function getCacheKey(question) {
  return security.hashString(question);
}

function getCachedResponse(question) {
  const key = getCacheKey(question);
  const cached = semanticCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    semanticCache.delete(key);
    return null;
  }

  analytics.cacheHits++;
  return cached;
}

function setCachedResponse(question, response, provider, category) {
  if (semanticCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = semanticCache.keys().next().value;
    semanticCache.delete(oldestKey);
  }

  const key = getCacheKey(question);
  semanticCache.set(key, {
    response,
    provider,
    category,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_TTL
  });
}

function scoreResponseQuality(question, response) {
  if (!response || response.length < 10) return 20;
  if (response.length > 1000) return 90;
  if (response.length > 500) return 80;
  if (response.length > 200) return 70;
  return 50;
}

function getOfflineResponse(question, history) {
  const responses = [
    "I'm currently running in offline mode. Please configure an AI provider API key to enable full responses.",
    "I'm in offline mode right now. Add a Groq, Gemini, or DeepSeek API key to unlock my full capabilities.",
    "I don't have access to AI providers at the moment. Please check back later or contact support."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function compareRegimes(income, deductions, regime) {
  return {
    oldRegime: { tax: 0, effectiveRate: 0 },
    newRegime: { tax: 0, effectiveRate: 0 },
    recommendation: regime === 'new' ? 'new' : 'old'
  };
}

function optimizeDeductions(income, currentDeductions) {
  return {
    optimizedDeductions: currentDeductions,
    potentialSavings: 0,
    recommendations: []
  };
}

module.exports = {
  ROUTING_CATEGORIES,
  analytics,
  getAnalytics,
  updateAnalytics,
  tokenize,
  calculateConfidence,
  selectProviderByQuestion,
  getCacheKey,
  getCachedResponse,
  setCachedResponse,
  scoreResponseQuality,
  getOfflineResponse,
  compareRegimes,
  optimizeDeductions
};
