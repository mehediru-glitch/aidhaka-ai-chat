const express = require('express');
const axios = require('axios');
const mysql = require('mysql2');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting with error boundary
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const safeLimiter = (req, res, next) => {
  try { limiter(req, res, next); } catch (e) { next(); }
};
app.use('/api/', safeLimiter);

// ============================================
// LOAD CONFIGURATION
// ============================================
const KEYS_FILE = process.env.KEYS_FILE || '/home/diamonds/aidhaka.json';
let API_KEYS = {};

try {
  if (fs.existsSync(KEYS_FILE)) {
    API_KEYS = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  }
} catch (err) {
  console.error('Error reading keys file:', err.message);
}

const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY || API_KEYS.omniroute || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || API_KEYS.groq || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || API_KEYS.gemini || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || API_KEYS.deepseek || '';
const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || API_KEYS.payment || '';
const BKASH_NUMBER = process.env.BKASH_NUMBER || API_KEYS.bkash || '01552665356';

// Chat cache directory (OUTSIDE web root)
const CACHE_DIR = process.env.CACHE_DIR || '/home/diamonds/aidhaka-cache';
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ============================================
// DATABASE CONNECTION
// ============================================
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'diamonds_aidhaka',
  password: process.env.DB_PASS || 'omorhafsaM1@',
  database: process.env.DB_NAME || 'diamonds_aidhaka',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Aidhaka AI API is running', 
    timestamp: new Date().toISOString(),
    providers: ['pollinations', 'groq', 'gemini', 'deepseek', 'omniroute']
  });
});

// ============================================
// AI ROUTING
// ============================================

function routeQuestion(question, apiKeys) {
  const q = question.toLowerCase();

  const codingKeywords = ['code', 'function', 'bug', 'error', 'program', 'script', 'api', 'html', 'css', 'javascript', 'python', 'java', 'react', 'node', 'sql', 'database', 'debug', 'compile', 'syntax', 'class', 'method', 'algorithm', 'git', 'docker', 'server', 'client', 'frontend', 'backend'];
  const longKeywords = ['explain', 'history', 'compare', 'difference', 'detailed', 'comprehensive', 'essay', 'research', 'analyze', 'analysis', 'report', 'describe', 'list all', 'every', 'complete'];
  const creativeKeywords = ['story', 'poem', 'write', 'creative', 'imagine', 'fiction', 'song', 'joke', 'idea', 'brainstorm'];
  const simpleKeywords = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'bye', 'goodbye', 'ok', 'okay', 'yes', 'no'];

  const isCoding = codingKeywords.some(k => q.includes(k));
  const isLong = longKeywords.some(k => q.includes(k)) || question.length > 200;
  const isCreative = creativeKeywords.some(k => q.includes(k));
  const isSimple = simpleKeywords.some(k => q.includes(k)) || question.length < 20;

  if (isCoding && apiKeys.groq) {
    return {
      provider: 'groq',
      call: (q, keys) => callGroq(q, keys.groq),
      fallback: (q, keys) => [
        { provider: 'pollinations', call: (q2, k2) => callPollinationsAI(q2) },
        { provider: 'gemini', call: (q2, k2) => apiKeys.gemini ? callGemini(q2, k2.gemini) : Promise.resolve({ success: false }) },
        { provider: 'deepseek', call: (q2, k2) => apiKeys.deepseek ? callDeepSeek(q2, k2.deepseek) : Promise.resolve({ success: false }) }
      ]
    };
  }

  if (isLong && apiKeys.gemini) {
    return {
      provider: 'gemini',
      call: (q, keys) => callGemini(q, keys.gemini),
      fallback: (q, keys) => [
        { provider: 'groq', call: (q2, k2) => apiKeys.groq ? callGroq(q2, k2.groq) : Promise.resolve({ success: false }) },
        { provider: 'deepseek', call: (q2, k2) => apiKeys.deepseek ? callDeepSeek(q2, k2.deepseek) : Promise.resolve({ success: false }) },
        { provider: 'pollinations', call: (q2, k2) => callPollinationsAI(q2) }
      ]
    };
  }

  if (isCreative && apiKeys.gemini) {
    return {
      provider: 'gemini',
      call: (q, keys) => callGemini(q, keys.gemini),
      fallback: (q, keys) => [
        { provider: 'pollinations', call: (q2, k2) => callPollinationsAI(q2) },
        { provider: 'groq', call: (q2, k2) => apiKeys.groq ? callGroq(q2, k2.groq) : Promise.resolve({ success: false }) }
      ]
    };
  }

  if (isSimple) {
    return {
      provider: 'pollinations',
      call: (q, keys) => callPollinationsAI(q),
      fallback: (q, keys) => [
        { provider: 'groq', call: (q2, k2) => apiKeys.groq ? callGroq(q2, k2.groq) : Promise.resolve({ success: false }) },
        { provider: 'gemini', call: (q2, k2) => apiKeys.gemini ? callGemini(q2, k2.gemini) : Promise.resolve({ success: false }) }
      ]
    };
  }

  return {
    provider: 'pollinations',
    call: (q, keys) => callPollinationsAI(q),
    fallback: (q, keys) => [
      { provider: 'groq', call: (q2, k2) => apiKeys.groq ? callGroq(q2, k2.groq) : Promise.resolve({ success: false }) },
      { provider: 'gemini', call: (q2, k2) => apiKeys.gemini ? callGemini(q2, k2.gemini) : Promise.resolve({ success: false }) },
      { provider: 'deepseek', call: (q2, k2) => apiKeys.deepseek ? callDeepSeek(q2, k2.deepseek) : Promise.resolve({ success: false }) },
      { provider: 'omniroute', call: (q2, k2) => apiKeys.omniroute ? callOmniRoute(q2, k2.omniroute) : Promise.resolve({ success: false }) }
    ]
  };
}

