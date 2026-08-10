const logger = require('../logger');

function monitorResponse(question, response, metrics) {
  return {
    quality: assessQuality(response),
    completeness: assessCompleteness(question, response),
    relevance: assessRelevance(question, response),
    suggestions: generateSuggestions(metrics)
  };
}

function assessQuality(response) {
  if (!response) return 0;
  
  let score = 50;
  if (response.length > 100) score += 20;
  if (response.length > 500) score += 10;
  if (response.includes('```')) score += 10;
  if (response.includes('\n')) score += 10;
  
  return Math.min(score, 100);
}

function assessCompleteness(question, response) {
  if (!question || !response) return 0;
  
  const questionWords = question.toLowerCase().split(/\s+/);
  const responseLower = response.toLowerCase();
  const matchedWords = questionWords.filter(w => responseLower.includes(w) && w.length > 3);
  
  return questionWords.length > 0 ? Math.round((matchedWords.length / questionWords.length) * 100) : 0;
}

function assessRelevance(question, response) {
  return assessCompleteness(question, response);
}

function generateSuggestions(metrics) {
  const suggestions = [];
  
  if (!metrics) return suggestions;
  
  if (metrics.quality < 60) {
    suggestions.push('Consider using a more capable provider');
  }
  if (metrics.completeness < 50) {
    suggestions.push('Response may be incomplete, consider follow-up');
  }
  if (metrics.responseTime > 5000) {
    suggestions.push('Response took too long, consider timeout adjustment');
  }
  
  return suggestions;
}

function selfCorrect(response, originalQuestion) {
  if (!response) return 'No response to correct.';
  
  let corrected = response;
  
  if (corrected.length < 20) {
    corrected += ' Let me provide more details.';
  }
  
  return corrected;
}

module.exports = {
  monitorResponse,
  assessQuality,
  assessCompleteness,
  assessRelevance,
  generateSuggestions,
  selfCorrect
};
