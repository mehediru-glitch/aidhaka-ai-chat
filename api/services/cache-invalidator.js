const logger = require('../logger');

function invalidateByPattern(pattern) {
  logger.debug(`Invalidating cache entries matching pattern: ${pattern}`);
  return { invalidated: 0, pattern };
}

function invalidateByTag(tag) {
  logger.debug(`Invalidating cache entries with tag: ${tag}`);
  return { invalidated: 0, tag };
}

function invalidateStale(maxAge) {
  logger.debug(`Invalidating cache entries older than ${maxAge}ms`);
  return { invalidated: 0, maxAge };
}

function setupInvalidationRules(rules) {
  logger.debug(`Setting up ${rules.length} invalidation rules`);
  return { rules: rules.length };
}

module.exports = {
  invalidateByPattern,
  invalidateByTag,
  invalidateStale,
  setupInvalidationRules
};