// ============================================
// AI PROVIDERS
// ============================================

async function callPollinationsAI(question) {
  const models = ['openai', 'gpt', 'mistral', 'llama'];
  const maxRetries = 0;

  for (const model of models) {
    try {
      const response = await axios.post(
        'https://text.pollinations.ai/',
        {
          messages: [
            { role: 'user', content: question }
          ],
          model: model,
          temperature: 0.7
        },
        { timeout: 12000 }
      );

      let reply = response.data?.choices?.[0]?.message?.content ||
                  response.data?.response ||
                  response.data?.output ||
                  response.data?.text ||
                  response.data;

      if (typeof reply === 'object') {
        reply = JSON.stringify(reply);
      }

      if (!reply) {
        reply = 'No response content from AI provider.';
      }

      return { success: true, reply, provider: 'pollinations' };
    } catch (err) {
      const status = err.response?.status;
      if (status === 402 || status === 429) {
        continue;
      }
    }
  }

  return { success: false, error: 'Pollinations unavailable', provider: 'pollinations' };
}

async function callGroq(question, apiKey) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are Aidhaka AI, a helpful coding and general AI assistant.' },
          { role: 'user', content: question }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    return { success: true, reply, provider: 'groq' };
  } catch (err) {
    return { success: false, error: err.message, provider: 'groq' };
  }
}

async function callGemini(question, apiKey) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      { contents: [{ parts: [{ text: question }] }] },
      { timeout: 60000 }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                  'Sorry, I could not generate a response.';
    return { success: true, reply, provider: 'gemini' };
  } catch (err) {
    return { success: false, error: err.message, provider: 'gemini' };
  }
}

async function callDeepSeek(question, apiKey) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are Aidhaka AI, a helpful coding and general AI assistant.' },
          { role: 'user', content: question }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    return { success: true, reply, provider: 'deepseek' };
  } catch (err) {
    return { success: false, error: err.message, provider: 'deepseek' };
  }
}

