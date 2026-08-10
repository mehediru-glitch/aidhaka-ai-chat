const logger = require('../logger');

function analyzeSentiment(text) {
  const positive = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'best', 'perfect', 'awesome', 'beautiful', 'nice', 'fantastic', 'superb', 'outstanding'];
  const negative = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 'disappointing', 'angry', 'sad', 'frustrated', 'annoying', 'useless', 'garbage'];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  for (const word of words) {
    if (positive.includes(word)) score++;
    if (negative.includes(word)) score--;
  }

  if (score > 2) return { sentiment: 'positive', score: Math.min(score, 10), label: 'positive' };
  if (score < -2) return { sentiment: 'negative', score: Math.max(score, -10), label: 'negative' };
  return { sentiment: 'neutral', score: 0, label: 'neutral' };
}

function detectEmotion(text) {
  const emotions = {
    joy: ['happy', 'excited', 'great', 'wonderful', 'amazing', 'love', 'fantastic'],
    sadness: ['sad', 'depressed', 'unhappy', 'miserable', 'grief', 'sorrow'],
    anger: ['angry', 'furious', 'annoyed', 'frustrated', 'mad', 'rage'],
    fear: ['scared', 'afraid', 'worried', 'anxious', 'nervous', 'terrified'],
    surprise: ['wow', 'amazing', 'unexpected', 'surprised', 'shocked'],
    disgust: ['disgusting', 'gross', 'awful', 'terrible', 'horrible']
  };

  const lower = text.toLowerCase();
  let bestEmotion = 'neutral';
  let bestCount = 0;

  for (const [emotion, keywords] of Object.entries(emotions)) {
    const count = keywords.filter(kw => lower.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      bestEmotion = emotion;
    }
  }

  return { emotion: bestEmotion, confidence: Math.min(bestCount * 20, 100) };
}

function detectCrisis(text) {
  const crisisPatterns = [
    /suicide/i, /kill\s+myself/i, /end\s+my\s+life/i, /don't\s+want\s+to\s+live/i,
    /hurt\s+myself/i, /self\s+harm/i, /overdose/i
  ];

  for (const pattern of crisisPatterns) {
    if (pattern.test(text)) {
      return { detected: true, level: 'high', pattern: pattern.source };
    }
  }

  return { detected: false, level: 'none', pattern: null };
}

function detectSarcasm(text) {
  const sarcasmIndicators = [
    /yeah\s+right/i, /sure\s+thing/i, /oh\s+great/i, /wonderful/i,
    /as\s+if/i, /obviously/i, /of\s+course\s+not/i
  ];

  const matches = sarcasmIndicators.filter(pattern => pattern.test(text));
  return {
    detected: matches.length > 0,
    confidence: Math.min(matches.length * 30, 100)
  };
}

function getRecommendedTone(sentiment, emotion) {
  if (sentiment.sentiment === 'positive') return 'warm';
  if (sentiment.sentiment === 'negative') {
    if (emotion.emotion === 'anger') return 'calm';
    if (emotion.emotion === 'sadness') return 'empathetic';
    return 'supportive';
  }
  return 'neutral';
}

module.exports = {
  analyzeSentiment,
  detectEmotion,
  detectCrisis,
  detectSarcasm,
  getRecommendedTone
};
