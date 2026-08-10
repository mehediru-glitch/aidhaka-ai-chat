const logger = require('../logger');

function decomposeQuestion(question) {
  if (!question || typeof question !== 'string') return [];
  
  const steps = [];
  const lower = question.toLowerCase();
  
  if (lower.includes('how')) {
    steps.push({ type: 'method', question: 'What is the method or process?', reasoning: 'User is asking how something works' });
  }
  if (lower.includes('why')) {
    steps.push({ type: 'reason', question: 'What is the reason or cause?', reasoning: 'User is asking for explanation of cause' });
  }
  if (lower.includes('what')) {
    steps.push({ type: 'definition', question: 'What is the definition or concept?', reasoning: 'User is asking for definition' });
  }
  if (lower.includes('compare') || lower.includes('difference')) {
    steps.push({ type: 'comparison', question: 'What are the similarities and differences?', reasoning: 'User wants comparison' });
  }
  if (lower.includes('example') || lower.includes('sample')) {
    steps.push({ type: 'example', question: 'What are concrete examples?', reasoning: 'User wants examples' });
  }
  
  if (steps.length === 0) {
    steps.push({ type: 'general', question: question, reasoning: 'General question' });
  }
  
  return steps;
}

function chainOfThought(question, answer) {
  return {
    question,
    steps: decomposeQuestion(question),
    answer,
    confidence: answer.length > 100 ? 0.8 : 0.5
  };
}

function validateReasoning(steps) {
  if (!steps || !Array.isArray(steps)) return { valid: false, reason: 'No steps provided' };
  
  const validSteps = steps.filter(s => s.type && s.question && s.reasoning);
  
  return {
    valid: validSteps.length > 0,
    reason: validSteps.length > 0 ? 'Valid reasoning chain' : 'Incomplete reasoning steps',
    stepCount: validSteps.length
  };
}

module.exports = {
  decomposeQuestion,
  chainOfThought,
  validateReasoning
};
