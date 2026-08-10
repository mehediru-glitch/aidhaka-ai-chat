const logger = require('../logger');

function calculateWeight(category, provider, metrics = {}) {
  const baseWeight = 1.0;
  const healthBonus = metrics.healthScore ? metrics.healthScore / 100 : 0.5;
  const speedBonus = metrics.responseTime ? Math.max(0, 1 - metrics.responseTime / 5000) : 0.5;
  const reliabilityBonus = metrics.successRate ? metrics.successRate : 0.5;
  
  const weight = baseWeight * (0.4 + healthBonus * 0.3 + speedBonus * 0.2 + reliabilityBonus * 0.1);
  
  return Math.max(0.1, Math.min(2.0, weight));
}

function adjustWeights(weights, feedback) {
  if (!weights || typeof weights !== 'object') return weights;
  
  const adjusted = { ...weights };
  
  for (const [provider, feedbackData] of Object.entries(feedback)) {
    if (adjusted[provider] !== undefined && feedbackData.quality) {
      adjusted[provider] *= (0.9 + feedbackData.quality / 100 * 0.2);
    }
  }
  
  const total = Object.values(adjusted).reduce((sum, w) => sum + w, 0);
  for (const key of Object.keys(adjusted)) {
    adjusted[key] = adjusted[key] / total;
  }
  
  return adjusted;
}

function getOptimalWeights(providers, history = []) {
  const weights = {};
  const providerCount = providers.length || 1;
  
  for (const provider of providers) {
    weights[provider] = 1 / providerCount;
  }
  
  if (history.length > 0) {
    const successCounts = {};
    for (const entry of history) {
      successCounts[entry.provider] = (successCounts[entry.provider] || 0) + (entry.success ? 1 : 0);
    }
    
    for (const provider of providers) {
      const successes = successCounts[provider] || 0;
      weights[provider] = 0.5 + (successes / Math.max(history.length, 1)) * 0.5;
    }
  }
  
  return weights;
}

module.exports = {
  calculateWeight,
  adjustWeights,
  getOptimalWeights
};
