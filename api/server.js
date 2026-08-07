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

// Rate limiting (with error handling)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const limiterHandler = (req, res, next) => {
  try {
    return limiter(req, res, (err) => {
      if (err) {
        console.error('Rate limiter error:', err.message);
        return next();
      }
      next();
    });
  } catch (err) {
    console.error('Rate limiter sync error:', err.message);
    return next();
  }
};
app.use('/api/', limiterHandler);

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

app.post('/api/test', (req, res) => {
  console.log('TEST ENDPOINT HIT, body:', JSON.stringify(req.body));
  res.json({ success: true, reply: 'test endpoint works', provider: 'test' });
});

// ============================================
// AI PROVIDERS
// ============================================

async function callPollinationsAI(question) {
  try {
    const response = await axios.post(
      'https://text.pollinations.ai/',
      {
        messages: [
          { role: 'system', content: 'You are Aidhaka AI, a helpful coding and general AI assistant.' },
          { role: 'user', content: question }
        ],
        model: 'openai',
        temperature: 0.7
      },
      { timeout: 60000 }
    );

    let reply = response.data?.choices?.[0]?.message?.content ||
                response.data?.response ||
                response.data?.output ||
                response.data?.text ||
                response.data;

    if (typeof reply === 'object') {
      reply = JSON.stringify(reply);
    }

    return { success: true, reply, provider: 'pollinations' };
  } catch (err) {
    return { success: false, error: err.message, provider: 'pollinations' };
  }
}

async function callGroq(question, apiKey) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-70b-versatile',
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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
      'https://openrouter.ai/api/v1/chat/completions',
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
  console.log('Chat hit, body:', JSON.stringify(req.body));
  try {
    const { question, provider, user_id } = req.body;
    console.log('Step 1: body parsed OK');

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }
    console.log('Step 2: question validated');

    // Load API keys from file or environment variables
    let apiKeys = {};
    let keysSource = 'none';
    try {
      const keysFile = process.env.KEYS_FILE || '/home/diamonds/aidhaka.json';
      if (fs.existsSync(keysFile)) {
        apiKeys = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
        keysSource = 'file:' + keysFile;
      } else {
        console.log('Keys file not found:', keysFile);
      }
    } catch (err) {
      console.error('Error loading keys file:', err.message);
    }

    // Fallback to environment variables if file not found
    if (!apiKeys.omniroute && process.env.OMNIROUTE_API_KEY) {
      apiKeys.omniroute = process.env.OMNIROUTE_API_KEY;
      keysSource += ' env:OMNIROUTE_API_KEY';
    }
    if (!apiKeys.payment && process.env.PAYMENT_API_KEY) {
      apiKeys.payment = process.env.PAYMENT_API_KEY;
      keysSource += ' env:PAYMENT_API_KEY';
    }
    if (!apiKeys.bkash && process.env.BKASH_NUMBER) {
      apiKeys.bkash = process.env.BKASH_NUMBER;
      keysSource += ' env:BKASH_NUMBER';
    }
    
    console.log('API Keys loaded from:', keysSource);
    console.log('OmniRoute key present:', !!apiKeys.omniroute);
    console.log('Payment key present:', !!apiKeys.payment);
    console.log('BKASH number present:', !!apiKeys.bkash);
    console.log('Step 3: keys loaded');

    let result = null;
    let usedProvider = '';

    // If user specified provider
    if (provider === 'pollinations') {
      console.log('Step 4: calling pollinations');
      try {
        result = await callPollinationsAI(question);
        usedProvider = 'pollinations';
        console.log('Step 5: pollinations done, success:', result.success);
      } catch (pErr) {
        console.error('Pollinations threw:', pErr.message, pErr.stack);
        result = { success: false, error: pErr.message };
      }
    } else if (provider === 'groq' && apiKeys.groq) {
      try {
        result = await callGroq(question, apiKeys.groq);
        usedProvider = 'groq';
      } catch (pErr) {
        console.error('Groq threw:', pErr.message);
        result = { success: false, error: pErr.message };
      }
    } else if (provider === 'gemini' && apiKeys.gemini) {
      try {
        result = await callGemini(question, apiKeys.gemini);
        usedProvider = 'gemini';
      } catch (pErr) {
        console.error('Gemini threw:', pErr.message);
        result = { success: false, error: pErr.message };
      }
    } else if (provider === 'deepseek' && apiKeys.omniroute) {
      try {
        result = await callDeepSeek(question, apiKeys.omniroute);
        usedProvider = 'deepseek';
      } catch (pErr) {
        console.error('DeepSeek threw:', pErr.message);
        result = { success: false, error: pErr.message };
      }
    } else if (provider === 'omniroute' && apiKeys.omniroute) {
      try {
        result = await callOmniRoute(question, apiKeys.omniroute);
        usedProvider = 'omniroute';
      } catch (pErr) {
        console.error('OmniRoute threw:', pErr.message);
        result = { success: false, error: pErr.message };
      }
    } else {
      // AUTO MODE: Try free providers in order
      try {
        result = await callPollinationsAI(question);
        usedProvider = 'pollinations';
        console.log('Auto pollinations result:', result.success, result.error || 'ok');
      } catch (pErr) {
        console.error('Auto pollinations threw:', pErr.message, pErr.stack);
        result = { success: false, error: pErr.message };
      }

      if (!result.success && apiKeys.groq) {
        try {
          result = await callGroq(question, apiKeys.groq);
          usedProvider = 'groq';
          console.log('Auto groq result:', result.success, result.error || 'ok');
        } catch (pErr) {
          console.error('Auto groq threw:', pErr.message);
        }
      }

      if (!result.success && apiKeys.gemini) {
        try {
          result = await callGemini(question, apiKeys.gemini);
          usedProvider = 'gemini';
          console.log('Auto gemini result:', result.success, result.error || 'ok');
        } catch (pErr) {
          console.error('Auto gemini threw:', pErr.message);
        }
      }

      if (!result.success && apiKeys.omniroute) {
        try {
          result = await callDeepSeek(question, apiKeys.omniroute);
          usedProvider = 'deepseek';
          console.log('Auto deepseek result:', result.success, result.error || 'ok');
        } catch (pErr) {
          console.error('Auto deepseek threw:', pErr.message);
        }
      }

      if (!result.success && apiKeys.omniroute) {
        try {
          result = await callOmniRoute(question, apiKeys.omniroute);
          usedProvider = 'omniroute';
          console.log('Auto omniroute result:', result.success, result.error || 'ok');
        } catch (pErr) {
          console.error('Auto omniroute threw:', pErr.message);
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
    console.log('Step 6: provider done, used:', usedProvider, 'success:', result.success);

    // Save to DB and cache if user_id provided
    if (user_id && result.success) {
      try {
        await saveChatToDB(user_id, question, result.reply, usedProvider);
        console.log('Step 7: DB saved');
      } catch (dbErr) {
        console.error('DB save error:', dbErr.message);
      }
      try {
        await addToChatCache(user_id, question, result.reply);
        console.log('Step 8: cache saved');
      } catch (cacheErr) {
        console.error('Cache write error:', cacheErr.message);
      }
    }

    console.log('Final response - provider:', usedProvider, 'success:', result.success);
    res.json({ success: true, reply: result.reply, provider: usedProvider });

  } catch (err) {
    console.error('CHAT ENDPOINT ERROR:', err.message, err.stack);
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
