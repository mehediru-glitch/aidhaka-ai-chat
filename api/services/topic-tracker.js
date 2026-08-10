const logger = require('../logger');

function trackTopic(conversationId, topic, confidence = 1.0) {
  logger.debug(`Tracking topic: ${topic} in conversation ${conversationId}`);
  return { conversationId, topic, confidence, tracked: true };
}

function getConversationTopics(conversationId, messages = []) {
  if (!messages || messages.length === 0) return [];
  
  const topicFrequency = new Map();
  
  for (const msg of messages) {
    const words = (msg.content || '').toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 4) {
        topicFrequency.set(word, (topicFrequency.get(word) || 0) + 1);
      }
    }
  }
  
  return [...topicFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));
}

function updateTopicMentions(conversationId, topics = []) {
  return topics.map(topic => ({
    ...topic,
    lastMentionedAt: new Date().toISOString()
  }));
}

function suggestTopics(conversationId, currentMessage, history = []) {
  const currentTopics = currentMessage.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const historyTopics = new Set();
  
  for (const msg of history) {
    const words = (msg.content || '').toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 4) historyTopics.add(word);
    }
  }
  
  return currentTopics.filter(t => !historyTopics.has(t)).slice(0, 5);
}

module.exports = {
  trackTopic,
  getConversationTopics,
  updateTopicMentions,
  suggestTopics
};
