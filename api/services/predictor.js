const logger = require('../logger');
const providers = require('../providers');

const modelData = [];

function predictBestProvider(question, healthData) {
  if (!question || typeof question !== 'string') {
    return [{ provider: 'groq', confidence: 0.5, reason: 'default' }];
  }

  const available = providers.getAvailableProviders();
  if (available.length === 0) {
    return [{ provider: 'none', confidence: 0, reason: 'no providers available' }];
  }

  const predictions = available.map(provider => {
    const health = healthData[provider] || {};
    const successRate = health.total > 0 ? health.success / health.total : 1;
    const responseTime = health.avgResponseTime || 1000;
    const score = (successRate * 0.6) + (Math.max(0, 1 - responseTime / 5000) * 0.4);
    
    return {
      provider,
      confidence: Math.round(score * 100) / 100,
      reason: `successRate: ${(successRate * 100).toFixed(1)}%, avgTime: ${responseTime}ms`
    };
  });

  predictions.sort((a, b) => b.confidence - a.confidence);

  return predictions.slice(0, 5);
}

function updatePredictiveModels(questionLength, qualityScore, responseTime) {
  modelData.push({
    questionLength,
    qualityScore,
    responseTime,
    timestamp: Date.now()
  });

  if (modelData.length > 1000) {
    modelData.shift();
  }
}

function getModelStats() {
  if (modelData.length === 0) {
    return { samples: 0, avgQuality: 0, avgResponseTime: 0 };
  }

  const totalQuality = modelData.reduce((sum, m) => sum + m.qualityScore, 0);
  const totalResponseTime = modelData.reduce((sum, m) => sum + m.responseTime, 0);

  return {
    samples: modelData.length,
    avgQuality: Math.round(totalQuality / modelData.length),
    avgResponseTime: Math.round(totalResponseTime / modelData.length)
  };
}

function resetModels() {
  modelData.length = 0;
}

module.exports = {
  predictBestProvider,
  updatePredictiveModels,
  getModelStats,
  resetModels
};
