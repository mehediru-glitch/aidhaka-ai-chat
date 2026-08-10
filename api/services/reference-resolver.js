const logger = require('../logger');

function resolveReferences(text, context = {}) {
  if (!text || typeof text !== 'string') return text;
  
  const pronouns = {
    'it': 'the subject',
    'they': 'the mentioned entities',
    'them': 'the mentioned entities',
    'this': 'the current topic',
    'that': 'the previous topic',
    'he': 'the person',
    'she': 'the person'
  };
  
  let resolved = text;
  for (const [pronoun, replacement] of Object.entries(pronouns)) {
    const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
    resolved = resolved.replace(regex, replacement);
  }
  
  return resolved;
}

function findRelatedConcepts(text, knowledgeBase = []) {
  if (!text || !knowledgeBase || knowledgeBase.length === 0) return [];
  
  const textLower = text.toLowerCase();
  return knowledgeBase
    .filter(concept => textLower.includes(concept.toLowerCase()))
    .slice(0, 5);
}

function buildContextChain(messages) {
  if (!messages || !Array.isArray(messages)) return [];
  
  return messages.map((msg, idx) => ({
    index: idx,
    role: msg.role,
    preview: (msg.content || '').substring(0, 100),
    timestamp: msg.created_at || null
  }));
}

module.exports = {
  resolveReferences,
  findRelatedConcepts,
  buildContextChain
};
