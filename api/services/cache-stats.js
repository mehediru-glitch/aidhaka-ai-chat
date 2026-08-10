const logger = require('../logger');

function getStats() {
  return {
    totalEntries: 0,
    activeEntries: 0,
    expiredEntries: 0,
    hitRate: 0,
    missRate: 0
  };
}

function getHitRate() {
  return 0;
}

function getMissRate() {
  return 0;
}

function getMemoryUsage() {
  return {
    heapUsed: 0,
    heapTotal: 0,
    external: 0
  };
}

module.exports = {
  getStats,
  getHitRate,
  getMissRate,
  getMemoryUsage
};
