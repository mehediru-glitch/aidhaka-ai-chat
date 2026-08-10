const logger = require('../logger');

function decomposeQuestion(question) {
  if (!question || typeof question !== 'string') return [];
  
  const steps = [];
  const lower = question.toLowerCase();
  
  if (lower.includes('how')) {
    steps.push({ type: 'method', question: 'What method or process is being asked about?', reasoning: 'How-question requires method explanation' });
  }
  if (lower.includes('why')) {
    steps.push({ type: 'reason', question: 'What is the reason or cause?', reasoning: 'Why-question requires causal explanation' });
  }
  if (lower.includes('what')) {
    steps.push({ type: 'definition', question: 'What is the definition or concept?', reasoning: 'What-question requires definition' });
  }
  
  if (steps.length === 0) {
    steps.push({ type: 'general', question: question, reasoning: 'General question requiring analysis' });
  }
  
  return steps;
}

function classifyIntent(text, history = []) {
  const lower = text.toLowerCase();
  
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(lower)) {
    return { primary: 'greeting', confidence: 0.9, alternatives: [] };
  }
  if (/^(bye|goodbye|see you|later|exit|quit)/i.test(lower)) {
    return { primary: 'farewell', confidence: 0.9, alternatives: [] };
  }
  if (/\?$/.test(text.trim()) || /^(what|how|why|when|where|who|which|explain|describe|tell me)/i.test(lower)) {
    return { primary: 'question', confidence: 0.8, alternatives: ['request'] };
  }
  if (/^(please|can you|could you|would you|help me|i need|i want|generate|create|make|build|write)/i.test(lower)) {
    return { primary: 'request', confidence: 0.7, alternatives: ['question'] };
  }
  if (/^(thanks|thank you|sorry|good|bad|great|terrible|wrong|correct)/i.test(lower)) {
    return { primary: 'feedback', confidence: 0.7, alternatives: [] };
  }
  
  return { primary: 'unknown', confidence: 0.3, alternatives: ['question', 'request'] };
}

function detectMultiIntent(text) {
  if (!text || typeof text !== 'string') return { multi: false, intents: [] };
  
  const intents = [];
  const lower = text.toLowerCase();
  
  if (/\?$/.test(text.trim())) intents.push('question');
  if (/^(please|can you|generate|create|make|build)/i.test(lower)) intents.push('request');
  if (/^(thanks|thank you|sorry|good|bad|great)/i.test(lower)) intents.push('feedback');
  if (/^(hi|hello|hey|good morning|goodbye|bye)/i.test(lower)) intents.push('greeting');
  
  return {
    multi: intents.length > 1,
    intents,
    count: intents.length
  };
}

module.exports = {
  decomposeQuestion,
  classifyIntent,
  detectMultiIntent
};
