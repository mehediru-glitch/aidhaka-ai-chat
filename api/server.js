const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use(helmet({ 
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'https://aidhaka.aiammu.com', 
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', {
  skip: (req) => req.url.includes('/api/chat') && req.method === 'POST'
}));

const userRateLimit = new Map();
const USER_RATE_LIMIT_WINDOW = 60 * 1000;
const USER_RATE_LIMIT_MAX = 30;

function checkUserRateLimit(userId) {
  const now = Date.now();
  const key = `user_${userId}`;
  
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

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of userRateLimit.entries()) {
    if (now > record.resetAt) {
      userRateLimit.delete(key);
    }
  }
}, 5 * 60 * 1000);

const CACHE_DIR = process.env.CACHE_DIR || '/home/diamonds/aidhaka-cache';
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'diamonds_aidhaka',
  password: process.env.DB_PASS || 'omorhafsaM1@',
  database: process.env.DB_NAME || 'diamonds_aidhaka',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

const OFFLINE_RESPONSES = {
  greeting: [
    "Hello! I'm Aidhaka AI. How can I help you today?",
    "Hi there! I'm here to assist you. What would you like to know?",
    "Hey! I'm Aidhaka AI. Ask me anything in English, Bangla, or Hindi.",
    "Greetings! I'm your AI assistant. How can I help you today?"
  ],
  coding: {
    keywords: ['code', 'function', 'program', 'script', 'html', 'css', 'javascript', 'python', 'java', 'react', 'sql', 'database', 'debug', 'error', 'bug', 'compile', 'syntax', 'class', 'method', 'algorithm', 'git', 'docker', 'server', 'client', 'frontend', 'backend', 'api'],
    response: "I can help you with coding! Here are some general tips:\n\n1. Always validate your inputs\n2. Use meaningful variable names\n3. Write comments for complex logic\n4. Test your code thoroughly\n\nFor specific code help, please share your code and I'll do my best to assist."
  },
  creative: {
    keywords: ['story', 'poem', 'write', 'creative', 'imagine', 'fiction', 'song', 'joke', 'idea', 'brainstorm'],
    response: "Here's a creative idea for you:\n\n'In a world where words dance like fireflies,\nIdeas bloom like flowers in spring.\nEvery question is a doorway,\nEvery answer is a new beginning.'\n\nWould you like me to expand on this or create something different?"
  },
  help: {
    keywords: ['help', 'what can you do', 'features', 'capabilities', 'how to use'],
    response: "I'm Aidhaka AI, your intelligent assistant. Here's what I can help with:\n\n• Answer questions on various topics\n• Help with coding and programming\n• Creative writing and brainstorming\n• General knowledge and explanations\n\nI work offline and provide helpful responses based on your queries. Just ask!"
  },
  thanks: {
    keywords: ['thanks', 'thank you', 'thx', 'appreciate'],
    response: "You're welcome! I'm glad I could help. Is there anything else you'd like to know?"
  },
  goodbye: {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'exit'],
    response: "Goodbye! It was nice chatting with you. Come back anytime you need help!"
  }
};

