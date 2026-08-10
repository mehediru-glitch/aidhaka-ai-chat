const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const multiLevelCache = require('../services/multi-level-cache');

router.get('/cache/stats', asyncHandler(async (req, res) => {
  const stats = multiLevelCache.getStats();
  res.json({ success: true, stats });
}));

router.post('/cache/clear', asyncHandler(async (req, res) => {
  multiLevelCache.clear();
  res.json({ success: true, message: 'Cache cleared' });
}));

router.delete('/cache/:key', asyncHandler(async (req, res) => {
  const key = req.params.key;
  await multiLevelCache.invalidate(key);
  res.json({ success: true, message: `Cache key ${key} invalidated` });
}));

module.exports = router;
