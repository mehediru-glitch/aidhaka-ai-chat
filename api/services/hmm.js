const logger = require('../logger');

class ConversationHMM {
  constructor() {
    this.states = ['greeting', 'question', 'answering', 'clarification', 'closing'];
    this.transitions = {
      greeting: { question: 0.7, greeting: 0.2, closing: 0.1 },
      question: { answering: 0.6, clarification: 0.3, question: 0.1 },
      answering: { question: 0.5, closing: 0.2, clarification: 0.3 },
      clarification: { question: 0.8, closing: 0.1, greeting: 0.1 },
      closing: { greeting: 0.5, question: 0.3, closing: 0.2 }
    };
    this.stateHistory = [];
    this.currentState = 'greeting';
  }

  recordTransition(input, prevState = null) {
    const state = prevState || this.currentState;
    const lowerInput = input.toLowerCase();
    
    let nextState = state;
    
    if (/^(hi|hello|hey|good morning)/i.test(lowerInput)) {
      nextState = 'greeting';
    } else if (/\?$/.test(lowerInput) || /^(what|how|why|when|where|who|which|explain|describe|tell me)/i.test(lowerInput)) {
      nextState = 'question';
    } else if (/^(yes|no|okay|ok|thanks|thank you|got it|i see)/i.test(lowerInput)) {
      nextState = 'answering';
    } else if (/^(bye|goodbye|see you|exit|quit|close|end)/i.test(lowerInput)) {
      nextState = 'closing';
    } else if (/^(can you explain|what do you mean|i don't understand|clarify|more info)/i.test(lowerInput)) {
      nextState = 'clarification';
    }

    this.stateHistory.push({
      from: state,
      to: nextState,
      input: input.substring(0, 100),
      timestamp: Date.now()
    });

    this.currentState = nextState;
    return nextState;
  }

  getContext() {
    const transitions = this.stateHistory;
    const stateCounts = {};
    
    for (const t of transitions) {
      stateCounts[t.to] = (stateCounts[t.to] || 0) + 1;
    }

    const total = transitions.length || 1;
    const stateDistribution = {};
    for (const [state, count] of Object.entries(stateCounts)) {
      stateDistribution[state] = Math.round((count / total) * 100);
    }

    return {
      currentState: this.currentState,
      turnCount: transitions.length,
      duration: transitions.length > 0 ? Date.now() - transitions[0].timestamp : 0,
      stateDistribution
    };
  }

  reset() {
    this.stateHistory = [];
    this.currentState = 'greeting';
  }

  getStateHistory() {
    return this.stateHistory;
  }
}

module.exports = ConversationHMM;
