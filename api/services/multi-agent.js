const logger = require('../logger');

function coordinateAgents(agents, task) {
  if (!agents || !Array.isArray(agents) || agents.length === 0) {
    return { result: null, agentsUsed: [], success: false };
  }

  const results = [];
  
  for (const agent of agents) {
    try {
      const result = agent.execute(task);
      results.push({
        agent: agent.name || 'unknown',
        result,
        success: true
      });
    } catch (error) {
      results.push({
        agent: agent.name || 'unknown',
        error: error.message,
        success: false
      });
    }
  }

  const successful = results.filter(r => r.success);
  const best = successful.length > 0 ? successful[0] : null;

  return {
    result: best?.result || null,
    agentsUsed: agents.map(a => a.name || 'unknown'),
    success: successful.length > 0,
    results
  };
}

function createAgent(name, capabilities = []) {
  return {
    name,
    capabilities,
    execute: (task) => {
      logger.debug(`Agent ${name} executing task`);
      return { status: 'completed', output: `Task processed by ${name}` };
    }
  };
}

function aggregateResponses(responses) {
  if (!responses || !Array.isArray(responses)) return null;
  
  const successful = responses.filter(r => r.success);
  
  if (successful.length === 0) return null;
  
  return {
    content: successful.map(r => r.result).join('\n\n'),
    sources: successful.map(r => r.agent),
    confidence: successful.length / responses.length
  };
}

module.exports = {
  coordinateAgents,
  createAgent,
  aggregateResponses
};
