const logger = require('../logger');

function classifyQuestion(text) {
  if (!text || typeof text !== 'string') {
    return { category: 'unknown', confidence: 0, features: {} };
  }

  const lower = text.toLowerCase();
  const features = {
    length: text.length,
    hasQuestionMark: /\?$/.test(text.trim()),
    wordCount: text.split(/\s+/).length,
    hasCode: /```|function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+/.test(text),
    hasMath: /\d+\s*[\+\-\*\/]\s*\d+|equation|calculate|solve|formula/.test(text),
    hasEmotion: /feel|emotion|happy|sad|angry|love|hate|fear|worry/.test(lower)
  };

  let category = 'general';
  let confidence = 0.5;

  if (features.hasCode) {
    category = 'coding';
    confidence = 0.8;
  } else if (features.hasMath) {
    category = 'math';
    confidence = 0.7;
  } else if (features.hasEmotion) {
    category = 'emotional';
    confidence = 0.6;
  } else if (features.hasQuestionMark) {
    category = 'question';
    confidence = 0.7;
  }

  return { category, confidence, features };
}

function extractFeatures(text) {
  if (!text || typeof text !== 'string') return {};
  
  return {
    length: text.length,
    wordCount: text.split(/\s+/).length,
    sentenceCount: (text.match(/[.!?]+/g) || []).length,
    avgWordLength: text.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / Math.max(text.split(/\s+/).length, 1),
    hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(text),
    uppercaseRatio: (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1)
  };
}

function trainClassifier(text, category, sentiment) {
  logger.debug(`Training classifier with text length ${text?.length || 0}, category: ${category}`);
  return { trained: true, category, sentiment: sentiment?.sentiment || 'neutral' };
}

module.exports = {
  classifyQuestion,
  extractFeatures,
  trainClassifier
};
