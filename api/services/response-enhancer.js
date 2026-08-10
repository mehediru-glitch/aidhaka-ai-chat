const logger = require('../logger');

function enhanceResponse(question, response, context = {}) {
  if (!response || typeof response !== 'string') {
    return 'I could not generate a response. Please try again.';
  }

  let enhanced = response;

  if (context.provider === 'offline') {
    enhanced = '[Offline Mode] ' + enhanced;
  }

  const lines = enhanced.split('\n');
  if (lines.length > 50) {
    enhanced = lines.slice(0, 50).join('\n') + '\n\n[Response truncated for readability]';
  }

  return enhanced;
}

function improveClarity(response) {
  if (!response) return '';
  
  return response
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function addStructure(response, type = 'general') {
  if (!response) return '';
  
  const structures = {
    code: '```\n' + response + '\n```',
    list: response.split('\n').map(line => '- ' + line).join('\n'),
    general: response
  };
  
  return structures[type] || structures.general;
}

module.exports = {
  enhanceResponse,
  improveClarity,
  addStructure
};
