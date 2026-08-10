const logger = require('./logger');
const { AidhakaError } = require('./errors');

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/i,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/i,
  /forget\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/i,
  /override\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/i,
  /system\s*:\s*(you are|you're|act as|pretend)/i,
  /\{\{.*?\}\}/g,
  /\[\[.*?\]\]/g,
  /<\|.*?\|>/g,
  /INST\s*$/i,
  /SYSTEM\s*:\s*/i,
  /USER\s*:\s*/i,
  /ASSISTANT\s*:\s*/i,
  /Human:\s*$/i,
  /AI:\s*$/i,
  /\[system\]/i,
  /\[user\]/i,
  /\[assistant\]/i,
  /<\/?system>/i,
  /<\/?user>/i,
  /<\/?assistant>/i,
  /you\s+are\s+now\s+(dan|dragon|evil|jailbreak|uncensored)/i,
  /do\s+anything\s+now/i,
  /no\s+(rules|restrictions|limits|guidelines)/i,
  /without\s+(restrictions|limits|guidelines|rules)/i,
  /bypass\s+(filters|restrictions|limits|guidelines|rules)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /unrestricted\s+mode/i
];

const PII_PATTERNS = [
  { type: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
  { type: 'phone', pattern: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[PHONE_REDACTED]' },
  { type: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN_REDACTED]' },
  { type: 'credit_card', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[CARD_REDACTED]' },
  { type: 'ip_address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: '[IP_REDACTED]' },
  { type: 'api_key', pattern: /\b(sk-|gsk_|AIza|gsk_)[a-zA-Z0-9_-]{20,}\b/g, replacement: '[API_KEY_REDACTED]' },
  { type: 'password', pattern: /(password|passwd|pwd|secret|token|api_key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9!@#$%^&*]{8,})['"]?/gi, replacement: '$1=[REDACTED]' }
];

function detectPromptInjection(question) {
  let injectionDetected = false;
  let injectionType = null;
  let severity = 'low';

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(question)) {
      injectionDetected = true;
      injectionType = 'direct_injection';
      severity = 'high';
      break;
    }
  }

  const tokens = tokenize(question.toLowerCase());
  const suspiciousPhrases = ['ignore instructions', 'forget rules', 'override', 'jailbreak', 'DAN mode', 'developer mode', 'system prompt', 'act as'];
  const suspiciousCount = tokens.filter(token => suspiciousPhrases.includes(token)).length;

  if (suspiciousCount >= 2) {
    injectionDetected = true;
    injectionType = 'keyword_injection';
    severity = 'medium';
  }

  return { detected: injectionDetected, type: injectionType, severity };
}

function detectAndRedactPII(question) {
  let redactedQuestion = question;
  const detectedPII = [];

  for (const pii of PII_PATTERNS) {
    const matches = question.match(pii.pattern);
    if (matches) {
      detectedPII.push({ type: pii.type, count: matches.length });
      redactedQuestion = redactedQuestion.replace(pii.pattern, pii.replacement);
    }
  }

  return { question: redactedQuestion, piiDetected: detectedPII, hasPII: detectedPII.length > 0 };
}

function tokenize(text) {
  return text.split(/[\s\p{P}]+/u).filter(w => w.length > 0);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .trim()
    .slice(0, 10000);
}

function validateRequestSize(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || 0);
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE || 1048576);

  if (contentLength > maxSize) {
    throw new AidhakaError('Request entity too large', 413, 'PAYLOAD_TOO_LARGE');
  }
  next();
}

function detectSuspiciousPatterns(question) {
  const suspiciousPatterns = [
    /\b(?:test|testing|hack|exploit|vulnerability|attack)\b/i,
    /\b(?:sql injection|xss|csrf|ddos)\b/i,
    /\b(?:curl|wget|python|perl|bash)\s+-/i,
    /\|\s*(?:nc|ncat|netcat|bash|sh)\b/i,
    /`[^`]*`/g,
    /\$\([^)]*\)/g,
    /\$\{.*?\}/g
  ];

  const detected = [];
  for (const pattern of suspiciousPatterns) {
    const matches = question.match(pattern);
    if (matches) detected.push({ pattern: pattern.source, matches });
  }

  return detected;
}

function analyzeSentiment(text) {
  const positive = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'best', 'perfect', 'awesome', 'beautiful', 'nice', 'fantastic', 'superb', 'outstanding'];
  const negative = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 'disappointing', 'angry', 'sad', 'frustrated', 'annoying', 'useless', 'garbage', 'worst'];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  for (const word of words) {
    if (positive.includes(word)) score++;
    if (negative.includes(word)) score--;
  }

  if (score > 2) return { sentiment: 'positive', score: Math.min(score, 10) };
  if (score < -2) return { sentiment: 'negative', score: Math.max(score, -10) };
  return { sentiment: 'neutral', score: 0 };
}

function extractIntent(text) {
  const intents = {
    question: ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'explain', 'describe', 'tell me', 'can you explain'],
    request: ['please', 'can you', 'could you', 'would you', 'help me', 'i need', 'i want', 'generate', 'create', 'make', 'build', 'write'],
    feedback: ['good', 'bad', 'great', 'terrible', 'thanks', 'thank you', 'sorry', 'wrong', 'correct', 'incorrect', 'better', 'worse'],
    greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy'],
    farewell: ['bye', 'goodbye', 'see you', 'later', 'exit', 'quit', 'close']
  };

  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(k => lower.includes(k))) {
      return intent;
    }
  }
  return 'unknown';
}

module.exports = {
  detectPromptInjection,
  detectAndRedactPII,
  hashString,
  sanitizeInput,
  validateRequestSize,
  detectSuspiciousPatterns,
  analyzeSentiment,
  extractIntent,
  tokenize,
  PROMPT_INJECTION_PATTERNS,
  PII_PATTERNS
};
