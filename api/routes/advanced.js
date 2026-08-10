const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const providers = require('../providers');
const security = require('../security');
const routing = require('../intelligent-routing');
const db = require('../database');
const multiLevelCache = require('../services/multi-level-cache');
const logger = require('../logger');

router.post('/compare-regimes', asyncHandler(async (req, res) => {
  const { income, deductions, regime } = req.body;
  if (!income || !regime) {
    return res.status(400).json({ success: false, error: 'income and regime are required' });
  }

  const results = await routing.compareRegimes(income, deductions || 0, regime);
  res.json({ success: true, data: results });
}));

router.post('/optimize-deductions', asyncHandler(async (req, res) => {
  const { income, regime } = req.body;
  if (!income || !regime) {
    return res.status(400).json({ success: false, error: 'income and regime are required' });
  }

  const optimization = await routing.optimizeDeductions(income, regime);
  res.json({ success: true, data: optimization });
}));

router.get('/cache/stats', asyncHandler(async (req, res) => {
  const stats = await multiLevelCache.getStats();
  res.json({ success: true, stats });
}));

router.post('/cache/clear', asyncHandler(async (req, res) => {
  await multiLevelCache.clearAll();
  res.json({ success: true, message: 'Cache cleared' });
}));

module.exports = router;
