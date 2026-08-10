const logger = require('../logger');

function optimizePerformance(metrics) {
  if (!metrics || typeof metrics !== 'object') {
    return { optimized: false, reason: 'No metrics provided' };
  }

  const optimizations = [];

  if (metrics.avgResponseTime > 3000) {
    optimizations.push({ type: 'timeout', suggestion: 'Reduce provider timeout or use faster provider' });
  }

  if (metrics.cacheHitRate < 30) {
    optimizations.push({ type: 'cache', suggestion: 'Increase cache TTL or cache size' });
  }

  if (metrics.errorRate > 0.2) {
    optimizations.push({ type: 'reliability', suggestion: 'Add more fallback providers' });
  }

  return {
    optimized: true,
    optimizations,
    score: Math.max(0, 100 - (metrics.avgResponseTime || 0) / 100 - (metrics.errorRate || 0) * 50)
  };
}

function analyzeBottleneck(metrics) {
  if (!metrics) return { bottleneck: 'unknown' };

  if (metrics.avgResponseTime > 5000) return { bottleneck: 'network', severity: 'high' };
  if (metrics.errorRate > 0.3) return { bottleneck: 'providers', severity: 'high' };
  if (metrics.cacheHitRate < 20) return { bottleneck: 'cache', severity: 'medium' };
  
  return { bottleneck: 'none', severity: 'low' };
}

module.exports = {
  optimizePerformance,
  analyzeBottleneck
};
