const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const levels = { error: 0, warn: 1, info: 2, debug: 3 };

function log(level, ...args) {
  if (levels[level] > levels[LOG_LEVEL]) return;
  const timestamp = new Date().toISOString();
  const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(logLine);
  try {
    fs.appendFileSync(path.join(LOG_DIR, 'app.log'), logLine + '\n');
  } catch (e) {}
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args)
};