const CODE_SNIPPETS = {
  'javascript reverse string': `function reverseString(str) {
  return str.split('').reverse().join('');
}

// Usage
console.log(reverseString("hello")); // "olleh"

// Or using spread operator
function reverseStringES6(str) {
  return [...str].reverse().join('');
}`,

  'mysql database connection nodejs': `const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'your_database'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database!');
});`,

  'css flexbox': `.container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.item {
  flex: 1;
  min-width: 200px;
}`,

  'let vs const javascript': `// let - can be reassigned
let count = 0;
count = 1; // OK

// const - cannot be reassigned
const PI = 3.14159;
// PI = 3; // Error: Assignment to constant variable

// Key difference: let is for values that change, const is for values that stay the same`,

  'python prime number': `def is_prime(n):
    if n <= 1:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

# Usage
print(is_prime(17))  # True
print(is_prime(4))   # False`,

  'async await error handling': `async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    // Handle error appropriately
  } finally {
    console.log('Cleanup code here');
  }
}`,

  'html form validation': `<form id="myForm">
  <input type="text" id="name" required minlength="2">
  <input type="email" id="email" required>
  <button type="submit">Submit</button>
</form>

<script>
document.getElementById('myForm').addEventListener('submit', function(e) {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  
  if (!name || !email) {
    e.preventDefault();
    alert('Please fill all fields');
  }
});
</script>`,

  'rest api example': `// REST API Example with Express.js
const express = require('express');
const app = express();

// GET - Retrieve data
app.get('/api/users', (req, res) => {
  res.json({ users: [{ id: 1, name: 'John' }] });
});

// POST - Create data
app.post('/api/users', (req, res) => {
  res.json({ message: 'User created', user: req.body });
});

// PUT - Update data
app.put('/api/users/:id', (req, res) => {
  res.json({ message: 'User updated' });
});

// DELETE - Delete data
app.delete('/api/users/:id', (req, res) => {
  res.json({ message: 'User deleted' });
});`,

  'sql second highest salary': `-- Method 1: Using LIMIT and OFFSET
SELECT DISTINCT salary 
FROM employees 
ORDER BY salary DESC 
LIMIT 1 OFFSET 1;

-- Method 2: Using subquery
SELECT MAX(salary) 
FROM employees 
WHERE salary < (SELECT MAX(salary) FROM employees);`,

  'center div css': `/* Method 1: Flexbox */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

/* Method 2: Grid */
.container {
  display: grid;
  place-items: center;
  min-height: 100vh;
}

/* Method 3: Absolute positioning */
.container {
  position: relative;
}
.centered {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}`
};

function findCodeSnippet(question) {
  const q = question.toLowerCase();
  
  for (const [key, snippet] of Object.entries(CODE_SNIPPETS)) {
    const keywords = key.split(' ');
    const matchCount = keywords.filter(k => q.includes(k)).length;
    if (matchCount >= 2) {
      return snippet;
    }
  }
  
  return null;
}

function getOfflineResponse(question) {
  const q = question.toLowerCase();
  
  const codeSnippet = findCodeSnippet(q);
  if (codeSnippet) {
    return {
      success: true,
      reply: codeSnippet,
      provider: 'offline'
    };
  }
  
  for (const [category, data] of Object.entries(OFFLINE_RESPONSES)) {
    if (Array.isArray(data)) {
      if (data.some(r => q.includes(r))) {
        return {
          success: true,
          reply: OFFLINE_RESPONSES.greeting[Math.floor(Math.random() * OFFLINE_RESPONSES.greeting.length)],
          provider: 'offline'
        };
      }
    } else if (data.keywords) {
      if (data.keywords.some(k => q.includes(k))) {
        return {
          success: true,
          reply: data.response,
          provider: 'offline'
        };
      }
    }
  }
  
  const defaultResponses = [
    "That's an interesting question! Let me think about it...\n\nBased on my knowledge, I can provide some general guidance. Could you tell me more about what you're looking for?",
    "I'm here to help! While I work offline, I can still provide useful information. What specific aspect would you like me to focus on?",
    "Great question! I'd love to help with that. Could you provide a bit more context so I can give you the best possible answer?",
    "Thank you for asking! I'm an offline AI assistant. I can help with general questions, coding tips, creative ideas, and more. What would you like to explore?"
  ];
  
  return {
    success: true,
    reply: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
    provider: 'offline'
  };
}

