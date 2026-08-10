const logger = require('../logger');

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
}

function calculateSimilarity(text1, text2) {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));
  
  const intersection = [...tokens1].filter(t => tokens2.has(t));
  const union = new Set([...tokens1, ...tokens2]);
  
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function extractTopics(text) {
  const words = tokenize(text);
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while', 'although', 'though', 'even', 'that', 'this', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom'];
  
  return words.filter(w => !stopWords.includes(w) && w.length > 2);
}

function getSemanticContext(question, history = []) {
  const topics = extractTopics(question);
  const contextTopics = new Map();
  
  for (const msg of history) {
    const msgTopics = extractTopics(msg.question || msg.content || '');
    for (const topic of msgTopics) {
      contextTopics.set(topic, (contextTopics.get(topic) || 0) + 1);
    }
  }
  
  const relevantTopics = topics.filter(t => contextTopics.has(t));
  
  return {
    currentTopics: topics,
    relevantHistoryTopics: relevantTopics,
    contextStrength: relevantTopics.length / Math.max(topics.length, 1)
  };
}

module.exports = {
  tokenize,
  calculateSimilarity,
  extractTopics,
  getSemanticContext
};
