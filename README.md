# Aidhaka AI - Next-Generation Intelligent Routing System

The most advanced AI routing system ever built, featuring machine learning, semantic understanding, and adaptive intelligence for `aidhaka.aiammu.com`.

## Features

### Core Intelligence
- **Adaptive Learning System** - Q-learning with knowledge graph
- **Predictive Intelligence** - Bayesian inference, linear regression
- **Semantic Understanding** - Word embeddings, cosine similarity, NLU
- **Dynamic Category Weighting** - Auto-adjusting importance
- **Performance Optimization** - Semantic cache, connection pooling
- **Advanced Security** - PII redaction, prompt injection detection
- **Self-Healing** - Circuit breaker, exponential backoff
- **Memory & Context** - Multi-turn conversation management
- **Response Enhancement** - Auto-formatting, sentiment adjustment
- **Global Optimization** - Geographic and language routing
- **A/B Testing** - Statistical experimentation framework

### Advanced Algorithms
1. Bayesian Provider Selection
2. Multi-Armed Bandit (UCB1 + Thompson Sampling)
3. Machine Learning Classifier
4. Hidden Markov Model
5. Natural Language Understanding

## Quick Start

```bash
npm install
cp .env.example .env
npm start
```

## API Documentation

Visit `http://localhost:3000/docs` for interactive Swagger documentation.

## Core Endpoints

- `GET /api/health` - System health check
- `POST /api/chat` - Main chat with intelligent routing
- `GET /api/usage` - Provider usage statistics
- `GET /api/providers` - Provider status and details
- `GET /api/routing?q=` - Routing decision preview
- `POST /api/chat/force` - Force specific provider

## Advanced Endpoints

- `GET /api/analytics` - Detailed analytics and insights
- `POST /api/feedback` - Submit user feedback
- `GET /api/learn` - Learning progress and adaptations
- `POST /api/retrain` - Retrain all models
- `GET /api/benchmark` - Provider performance comparison
- `POST /api/cache/clear` - Clear semantic cache

## Configuration

Copy `.env.example` to `.env` and configure your API keys.

## Docker

```bash
docker-compose up -d
```

## License

MIT
