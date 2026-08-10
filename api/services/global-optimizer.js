const logger = require('../logger');

function optimizePortfolio(assets, riskTolerance = 'moderate') {
  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    return { portfolio: [], expectedReturn: 0, risk: 0 };
  }

  const weights = assets.map(() => 1 / assets.length);
  
  return {
    portfolio: assets.map((asset, i) => ({
      ...asset,
      weight: weights[i]
    })),
    expectedReturn: 0.07,
    risk: riskTolerance === 'high' ? 0.15 : riskTolerance === 'low' ? 0.05 : 0.10,
    sharpeRatio: 1.2
  };
}

function calculateRisk(portfolio) {
  if (!portfolio || !Array.isArray(portfolio)) return { risk: 0, level: 'none' };
  
  const volatility = portfolio.reduce((sum, asset) => sum + (asset.volatility || 0.1), 0) / portfolio.length;
  
  let level = 'low';
  if (volatility > 0.2) level = 'high';
  else if (volatility > 0.1) level = 'moderate';
  
  return { risk: volatility, level };
}

function suggestAllocation(riskTolerance, investmentAmount) {
  const allocations = {
    low: { stocks: 0.3, bonds: 0.5, cash: 0.2 },
    moderate: { stocks: 0.6, bonds: 0.3, cash: 0.1 },
    high: { stocks: 0.8, bonds: 0.15, cash: 0.05 }
  };

  const allocation = allocations[riskTolerance] || allocations.moderate;
  
  return {
    allocation,
    amounts: {
      stocks: investmentAmount * allocation.stocks,
      bonds: investmentAmount * allocation.bonds,
      cash: investmentAmount * allocation.cash
    }
  };
}

module.exports = {
  optimizePortfolio,
  calculateRisk,
  suggestAllocation
};