async function saveChatToDB(userId, question, answer, provider, isImage = false, shareId = null, sessionId = null) {
  try {
    await pool.query(
      'INSERT INTO chat_history (user_id, question, answer, provider, is_image, share_id, session_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, question, answer, provider || 'unknown', isImage ? 1 : 0, shareId, sessionId]
    );
  } catch (err) {
    console.error('Save chat error (full columns):', err.message);
    try {
      await pool.query(
        'INSERT INTO chat_history (user_id, question, answer, provider) VALUES (?, ?, ?, ?)',
        [userId, question, answer, provider || 'unknown']
      );
    } catch (fallbackErr) {
      console.error('Save chat error (fallback):', fallbackErr.message);
    }
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

function generateShareId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Aidhaka AI API is running', 
    timestamp: new Date().toISOString(),
    mode: 'offline'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { question, provider, user_id } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    if (user_id && !checkUserRateLimit(user_id)) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait a moment.' });
    }

    const result = getOfflineResponse(question);
    const usedProvider = 'offline';

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

    res.json({ success: true, reply: result.reply, provider: usedProvider });

  } catch (err) {
    console.error('Chat error:', err.message, err.stack);
    res.status(500).json({ success: false, error: err.message || 'Something went wrong. Please try again.' });
  }
});

app.post('/api/chat/stream', async (req, res) => {
  try {
    const { question, user_id } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    const result = getOfflineResponse(question);
    
    res.write(result.reply);
    if (user_id) {
      saveChatToDB(user_id, question, result.reply, result.provider);
    }

    res.end();
  } catch (err) {
    console.error('Stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Stream failed' });
    }
  }
});

app.post('/api/generate-image', async (req, res) => {
  res.status(503).json({ success: false, error: 'Image generation is currently unavailable in offline mode.' });
});

