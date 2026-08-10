const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'production';

app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.timestamp = new Date().toISOString();
  req.clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "https://image.pollinations.ai"],
      connectSrc: [
        "'self'",
        "https://api.groq.com",
        "https://generativelanguage.googleapis.com",
        "https://api.deepseek.com",
        "https://openrouter.ai",
        "https://api.cohere.ai",
        "https://cloud.omniroute.online",
        "https://pollinations.ai",
        "https://aidhaka-ai-chat.onrender.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

const allowedOrigins = [process.env.FRONTEND_URL, 'https://aidhaka.aiammu.com', 'https://aidhaka-ai-chat.onrender.com'].filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const morganMiddleware = morgan('combined', {
  skip: function(req, res) {
    return req.url.includes('/api/chat') && req.method === 'POST';
  }
});
app.use(morganMiddleware);

const userRateLimit = new Map();
const ipRateLimit = new Map();
const USER_RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10);
const USER_RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const IP_RATE_LIMIT_WINDOW = 60 * 1000;
const IP_RATE_LIMIT_MAX = 100;

function getUserRateLimitKey(userId) {
  return `user_${userId}`;
}

function getIpRateLimitKey(ip) {
  return `ip_${ip}`;
}

function checkUserRateLimit(userId) {
  const now = Date.now();
  const key = getUserRateLimitKey(userId);

  if (!userRateLimit.has(key)) {
    userRateLimit.set(key, { count: 1, resetAt: now + USER_RATE_LIMIT_WINDOW });
    return true;
  }

  const record = userRateLimit.get(key);
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + USER_RATE_LIMIT_WINDOW;
    return true;
  }

  if (record.count >= USER_RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

function checkIpRateLimit(ip) {
  const now = Date.now();
  const key = getIpRateLimitKey(ip);

  if (!ipRateLimit.has(key)) {
    ipRateLimit.set(key, { count: 1, resetAt: now + IP_RATE_LIMIT_WINDOW });
    return true;
  }

  const record = ipRateLimit.get(key);
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + IP_RATE_LIMIT_WINDOW;
    return true;
  }

  if (record.count >= IP_RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of userRateLimit.entries()) {
    if (now > record.resetAt) {
      userRateLimit.delete(key);
    }
  }
  for (const [key, record] of ipRateLimit.entries()) {
    if (now > record.resetAt) {
      ipRateLimit.delete(key);
    }
  }
}

setInterval(cleanupRateLimits, 5 * 60 * 1000);

function rateLimitMiddleware(req, res, next) {
  const userId = req.body?.user_id || req.query?.user_id || 'anonymous';
  const ip = req.clientIp || 'unknown';

  if (!checkUserRateLimit(userId)) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round(USER_RATE_LIMIT_WINDOW / 1000)
    });
  }

  if (!checkIpRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      error: 'IP rate limit exceeded. Please try again later.',
      retryAfter: Math.round(IP_RATE_LIMIT_WINDOW / 1000)
    });
  }

  next();
}

function validateRequestSize(req, res, next) {
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE || '1048576', 10);

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large'
    });
  }

  next();
}

function parseInt10(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid integer parameter');
  }
  return parsed;
}

const coreRoutes = require('./routes/core');
const chatRoutes = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const advancedRoutes = require('./routes/advanced');
const cacheRoutes = require('./routes/cache');

app.use('/api/conversations', rateLimitMiddleware, validateRequestSize, conversationRoutes);
app.use('/api', rateLimitMiddleware, validateRequestSize, coreRoutes);
app.use('/api', rateLimitMiddleware, validateRequestSize, chatRoutes);
app.use('/api', rateLimitMiddleware, validateRequestSize, advancedRoutes);
app.use('/api', rateLimitMiddleware, validateRequestSize, cacheRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const db = require('./database');
    const dbHealthy = await db.isHealthy();
    res.json({
      success: true,
      message: 'Aidhaka AI API is running',
      timestamp: new Date().toISOString(),
      mode: 'advanced-offline',
      status: dbHealthy ? 'healthy' : 'degraded',
      database: dbHealthy ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '7.0.0'
    });
  } catch (err) {
    res.json({
      success: true,
      message: 'Aidhaka AI API is running',
      timestamp: new Date().toISOString(),
      mode: 'advanced-offline',
      status: 'healthy',
      database: 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '7.0.0'
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

async function startServer() {
  try {
    const db = require('./database');
    const dbReady = await db.init();
    if (!dbReady) {
      console.warn('Database initialization failed, running in degraded mode');
    }

    const cleanupService = require('./services/cleanup-service');
    cleanupService.startCleanupScheduler({ interval: 'daily', retentionDays: 30 });

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Aidhaka AI API v7.0.0 running on port ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`URL: http://${process.env.SERVER_IP || 'localhost'}:${PORT}`);
      console.log('Advanced AI routing system initialized');
      console.log('Offline-first mode active');
      console.log('Cleanup scheduler started (daily)');
    });

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    async function gracefulShutdown() {
      console.log('Received shutdown signal, closing server gracefully...');
      server.close(() => {
        console.log('Server closed');
      });

      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);

      process.exit(0);
    }

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, PORT, NODE_ENV, startTime: Date.now() };
