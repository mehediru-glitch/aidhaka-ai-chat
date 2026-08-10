const logger = require('../logger');

function assessClarity(message) {
  if (!message || typeof message !== 'string') {
    return { clear: false, ambiguousTerms: [], reason: 'Empty message' };
  }

  const ambiguousTerms = [
    'it', 'this', 'that', 'they', 'them', 'stuff', 'things',
    'some', 'many', 'few', 'several', 'various', 'certain'
  ];

  const lower = message.toLowerCase();
  const found = ambiguousTerms.filter(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    const matches = lower.match(regex);
    return matches && matches.length > 0;
  });

  const clarityScore = found.length === 0 ? 100 : Math.max(0, 100 - found.length * 15);

  return {
    clear: clarityScore > 60,
    ambiguousTerms: found,
    clarityScore,
    reason: clarityScore > 60 ? 'Message is clear' : 'Message contains ambiguous terms'
  };
}

function needsClarification(message, history = []) {
  const assessment = assessClarity(message);
  
  if (!assessment.clear) {
    return {
      needsClarification: true,
      reason: assessment.reason,
      ambiguousTerms: assessment.ambiguousTerms
    };
  }

  if (message.length < 5) {
    return {
      needsClarification: true,
      reason: 'Message too short to understand',
      ambiguousTerms: []
    };
  }

  return {
    needsClarification: false,
    reason: 'Message is clear enough',
    ambiguousTerms: []
  };
}

function generateClarification(message, ambiguousTerms, history = []) {
  if (!ambiguousTerms || ambiguousTerms.length === 0) {
    return 'Could you please provide more details?';
  }

  const term = ambiguousTerms[0];
  const questions = {
    'it': 'What specifically are you referring to?',
    'this': 'Could you clarify what "this" refers to?',
    'that': 'What exactly do you mean by "that"?',
    'they': 'Who specifically are you referring to?',
    'stuff': 'What specific items or topics are you referring to?',
    'things': 'What specific things do you mean?'
  };

  return questions[term] || `Could you clarify what you mean by "${term}"?`;
}

function suggestFollowUp(message, response) {
  if (!message || !response) return [];
  
  const suggestions = [];
  const lower = message.toLowerCase();
  
  if (lower.includes('how')) {
    suggestions.push('Would you like a step-by-step guide?');
  }
  if (lower.includes('what')) {
    suggestions.push('Do you need more details or examples?');
  }
  if (response.length < 100) {
    suggestions.push('Would you like me to elaborate?');
  }
  
  return suggestions.slice(0, 3);
}

module.exports = {
  assessClarity,
  needsClarification,
  generateClarification,
  suggestFollowUp
};