async function callOmniRoute(question, apiKey) {
  try {
    const response = await axios.post(
      'https://cloud.omniroute.online/v1/chat/completions',
      {
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: 'You are Aidhaka AI, a helpful coding and general AI assistant.' },
          { role: 'user', content: question }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    return { success: true, reply, provider: 'omniroute' };
  } catch (err) {
    return { success: false, error: err.message, provider: 'omniroute' };
  }
}

// ============================================
// CHAT HISTORY HELPERS
// ============================================

async function saveChatToDB(userId, question, answer, provider) {
  try {
    await pool.execute(
      'INSERT INTO chat_history (user_id, question, answer) VALUES (?, ?, ?)',
      [userId, question, answer]
    );
  } catch (err) {
    console.error('Error saving chat to DB:', err.message);
  }
}

async function getChatHistoryFromDB(userId) {
  try {
    const [rows] = await pool.execute(
      'SELECT question, answer, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    return rows;
  } catch (err) {
    console.error('Error fetching chat history:', err.message);
    return [];
  }
}

async function clearChatHistoryInDB(userId) {
  try {
    await pool.execute('DELETE FROM chat_history WHERE user_id = ?', [userId]);
  } catch (err) {
    console.error('Error clearing chat history:', err.message);
  }
}

function getCacheFilePath(userId) {
  return path.join(CACHE_DIR, `chat-${userId}.json`);
}

async function getChatCache(userId) {
  try {
    const cacheFile = getCacheFilePath(userId);
    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return data;
    }
  } catch (err) {
    console.error('Error reading cache:', err.message);
  }
  return [];
}

async function setChatCache(userId, history) {
  try {
    const cacheFile = getCacheFilePath(userId);
    fs.writeFileSync(cacheFile, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Error writing cache:', err.message);
  }
}

async function addToChatCache(userId, question, answer) {
  try {
    const history = await getChatCache(userId);
    history.push({ question, answer, timestamp: new Date().toISOString() });
    await setChatCache(userId, history);
  } catch (err) {
    console.error('Cache append error:', err.message);
  }
}

// ============================================
// CHAT ENDPOINT - Auto fallback + DB save
// ============================================
app.post('/api/chat', async (req, res) => {
  try {
    const { question, provider, user_id } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    let apiKeys = {};
    let keysSource = 'none';
    try {
      const keysFile = process.env.KEYS_FILE || '/home/diamonds/aidhaka.json';
      if (fs.existsSync(keysFile)) {
        apiKeys = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
        keysSource = 'file:' + keysFile;
      }
    } catch (err) {
      console.error('Error loading keys file:', err.message);
    }

    if (!apiKeys.omniroute && process.env.OMNIROUTE_API_KEY) {
      apiKeys.omniroute = process.env.OMNIROUTE_API_KEY;
      keysSource += ' env:OMNIROUTE_API_KEY';
    }
    if (!apiKeys.groq && process.env.GROQ_API_KEY) {
      apiKeys.groq = process.env.GROQ_API_KEY;
      keysSource += ' env:GROQ_API_KEY';
    }
    if (!apiKeys.gemini && process.env.GEMINI_API_KEY) {
      apiKeys.gemini = process.env.GEMINI_API_KEY;
      keysSource += ' env:GEMINI_API_KEY';
    }
    if (!apiKeys.deepseek && process.env.DEEPSEEK_API_KEY) {
      apiKeys.deepseek = process.env.DEEPSEEK_API_KEY;
      keysSource += ' env:DEEPSEEK_API_KEY';
    }
    if (!apiKeys.payment && process.env.PAYMENT_API_KEY) {
      apiKeys.payment = process.env.PAYMENT_API_KEY;
      keysSource += ' env:PAYMENT_API_KEY';
    }
    if (!apiKeys.bkash && process.env.BKASH_NUMBER) {
      apiKeys.bkash = process.env.BKASH_NUMBER;
      keysSource += ' env:BKASH_NUMBER';
    }

    console.log('API Keys source:', keysSource);

    let result = null;
    let usedProvider = '';

    if (provider === 'pollinations') {
      result = await callPollinationsAI(question);
      usedProvider = 'pollinations';
    } else if (provider === 'groq' && apiKeys.groq) {
      result = await callGroq(question, apiKeys.groq);
      usedProvider = 'groq';
    } else if (provider === 'gemini' && apiKeys.gemini) {
      result = await callGemini(question, apiKeys.gemini);
      usedProvider = 'gemini';
    } else if (provider === 'deepseek' && apiKeys.deepseek) {
      result = await callDeepSeek(question, apiKeys.deepseek);
      usedProvider = 'deepseek';
    } else if (provider === 'omniroute' && apiKeys.omniroute) {
      result = await callOmniRoute(question, apiKeys.omniroute);
      usedProvider = 'omniroute';
    } else {
      const route = routeQuestion(question, apiKeys);
      usedProvider = route.provider;
      result = await route.call(question, apiKeys);
      console.log('Routed to', usedProvider, ':', result.success, result.error || 'ok');

      if (!result.success && route.fallback) {
        for (const fb of route.fallback(question, apiKeys)) {
          result = await fb.call(question, apiKeys);
          usedProvider = fb.provider;
          console.log('Fallback to', usedProvider, ':', result.success, result.error || 'ok');
          if (result.success) break;
        }
      }

      if (!result.success) {
        const fallbacks = [
          "Hello! I'm Aidhaka AI. How can I help you today?",
          "That's an interesting question! Let me think about it.",
          "I'm here to help! What would you like to know?",
          "Great question! I'll do my best to answer.",
          "Thank you for asking! Let me provide some information."
        ];
        const fallbackReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        result = { success: true, reply: fallbackReply + " (Note: Using fallback response.)", provider: 'fallback' };
        usedProvider = 'fallback';
      }
    }

    if (user_id && result.success) {
      try {
        await saveChatToDB(user_id, question, result.reply, usedProvider);
      } catch (dbErr) {
        console.error('DB save error:', dbErr.message);
      }
      try {
        await addToChatCache(user_id, question, result.reply);
      } catch (cacheErr) {
        console.error('Cache write error:', cacheErr.message);
      }
    }

    console.log('Response - provider:', usedProvider);
    res.json({ success: true, reply: result.reply, provider: usedProvider });

  } catch (err) {
    console.error('Chat error:', err.message, err.stack);
    res.status(500).json({ success: false, error: err.message || 'Something went wrong. Please try again.' });
  }
});

// ============================================
// CHAT HISTORY ENDPOINTS
// ============================================

// Get chat history
app.get('/api/chat/history', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    // Try cache first (faster)
    let history = await getChatCache(parseInt(user_id));
    
    // If cache empty, load from DB
    if (!history || history.length === 0) {
      history = await getChatHistoryFromDB(parseInt(user_id));
      await setChatCache(parseInt(user_id), history);
    }

    res.json({ success: true, history });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

// Clear chat history
app.post('/api/chat/clear', async (req, res) => {
  try {
    const user_id = req.body.user_id;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    await clearChatHistoryInDB(parseInt(user_id));
    
    // Clear cache
    const cacheFile = getCacheFilePath(parseInt(user_id));
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (err) {
    console.error('Clear error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to clear history' });
  }
});

// Export chat as TXT
app.get('/api/chat/export', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const history = await getChatHistoryFromDB(parseInt(user_id));

    let content = `Aidhaka AI - Chat History\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `================================\n\n`;

    history.forEach(msg => {
      content += `[You]: ${msg.question}\n`;
      content += `[Aidhaka AI]: ${msg.answer}\n\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="aidhaka-chat-${Date.now()}.txt"`);
    res.send(content);
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to export' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aidhaka AI API running on port ${PORT}`);
  });
}

module.exports = app;