app.get('/api/chat/history', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    let history = await getChatCache(parseInt(user_id));
    
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

app.post('/api/chat/clear', async (req, res) => {
  try {
    const user_id = req.body.user_id;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    await clearChatHistoryInDB(parseInt(user_id));
    
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

app.post('/api/chat/share', async (req, res) => {
  try {
    const { user_id, message_index } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const shareId = generateShareId();
    const history = await getChatHistoryFromDB(parseInt(user_id));
    
    if (!history || history.length === 0) {
      return res.status(404).json({ success: false, error: 'No chat history to share' });
    }

    const sharedMessages = message_index !== undefined 
      ? history.slice(0, parseInt(message_index) + 1) 
      : history;

    await pool.query(
      'INSERT INTO shared_chats (share_id, user_id, messages) VALUES (?, ?, ?)',
      [shareId, user_id, JSON.stringify(sharedMessages)]
    );

    const SITE_URL = process.env.SITE_URL || 'https://aidhaka.aiammu.com';
    res.json({ success: true, shareId, url: `${SITE_URL}/shared/${shareId}` });
  } catch (err) {
    console.error('Share error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to share chat' });
  }
});

app.get('/api/chat/shared/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const [rows] = await pool.query(
      'SELECT messages FROM shared_chats WHERE share_id = ? LIMIT 1',
      [shareId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shared chat not found' });
    }

    const messages = JSON.parse(rows[0].messages);
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Get shared error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load shared chat' });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const [rows] = await pool.query(
      'SELECT id, title, prompt, created_at FROM prompt_templates WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );

    res.json({ success: true, templates: rows });
  } catch (err) {
    console.error('Templates error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load templates' });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const { user_id, title, prompt } = req.body;
    if (!user_id || !title || !prompt) {
      return res.status(400).json({ success: false, error: 'user_id, title, and prompt are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO prompt_templates (user_id, title, prompt) VALUES (?, ?, ?)',
      [user_id, title.trim(), prompt.trim()]
    );

    res.json({ success: true, id: result.insertId, title, prompt });
  } catch (err) {
    console.error('Create template error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save template' });
  }
});

app.put('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, title, prompt } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title.trim()); }
    if (prompt !== undefined) { updates.push('prompt = ?'); values.push(prompt.trim()); }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    values.push(id, user_id);
    await pool.query(`UPDATE prompt_templates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);

    res.json({ success: true });
  } catch (err) {
    console.error('Update template error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    await pool.query('DELETE FROM prompt_templates WHERE id = ? AND user_id = ?', [id, user_id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const [rows] = await pool.query(
      'SELECT id, title, created_at, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
      [user_id]
    );

    res.json({ success: true, sessions: rows });
  } catch (err) {
    console.error('Sessions error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load sessions' });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { user_id, title } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
      [user_id, title || 'New Chat']
    );

    res.json({ success: true, id: result.insertId, title: title || 'New Chat' });
  } catch (err) {
    console.error('Create session error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, title } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    await pool.query(
      'UPDATE chat_sessions SET title = ? WHERE id = ? AND user_id = ?',
      [title, id, user_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Update session error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    await pool.query('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?', [id, user_id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete session error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
});

// ============================================
// DEV TOOLS - Coding Utilities
// ============================================

app.get('/api/dev-tools/format-code', async (req, res) => {
  try {
    const { code, language } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, error: 'code is required' });
    }

    let formatted = code;
    const lang = (language || 'text').toLowerCase();

    if (['javascript', 'js', 'json', 'css', 'html', 'xml', 'sql', 'python', 'java', 'cpp', 'c', 'php', 'ruby', 'go', 'rust', 'typescript', 'ts'].includes(lang)) {
      formatted = simpleBeautify(code, lang);
    }

    res.json({ success: true, formatted, language: lang });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to format code' });
  }
});

app.get('/api/dev-tools/format-json', async (req, res) => {
  try {
    const { json } = req.query;
    if (!json) {
      return res.status(400).json({ success: false, error: 'json is required' });
    }

    const parsed = JSON.parse(json);
    const formatted = JSON.stringify(parsed, null, 2);
    res.json({ success: true, formatted });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Invalid JSON: ' + err.message });
  }
});

app.get('/api/dev-tools/base64', async (req, res) => {
  try {
    const { text, action } = req.query;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }

    let result;
    if (action === 'decode') {
      result = Buffer.from(text, 'base64').toString('utf8');
    } else {
      result = Buffer.from(text, 'utf8').toString('base64');
    }

    res.json({ success: true, result, action: action || 'encode' });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Invalid input for base64 operation' });
  }
});

app.get('/api/dev-tools/uuid', async (req, res) => {
  try {
    const { count = 1, version = 4 } = req.query;
    const uuids = [];
    for (let i = 0; i < Math.min(parseInt(count), 100); i++) {
      uuids.push(require('crypto').randomUUID());
    }
    res.json({ success: true, uuids, count: uuids.length });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate UUIDs' });
  }
});

app.get('/api/dev-tools/regex-test', async (req, res) => {
  try {
    const { pattern, text, flags } = req.query;
    if (!pattern || text === undefined) {
      return res.status(400).json({ success: false, error: 'pattern and text are required' });
    }

    let regex;
    try {
      regex = new RegExp(pattern, flags || 'g');
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid regex pattern: ' + e.message });
    }

    const matches = [];
    let match;
    const regexGlobal = new RegExp(pattern, (flags || '') + 'g');
    while ((match = regexGlobal.exec(text)) !== null) {
      matches.push({ match: match[0], index: match.index, groups: match.slice(1) });
    }

    res.json({ success: true, matches, count: matches.length, pattern, flags: flags || '' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to test regex' });
  }
});

app.get('/api/dev-tools/color-palette', async (req, res) => {
  try {
    const { base, count = 5 } = req.query;
    const colors = [];
    const numColors = Math.min(parseInt(count), 20);

    if (base) {
      const hex = base.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      for (let i = 0; i < numColors; i++) {
        const factor = 1 - (i / numColors) * 0.7;
        const nr = Math.round(r * factor);
        const ng = Math.round(g * factor);
        const nb = Math.round(b * factor);
        colors.push('#' + [nr, ng, nb].map(x => x.toString(16).padStart(2, '0')).join(''));
      }
    } else {
      const palettes = [
        ['#6C63FF', '#5A52D5', '#4A42B5', '#3A3295', '#2A2275'],
        ['#FF6B6B', '#E85D5D', '#D14F4F', '#BA4141', '#A33333'],
        ['#00C853', '#00B248', '#009C3E', '#008634', '#00702A'],
        ['#FFD700', '#E6C200', '#CCAD00', '#B39900', '#998200'],
        ['#00BCD4', '#00A5B8', '#008E9C', '#007780', '#006064']
      ];
      const selected = palettes[Math.floor(Math.random() * palettes.length)];
      colors.push(...selected.slice(0, numColors));
    }

    res.json({ success: true, colors, base: base || 'random' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate palette' });
  }
});

app.get('/api/dev-tools/markdown-preview', async (req, res) => {
  try {
    const { markdown } = req.query;
    if (!markdown) {
      return res.status(400).json({ success: false, error: 'markdown is required' });
    }

    let html = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/\n/g, '<br>');

    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to convert markdown' });
  }
});

app.get('/api/dev-tools/env-template', async (req, res) => {
  try {
    const { type } = req.query;
    const templates = {
      nodejs: `NODE_ENV=development\nPORT=3000\nDB_HOST=localhost\nDB_USER=root\nDB_PASS=password\nDB_NAME=mydb\nJWT_SECRET=your-secret-key\n`,
      laravel: `APP_NAME=Laravel\nAPP_ENV=local\nAPP_KEY=\nAPP_DEBUG=true\nAPP_URL=http://localhost\n\nDB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=laravel\nDB_USERNAME=root\nDB_PASSWORD=\n`,
      react: `REACT_APP_API_URL=http://localhost:3000\nREACT_APP_NAME=MyApp\nREACT_APP_VERSION=1.0.0\n`,
      python: `FLASK_ENV=development\nFLASK_APP=app.py\nSECRET_KEY=your-secret-key\nDATABASE_URL=sqlite:///app.db\n`,
      general: `APP_NAME=MyApp\nAPP_ENV=development\nAPP_DEBUG=true\nAPP_URL=http://localhost\n\nDB_HOST=localhost\nDB_PORT=3306\nDB_NAME=mydb\nDB_USER=root\nDB_PASS=\n\nCACHE_DRIVER=file\nSESSION_DRIVER=file\nQUEUE_CONNECTION=sync\n`
    };

    const template = templates[type] || templates.general;
    res.json({ success: true, template, type: type || 'general' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate template' });
  }
});

app.get('/api/dev-tools/sql-format', async (req, res) => {
  try {
    const { sql } = req.query;
    if (!sql) {
      return res.status(400).json({ success: false, error: 'sql is required' });
    }

    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'INDEX', 'UNION', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IN', 'NOT', 'NULL', 'IS', 'BETWEEN', 'LIKE', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
    
    let formatted = sql;
    keywords.forEach(keyword => {
      const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
      formatted = formatted.replace(regex, '\n' + keyword);
    });

    formatted = formatted.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
    
    res.json({ success: true, formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to format SQL' });
  }
});

app.get('/api/dev-tools/lorem-ipsum', async (req, res) => {
  try {
    const { count = 3, type = 'paragraph' } = req.query;
    const num = Math.min(parseInt(count), 20);

    const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'];

    const generateSentence = () => {
      const len = 5 + Math.floor(Math.random() * 10);
      const sentence = [];
      for (let i = 0; i < len; i++) {
        sentence.push(words[Math.floor(Math.random() * words.length)]);
      }
      return sentence.join(' ') + '.';
    };

    const generateParagraph = () => {
      const len = 4 + Math.floor(Math.random() * 4);
      const para = [];
      for (let i = 0; i < len; i++) {
        para.push(generateSentence());
      }
      return para.join(' ');
    };

    let result = [];
    if (type === 'sentence') {
      for (let i = 0; i < num; i++) result.push(generateSentence());
    } else if (type === 'word') {
      for (let i = 0; i < num; i++) result.push(words[Math.floor(Math.random() * words.length)]);
    } else {
      for (let i = 0; i < num; i++) result.push(generateParagraph());
    }

    res.json({ success: true, result: result.join('\n\n'), type, count: num });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate lorem ipsum' });
  }
});

app.get('/api/dev-tools/cron-generator', async (req, res) => {
  try {
    const { minute = '*', hour = '*', day = '*', month = '*', weekday = '*' } = req.query;
    const expression = `${minute} ${hour} ${day} ${month} ${weekday}`;
    
    const descriptions = [];
    if (minute !== '*') descriptions.push(`at minute ${minute}`);
    if (hour !== '*') descriptions.push(`at ${hour}:00`);
    if (day !== '*') descriptions.push(`on day ${day} of month`);
    if (month !== '*') descriptions.push(`in month ${month}`);
    if (weekday !== '*') descriptions.push(`on weekday ${weekday}`);

    res.json({ 
      success: true, 
      expression, 
      description: descriptions.length > 0 ? 'Runs ' + descriptions.join(', ') : 'Runs every minute'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate cron expression' });
  }
});

app.get('/api/dev-tools/text-diff', async (req, res) => {
  try {
    const { text1, text2 } = req.query;
    if (!text1 || text2 === undefined) {
      return res.status(400).json({ success: false, error: 'text1 and text2 are required' });
    }

    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);
    
    const diff = [];
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      if (line1 !== line2) {
        diff.push({
          line: i + 1,
          original: line1,
          modified: line2,
          changed: true
        });
      } else {
        diff.push({
          line: i + 1,
          original: line1,
          modified: line2,
          changed: false
        });
      }
    }

    res.json({ success: true, diff, changes: diff.filter(d => d.changed).length });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compare texts' });
  }
});

app.post('/api/dev-tools/snippets', async (req, res) => {
  try {
    const { user_id, title, language, code, description } = req.body;
    if (!user_id || !title || !code) {
      return res.status(400).json({ success: false, error: 'user_id, title, and code are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO dev_snippets (user_id, title, language, code, description) VALUES (?, ?, ?, ?, ?)',
      [user_id, title, language || 'text', code, description || '']
    );

    res.json({ success: true, id: result.insertId, title, language: language || 'text' });
  } catch (err) {
    console.error('Save snippet error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save snippet' });
  }
});

app.get('/api/dev-tools/snippets', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const [rows] = await pool.query(
      'SELECT id, title, language, description, created_at FROM dev_snippets WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );

    res.json({ success: true, snippets: rows });
  } catch (err) {
    console.error('Get snippets error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load snippets' });
  }
});

app.get('/api/dev-tools/snippets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.query.user_id;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const [rows] = await pool.query(
      'SELECT id, title, language, code, description, created_at FROM dev_snippets WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Snippet not found' });
    }

    res.json({ success: true, snippet: rows[0] });
  } catch (err) {
    console.error('Get snippet error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load snippet' });
  }
});

