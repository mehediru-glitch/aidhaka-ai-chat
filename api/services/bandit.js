const logger = require('../logger');

const banditState = {
  arms: {},
  totalPulls: 0
};

function selectArm(arms, context = {}) {
  if (!arms || arms.length === 0) return null;
  
  const epsilon = 0.1;
  
  if (Math.random() < epsilon) {
    return arms[Math.floor(Math.random() * arms.length)];
  }

  let bestArm = arms[0];
  let bestValue = getArmValue(arms[0]);

  for (let i = 1; i < arms.length; i++) {
    const value = getArmValue(arms[i]);
    if (value > bestValue) {
      bestValue = value;
      bestArm = arms[i];
    }
  }

  return bestArm;
}

function updateArm(arm, reward) {
  if (!banditState.arms[arm]) {
    banditState.arms[arm] = { pulls: 0, totalReward: 0, avgReward: 0 };
  }

  const state = banditState.arms[arm];
  state.pulls++;
  state.totalReward += reward;
  state.avgReward = state.totalReward / state.pulls;
  banditState.totalPulls++;

  logger.debug(`Bandit arm ${arm} updated: pulls=${state.pulls}, avgReward=${state.avgReward.toFixed(3)}`);
}

function getArmValue(arm) {
  return banditState.arms[arm]?.avgReward || 0;
}

function getStats() {
  return {
    arms: Object.entries(banditState.arms).map(([name, data]) => ({
      name,
      ...data
    })),
    totalPulls: banditState.totalPulls
  };
}

function reset() {
  banditState.arms = {};
  banditState.totalPulls = 0;
}

module.exports = {
  selectArm,
  updateArm,
  getArmValue,
  getStats,
  reset
};
