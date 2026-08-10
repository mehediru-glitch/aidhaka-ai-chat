const logger = require('../logger');

const qTable = new Map();
const learningRate = 0.1;
const discountFactor = 0.9;
const epsilon = 0.1;

function getStateKey(question, category) {
  return `${category}:${question.substring(0, 50)}`;
}

function getActionKey(provider) {
  return `provider:${provider}`;
}

function getQValue(stateKey, actionKey) {
  const fullKey = `${stateKey}->${actionKey}`;
  return qTable.get(fullKey) || 0;
}

function setQValue(stateKey, actionKey, value) {
  const fullKey = `${stateKey}->${actionKey}`;
  qTable.set(fullKey, value);
}

function chooseAction(stateKey, availableProviders) {
  if (Math.random() < epsilon) {
    return availableProviders[Math.floor(Math.random() * availableProviders.length)];
  }

  let bestAction = availableProviders[0];
  let bestValue = getQValue(stateKey, getActionKey(bestAction));

  for (const provider of availableProviders) {
    const value = getQValue(stateKey, getActionKey(provider));
    if (value > bestValue) {
      bestValue = value;
      bestAction = provider;
    }
  }

  return bestAction;
}

function updateQValue(stateKey, actionKey, reward, nextStateKey, nextAvailableProviders) {
  const currentQ = getQValue(stateKey, actionKey);
  const maxNextQ = nextAvailableProviders.reduce((max, p) => {
    const q = getQValue(nextStateKey, getActionKey(p));
    return Math.max(max, q);
  }, 0);

  const newQ = currentQ + learningRate * (reward + discountFactor * maxNextQ - currentQ);
  setQValue(stateKey, actionKey, newQ);
}

function learnFromInteraction(question, provider, qualityScore, responseTime) {
  const stateKey = getStateKey(question, 'default');
  const actionKey = getActionKey(provider);
  const reward = (qualityScore / 100) * (1 - Math.min(responseTime / 10000, 1));
  
  updateQValue(stateKey, actionKey, reward, stateKey, ['groq', 'gemini', 'deepseek', 'openrouter', 'cohere']);
}

function getBestProvider(question, category = 'default') {
  const stateKey = getStateKey(question, category);
  const providers = ['groq', 'gemini', 'deepseek', 'openrouter', 'cohere'];
  
  return chooseAction(stateKey, providers);
}

function exportQTable() {
  return Object.fromEntries(qTable);
}

function importQTable(data) {
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      qTable.set(key, value);
    }
  }
}

module.exports = {
  getQValue,
  setQValue,
  chooseAction,
  updateQValue,
  learnFromInteraction,
  getBestProvider,
  exportQTable,
  importQTable
};
