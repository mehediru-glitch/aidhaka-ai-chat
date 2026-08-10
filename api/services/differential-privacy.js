const logger = require('../logger');

function addNoise(data, epsilon = 0.1) {
  if (!data || typeof data !== 'number') return data;
  
  const noise = (Math.random() - 0.5) * 2 * epsilon;
  return data + noise;
}

function anonymizeData(data, fields = []) {
  if (!data || typeof data !== 'object') return data;
  
  const anonymized = { ...data };
  
  for (const field of fields) {
    if (anonymized[field] && typeof anonymized[field] === 'string') {
      anonymized[field] = anonymized[field].substring(0, 3) + '***';
    }
  }
  
  return anonymized;
}

function calculatePrivacyBudget(epsilon, queries = 1) {
  const totalEpsilon = epsilon * queries;
  
  return {
    totalEpsilon,
    remainingBudget: Math.max(0, 1 - totalEpsilon),
    exhausted: totalEpsilon >= 1,
    queriesUsed: queries
  };
}

function protectPII(text) {
  if (!text || typeof text !== 'string') return text;
  
  const patterns = [
    { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
    { regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
    { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
    { regex: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[PHONE]' }
  ];
  
  let protectedText = text;
  for (const pattern of patterns) {
    protectedText = protectedText.replace(pattern.regex, pattern.replacement);
  }
  
  return protectedText;
}

module.exports = {
  addNoise,
  anonymizeData,
  calculatePrivacyBudget,
  protectPII
};
