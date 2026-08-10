const logger = require('../logger');

function generateSummary(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return 'No messages to summarize.';
  }

  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);

  return `Conversation with ${messages.length} messages. ` +
    `${userMessages.length} user messages, ${assistantMessages.length} assistant responses. ` +
    `Topics: ${userMessages.slice(0, 3).map(m => m.substring(0, 50)).join('; ')}.`;
}

function generateTitle(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return 'New Conversation';
  }

  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'New Conversation';

  return firstUserMessage.content.substring(0, 60) + (firstUserMessage.content.length > 60 ? '...' : '');
}

function extractActionItems(messages) {
  if (!messages || !Array.isArray(messages)) return [];
  
  const actionItems = [];
  const actionPatterns = [/please\s+(create|build|make|write|generate|fix|update|delete|add)/i, /can you\s+(create|build|make|write|generate)/i];
  
  for (const message of messages.filter(m => m.role === 'user')) {
    for (const pattern of actionPatterns) {
      if (pattern.test(message.content)) {
        actionItems.push({
          action: message.content.substring(0, 100),
          fromMessage: message.id || null
        });
      }
    }
  }
  
  return actionItems.slice(0, 5);
}

function extractDecisions(messages) {
  if (!messages || !Array.isArray(messages)) return [];
  
  const decisions = [];
  const decisionPatterns = [/decided\s+to/i, /going\s+with/i, /let's\s+use/i, /we\s+should/i, /i\s+will/i];
  
  for (const message of messages.filter(m => m.role === 'assistant')) {
    for (const pattern of decisionPatterns) {
      if (pattern.test(message.content)) {
        decisions.push({
          decision: message.content.substring(0, 100),
          fromMessage: message.id || null
        });
      }
    }
  }
  
  return decisions.slice(0, 5);
}

module.exports = {
  generateSummary,
  generateTitle,
  extractActionItems,
  extractDecisions
};
