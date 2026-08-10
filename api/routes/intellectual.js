const express = require('express');
const router = express.Router();
const { asyncHandler, AidhakaError } = require('../errors');
const sentimentAnalyzer = require('../services/sentiment-analyzer');
const intentClassifier = require('../services/intent-classifier');
const reasoningEngine = require('../services/reasoning-engine');
const predictor = require('../services/predictor');
const bandit = require('../services/bandit');
const mlClassifier = require('../services/ml-classifier');
const ConversationHMM = require('../services/hmm');
const providers = require('../providers');
const routing = require('../intelligent-routing');
const security = require('../security');
const logger = require('../logger');

const conversationStates = new Map();

/**
 * GET /api/sentiment
 * Analyze sentiment and emotions of text
 * Query params: text (required)
 */
router.get('/sentiment', asyncHandler(async (req, res) => {
  const { text } = req.query;
  
  if (!text || typeof text !== 'string') {
    throw new AidhakaError('Text query parameter is required', 400, 'MISSING_TEXT');
  }
  
  const sentiment = sentimentAnalyzer.analyzeSentiment(text);
  const emotion = sentimentAnalyzer.detectEmotion(text);
  const crisis = sentimentAnalyzer.detectCrisis(text);
  const sarcasm = sentimentAnalyzer.detectSarcasm(text);
  const tone = sentimentAnalyzer.getRecommendedTone(sentiment, emotion);
  
  res.json({
    success: true,
    sentiment,
    emotion,
    crisis,
    sarcasm,
    recommendedTone: tone,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/intent
 * Classify intent of a question
 * Body: { text, history? }
 */
router.post('/intent', asyncHandler(async (req, res) => {
  const { text, history } = req.body;
  
  if (!text || typeof text !== 'string') {
    throw new AidhakaError('Text body field is required', 400, 'MISSING_TEXT');
  }
  
  const intent = intentClassifier.classifyIntent(text, history || []);
  const multiIntent = intentClassifier.detectMultiIntent(text);
  const mlResult = mlClassifier.classifyQuestion(text);
  
  res.json({
    success: true,
    intent,
    multiIntent,
    mlClassification: mlResult,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/reason
 * Show reasoning steps for a routing decision
 * Query params: q (required)
 */
router.get('/reason', asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    throw new AidhakaError('Query parameter "q" is required', 400, 'MISSING_QUERY');
  }
  
  const question = String(q);
  const subQuestions = reasoningEngine.decomposeQuestion(question);
  const routingDecision = routing.selectProviderByQuestion(question);
  const predictions = predictor.predictBestProvider(question, providers.providerHealthData);
  const intent = intentClassifier.classifyIntent(question);
  
  const reasoningSteps = subQuestions.map((sq, i) => ({
    step: i + 1,
    type: sq.type,
    question: sq.question,
    reasoning: sq.reasoning,
    assignedProvider: routingDecision.provider,
    confidence: routingDecision.confidence
  }));
  
  res.json({
    success: true,
    question,
    reasoningSteps,
    finalDecision: {
      provider: routingDecision.provider,
      confidence: routingDecision.confidence,
      category: routingDecision.category?.name || 'Unknown',
      predictions: predictions.slice(0, 3)
    },
    intent: intent.primary,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/context
 * Manage conversation context
 * Body: { session_id, action, data? }
 * Actions: get, set, update, reset
 */
router.post('/context', asyncHandler(async (req, res) => {
  const { session_id, action, data } = req.body;
  
  if (!session_id || !action) {
    throw new AidhakaError('session_id and action are required', 400, 'MISSING_FIELDS');
  }
  
  let hmm = conversationStates.get(session_id);
  
  if (action === 'reset') {
    if (hmm) {
      hmm.reset();
    }
    conversationStates.delete(session_id);
    return res.json({ success: true, message: 'Context reset', context: null });
  }
  
  if (!hmm) {
    hmm = new ConversationHMM();
    conversationStates.set(session_id, hmm);
  }
  
  if (action === 'get') {
    const context = hmm.getContext();
    return res.json({ success: true, context });
  }
  
  if (action === 'update' && data && data.input) {
    const prevState = hmm.stateHistory.length > 0 ? hmm.stateHistory[hmm.stateHistory.length - 1].state : null;
    const newState = hmm.recordTransition(data.input, prevState);
    const context = hmm.getContext();
    
    return res.json({
      success: true,
      updated: true,
      currentState: newState,
      context
    });
  }
  
  if (action === 'set' && data) {
    if (data.state) {
      hmm.stateHistory.push({
        state: data.state,
        input: data.input || '',
        timestamp: Date.now()
      });
    }
    return res.json({ success: true, context: hmm.getContext() });
  }
  
  throw new AidhakaError(`Unknown action: ${action}`, 400, 'INVALID_ACTION');
}));

/**
 * GET /api/context
 * Get conversation context by session ID
 * Query params: session_id (required)
 */
router.get('/context', asyncHandler(async (req, res) => {
  const { session_id } = req.query;
  
  if (!session_id) {
    throw new AidhakaError('session_id query parameter is required', 400, 'MISSING_SESSION_ID');
  }
  
  const hmm = conversationStates.get(session_id);
  
  if (!hmm) {
    return res.json({
      success: true,
      context: {
        currentState: 'greeting',
        turnCount: 0,
        duration: 0,
        stateDistribution: {}
      },
      exists: false
    });
  }
  
  res.json({
    success: true,
    context: hmm.getContext(),
    exists: true
  });
}));

/**
 * GET /api/predict
 * Predict which provider would be best for a question
 * Query params: q (required)
 */
router.get('/predict', asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    throw new AidhakaError('Query parameter "q" is required', 400, 'MISSING_QUERY');
  }
  
  const question = String(q);
  const predictions = predictor.predictBestProvider(question, providers.providerHealthData);
  
  res.json({
    success: true,
    question,
    predictions,
    bestProvider: predictions[0],
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/learn/feedback
 * Submit detailed learning feedback
 * Body: { question, provider, quality_score, user_satisfaction, success, response_time?, category? }
 */
router.post('/learn/feedback', asyncHandler(async (req, res) => {
  const { question, provider, quality_score, user_satisfaction, success, response_time, category } = req.body;
  
  if (!question || !provider || quality_score === undefined) {
    throw new AidhakaError('question, provider, and quality_score are required', 400, 'MISSING_FIELDS');
  }
  
  const intent = intentClassifier.classifyIntent(question);
  const sentiment = sentimentAnalyzer.analyzeSentiment(question);
  
  mlClassifier.trainClassifier(question, category || intent.primary, sentiment);
  
  if (response_time) {
    predictor.updatePredictiveModels(question.length, quality_score, response_time);
  }
  
  providers.recordProviderSuccess(provider, response_time || 1000);
  
  res.json({
    success: true,
    message: 'Learning feedback recorded',
    learned: {
      intent: intent.primary,
      sentiment: sentiment.label,
      modelUpdated: true
    }
  });
}));

module.exports = router;