app.delete('/api/dev-tools/snippets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    await pool.query('DELETE FROM dev_snippets WHERE id = ? AND user_id = ?', [id, user_id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete snippet error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete snippet' });
  }
});

app.post('/api/dev-tools/history', async (req, res) => {
  try {
    const { user_id, tool, input, output } = req.body;
    if (!user_id || !tool || !input || !output) {
      return res.status(400).json({ success: false, error: 'user_id, tool, input, and output are required' });
    }

    await pool.query(
      'INSERT INTO dev_tool_history (user_id, tool, input, output) VALUES (?, ?, ?, ?)',
      [user_id, tool, input, output]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Save tool history error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save history' });
  }
});

app.get('/api/dev-tools/history', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    const tool = req.query.tool;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    let query = 'SELECT id, tool, input, output, created_at FROM dev_tool_history WHERE user_id = ?';
    const params = [user_id];
    
    if (tool) {
      query += ' AND tool = ?';
      params.push(tool);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await pool.query(query, params);

    res.json({ success: true, history: rows });
  } catch (err) {
    console.error('Get tool history error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

function simpleBeautify(code, language) {
  let indent = 0;
  const indentStr = '  ';
  let result = '';
  const lines = code.split('\n');
  
  const openers = ['{', '(', '['];
  const closers = ['}', ')', ']'];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    if (closers.some(c => line.startsWith(c))) {
      indent = Math.max(0, indent - 1);
    }
    
    result += indentStr.repeat(indent) + line + '\n';
    
    if (openers.some(o => line.endsWith(o))) {
      indent++;
    }
  }
  
  return result.trim();
}

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
