// ============================================
// Aidhaka AI - Main JavaScript
// ============================================

let currentLang = localStorage.getItem('aidhaka_lang') || 'en';
let isChatLoading = false;
let chatHistoryLoaded = false;
let notificationEnabled = true;
let lastFailedMessage = '';
let currentSessionId = null;
let sessionsLoaded = false;

document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  initNavbar();
  initChat();
  initAnimations();
  
  if (document.body.classList.contains('chat-page')) {
    loadSessions();
  }
});

// ============================================
// Language System
// ============================================
function initLanguage() {
  setLanguage(currentLang);
  
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
    });
  });
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('aidhaka_lang', lang);
  document.documentElement.lang = lang === 'bn' ? 'bn-BD' : 'en';
  
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const translation = TRANSLATIONS[lang]?.[key];
    if (translation) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translation;
      } else {
        el.textContent = translation;
      }
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const translation = TRANSLATIONS[lang]?.[key];
    if (translation) {
      el.placeholder = translation;
    }
  });
}

function t(key) {
  return TRANSLATIONS[currentLang]?.[key] || key;
}

function playNotificationSound() {
  if (!notificationEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error('Notification sound error:', e);
  }
}

// ============================================
// Navbar
// ============================================
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');
  
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target) && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
    }
  });
}

// ============================================
// Chat System
// ============================================
function initChat() {
  const textarea = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebar = document.getElementById('chat-sidebar');
  const connectionStatus = document.getElementById('connection-status');
  
  if (!textarea) return;

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
  }

  if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !menuToggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  // Connection status
  if (connectionStatus) {
    const updateStatus = (online) => {
      const dot = connectionStatus.querySelector('.status-dot');
      if (dot) {
        dot.style.background = online ? 'var(--success)' : 'var(--error)';
        dot.style.animation = online ? 'pulse 2s infinite' : 'none';
      }
    };

    window.addEventListener('online', () => updateStatus(true));
    window.addEventListener('offline', () => updateStatus(false));
    updateStatus(navigator.onLine);
  }
}

async function loadSessions() {
  if (sessionsLoaded) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions?user_id=${currentUserId}`);
    const data = await response.json();
    
    if (data.success) {
      renderSessionsList(data.sessions);
      sessionsLoaded = true;
      
      if (data.sessions.length > 0) {
        switchSession(data.sessions[0].id);
      } else {
        createNewSession();
      }
    }
  } catch (err) {
    if (typeof __DEBUG__ !== 'undefined') {
      console.error('Failed to load sessions:', err);
    }
  }
}

async function loadSessionMessages(sessionId) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  try {
    const response = await fetch(`${HISTORY_API_URL}/index.php?user_id=${currentUserId}&session_id=${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.history && data.history.length > 0) {
      container.innerHTML = '';
      
      data.history.forEach(msg => {
        appendMessage('user', msg.question, false);
        appendMessage('assistant', msg.answer, false);
      });
      
      chatHistoryLoaded = true;
      container.scrollTop = container.scrollHeight;
    } else {
      container.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-avatar">AI</div>
          <h3 data-i18n="welcome_title">Hello! I'm Aidhaka AI</h3>
          <p data-i18n="welcome_subtitle">How can I help you today? Ask me anything in English, Bangla, or Hindi.</p>
        </div>
      `;
      chatHistoryLoaded = false;
    }
  } catch (err) {
    if (typeof __DEBUG__ !== 'undefined') {
      console.error('Failed to load session messages:', err);
    }
  }
}

function renderSessionsList(sessions) {
  const sessionsList = document.getElementById('sessions-list');
  if (!sessionsList) return;

  try {
    sessionsList.innerHTML = '';
    
    if (sessions.length === 0) {
      sessionsList.innerHTML = '<div class="history-empty" data-i18n="history_empty">No chats yet</div>';
      return;
    }
    
    sessions.forEach(session => {
      const item = document.createElement('div');
      item.className = 'history-item';
      if (session.id === currentSessionId) {
        item.classList.add('active');
      }
      item.dataset.sessionId = session.id;
      
      const content = document.createElement('div');
      content.className = 'history-item-content';
      
      const title = session.title || 'New Chat';
      const preview = title.length > 40 ? title.substring(0, 40) + '...' : title;
      content.innerHTML = `
        <div class="history-question">${escapeHtml(preview)}</div>
        <div class="history-time">${new Date(session.updated_at).toLocaleString()}</div>
      `;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'history-delete-btn';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Delete this chat';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSession(session.id, item);
      });
      
      item.appendChild(content);
      item.appendChild(deleteBtn);
      
      item.addEventListener('click', () => {
        switchSession(session.id);
      });
      
      sessionsList.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to render sessions list:', err);
  }
}

async function createNewSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, title: 'New Chat' })
    });
    
    const data = await response.json();
    if (data.success) {
      currentSessionId = data.id;
      sessionsLoaded = false;
      loadSessions();
      
      const container = document.getElementById('chat-messages');
      if (container) {
        container.innerHTML = `
          <div class="welcome-message">
            <div class="welcome-avatar">AI</div>
            <h3 data-i18n="welcome_title">Hello! I'm Aidhaka AI</h3>
            <p data-i18n="welcome_subtitle">How can I help you today? Ask me anything in English, Bangla, or Hindi.</p>
          </div>
        `;
        chatHistoryLoaded = false;
      }
    }
  } catch (err) {
    console.error('Failed to create session:', err);
  }
}

async function switchSession(sessionId) {
  currentSessionId = sessionId;
  chatHistoryLoaded = false;
  
  const items = document.querySelectorAll('.history-item');
  items.forEach(item => {
    item.classList.toggle('active', parseInt(item.dataset.sessionId) === sessionId);
  });
  
  await loadSessionMessages(sessionId);
}

async function deleteSession(sessionId, itemElement) {
  if (!confirm('Delete this chat?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    });
    
    if (response.ok) {
      if (itemElement) {
        itemElement.remove();
      }
      
      if (currentSessionId === sessionId) {
        currentSessionId = null;
        chatHistoryLoaded = false;
        
        const container = document.getElementById('chat-messages');
        if (container) {
          container.innerHTML = `
            <div class="welcome-message">
              <div class="welcome-avatar">AI</div>
              <h3 data-i18n="welcome_title">Hello! I'm Aidhaka AI</h3>
              <p data-i18n="welcome_subtitle">How can I help you today? Ask me anything in English, Bangla, or Hindi.</p>
            </div>
          `;
        }
        
        sessionsLoaded = false;
        loadSessions();
      }
    }
  } catch (err) {
    console.error('Failed to delete session:', err);
  }
}

async function clearAllHistory() {
  if (!confirm('Clear current chat? This cannot be undone.')) return;
  
  const btn = document.querySelector('.history-clear-btn');
  if (btn) btn.disabled = true;
  
  try {
    if (currentSessionId) {
      await fetch(`${API_BASE_URL}/api/sessions/${currentSessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId })
      });
    }
    
    createNewSession();
  } catch (err) {
    console.error('Failed to clear chat:', err);
    createNewSession();
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function saveToHistoryLocally(question, answer, provider, isImage = false) {
  try {
    const response = await fetch(`${HISTORY_API_URL}/index.php?user_id=${currentUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, provider, is_image: isImage ? 1 : 0, session_id: currentSessionId })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error('Failed to save chat history:', response.status, data.error || response.statusText);
    }
  } catch (err) {
    console.error('Failed to save chat history locally:', err);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessage(retryMessage = null) {
  const textarea = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const container = document.getElementById('chat-messages');
  const message = retryMessage || textarea.value.trim();

  if (!message || isChatLoading) return;

  if (!currentSessionId) {
    await createNewSession();
    if (!currentSessionId) return;
  }

  isChatLoading = true;
  if (!retryMessage) {
    sendBtn.disabled = true;
    textarea.value = '';
    textarea.style.height = 'auto';
    appendMessage('user', message);
  }
  showSkeletonLoading();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: message,
        user_id: currentUserId
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const data = await response.json();
    removeSkeletonLoading();

    if (data.reply) {
      appendMessage('assistant', data.reply, true);
      chatHistoryLoaded = true;
      lastFailedMessage = '';
      playNotificationSound();
      
      saveToHistoryLocally(message, data.reply, data.provider || 'offline');
    } else {
      lastFailedMessage = message;
      appendMessage('assistant', data.error || t('chat_error'), true, null, true);
    }
  } catch (err) {
    removeSkeletonLoading();
    if (err.name === 'AbortError') {
      appendMessage('assistant', 'Request timed out. Please try again.');
    } else {
      appendMessage('assistant', t('chat_network_error'));
    }
  } finally {
    isChatLoading = false;
    sendBtn.disabled = false;
    textarea.focus();
  }
}

function showSkeletonLoading() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const skeletonDiv = document.createElement('div');
  skeletonDiv.id = 'skeleton-loading';
  skeletonDiv.className = 'message message-assistant';
  skeletonDiv.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-content">
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
    </div>
  `;
  container.appendChild(skeletonDiv);
  container.scrollTop = container.scrollHeight;
}

function removeSkeletonLoading() {
  const skeleton = document.getElementById('skeleton-loading');
  if (skeleton) skeleton.remove();
}

function appendMessage(role, content, animate = true, isError = false) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${role}`;
  if (!animate) messageDiv.style.animation = 'none';
  if (isError) messageDiv.classList.add('message-error');

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'You' : 'AI';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.innerHTML = parseMarkdown(content);

  messageContent.appendChild(messageText);
  
  if (isError) {
    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = '🔄 Retry';
    retryBtn.addEventListener('click', () => {
      retryBtn.remove();
      sendMessage(lastFailedMessage);
    });
    messageContent.appendChild(retryBtn);
  }
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);
  container.appendChild(messageDiv);

  container.scrollTop = container.scrollHeight;
}

async function shareChat() {
  if (!confirm('Share this chat? A public link will be generated.')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    });
    
    const data = await response.json();
    if (data.success) {
      navigator.clipboard.writeText(data.url).then(() => {
        alert('Share link copied to clipboard!');
      }).catch(() => {
        prompt('Copy this link:', data.url);
      });
    } else {
      alert(data.error || 'Failed to share chat');
    }
  } catch (err) {
    alert('Failed to share chat');
  }
}

async function loadPromptTemplates() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/templates?user_id=${currentUserId}`);
    const data = await response.json();
    if (data.success) {
      renderPromptTemplates(data.templates);
    }
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

function renderPromptTemplates(templates) {
  const list = document.getElementById('template-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (templates.length === 0) {
    list.innerHTML = '<div class="template-empty">No templates yet</div>';
    return;
  }
  
  templates.forEach(t => {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.innerHTML = `
      <div class="template-title">${escapeHtml(t.title)}</div>
      <div class="template-preview">${escapeHtml(t.prompt.substring(0, 60))}${t.prompt.length > 60 ? '...' : ''}</div>
      <div class="template-actions">
        <button class="template-use-btn" data-id="${t.id}">Use</button>
        <button class="template-delete-btn" data-id="${t.id}">Delete</button>
      </div>
    `;
    
    item.querySelector('.template-use-btn').addEventListener('click', () => {
      const textarea = document.getElementById('chat-input');
      if (textarea) {
        textarea.value = t.prompt;
        textarea.focus();
      }
    });
    
    item.querySelector('.template-delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this template?')) return;
      await fetch(`${API_BASE_URL}/api/templates/${t.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId })
      });
      loadPromptTemplates();
    });
    
    list.appendChild(item);
  });
}

async function savePromptTemplate() {
  const titleInput = document.getElementById('template-title');
  const promptInput = document.getElementById('template-prompt');
  const title = titleInput?.value.trim();
  const prompt = promptInput?.value.trim();
  
  if (!title || !prompt) {
    alert('Please enter both title and prompt');
    return;
  }
  
  await fetch(`${API_BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUserId, title, prompt })
  });
  
  titleInput.value = '';
  promptInput.value = '';
  loadPromptTemplates();
}

function toggleTemplateModal() {
  const modal = document.getElementById('template-modal');
  if (modal) {
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    if (modal.style.display === 'flex') {
      loadPromptTemplates();
    }
  }
}

function parseMarkdown(text) {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;

  while ((match = codeBlockRegex.exec(html)) !== null) {
    codeBlocks.push({
      full: match[0],
      lang: match[1] || 'code',
      code: match[2].trim()
    });
  }

  for (let i = codeBlocks.length - 1; i >= 0; i--) {
    const { full, lang, code } = codeBlocks[i];
    const escapedCode = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const placeholder = `<div class="code-block" data-lang="${lang}" data-code-index="${i}">
      <div class="code-header">
        <span class="code-lang">${lang}</span>
        <div class="code-actions">
          <button class="code-btn copy-btn" onclick="copyCode(this)" title="Copy code">📋 Copy</button>
          <button class="code-btn download-btn" onclick="downloadCode(this)" title="Download file">⬇ Download</button>
          ${isPreviewable(lang) ? `<button class="code-btn preview-btn" onclick="previewCode(this)" title="Live preview">▶ Preview</button>` : ''}
        </div>
      </div>
      <pre><code>${escapeHtml(escapedCode)}</code></pre>
      <div class="code-preview" style="display:none;"></div>
    </div>`;
    html = html.replace(full, placeholder);
  }

  html = html.replace(/```[\s\S]*?```/g, '');

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function isPreviewable(lang) {
  const previewLangs = ['html', 'css', 'javascript', 'js'];
  return previewLangs.includes(lang.toLowerCase());
}

function copyCode(btn) {
  const codeBlock = btn.closest('.code-block');
  const code = codeBlock.querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = originalText; }, 2000);
  });
}

function downloadCode(btn) {
  const codeBlock = btn.closest('.code-block');
  const lang = codeBlock.dataset.lang;
  const code = codeBlock.querySelector('code').textContent;
  const ext = getExtension(lang);
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `code.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getExtension(lang) {
  const map = { javascript: 'js', js: 'js', html: 'html', css: 'css', python: 'py', java: 'java', cpp: 'cpp', c: 'c', json: 'json', xml: 'xml', yaml: 'yaml', md: 'md', sql: 'sql', php: 'php', ruby: 'rb', go: 'go', rust: 'rs', typescript: 'ts' };
  return map[lang.toLowerCase()] || 'txt';
}

function previewCode(btn) {
  const codeBlock = btn.closest('.code-block');
  const preview = codeBlock.querySelector('.code-preview');
  const lang = codeBlock.dataset.lang.toLowerCase();
  const code = codeBlock.querySelector('code').textContent;

  if (preview.style.display === 'none') {
    preview.style.display = 'block';
    btn.textContent = '◼ Close';

    if (lang === 'html') {
      preview.innerHTML = code;
    } else if (lang === 'css') {
      preview.innerHTML = `<style>${escapeHtml(code)}</style><div class="preview-content">${t('preview_css')}</div>`;
    } else if (lang === 'javascript' || lang === 'js') {
      const outputDiv = document.createElement('pre');
      outputDiv.id = 'js-output';
      outputDiv.style.cssText = 'background:#f4f4f4;padding:10px;border-radius:4px;overflow:auto;';
      preview.innerHTML = '';
      preview.appendChild(outputDiv);
      
      try {
        const fn = new Function(code + '\nif (typeof output !== "undefined") document.getElementById("js-output").textContent = output;');
        fn();
      } catch (e) {
        document.getElementById('js-output').textContent = 'Error: ' + e.message;
      }
    }
  } else {
    preview.style.display = 'none';
    btn.textContent = '▶ Preview';
    preview.innerHTML = '';
  }
}

function downloadChat() {
  fetch(`${HISTORY_API_URL}/index.php?user_id=${currentUserId}`)
    .then(r => r.json())
    .then(data => {
      if (!data.success || !data.history || data.history.length === 0) {
        alert('No chat history to download');
        return;
      }

      let content = `Aidhaka AI - Chat History\n`;
      content += `Generated: ${new Date().toLocaleString()}\n`;
      content += `${'='.repeat(50)}\n\n`;

      data.history.forEach(msg => {
        content += `[You]: ${msg.question}\n`;
        content += `[Aidhaka AI]: ${msg.answer}\n\n`;
      });

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aidhaka-chat-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error('Failed to download chat:', err);
      alert('Failed to download chat history');
    });
}

function startNewChat() {
  createNewSession();
}

// ============================================
// Animations
// ============================================
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card, .auth-card, .payment-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// ============================================
// Utility Functions
// ============================================
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = anchor.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

function checkPasswordStrength(password) {
  const bar = document.getElementById('password-strength-bar');
  if (!bar) return;
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;
  
  bar.className = 'password-strength-bar';
  if (password.length === 0) {
    bar.style.width = '0';
  } else if (strength <= 1) {
    bar.classList.add('weak');
  } else if (strength <= 2) {
    bar.classList.add('medium');
  } else {
    bar.classList.add('strong');
  }
}

// ============================================
// Developer Tools
// ============================================

let currentTool = 'format-code';

function toggleToolsModal() {
  const modal = document.getElementById('tools-modal');
  if (modal) {
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    if (modal.style.display === 'flex') {
      renderToolPanel(currentTool);
    }
  }
}

function switchTool(tool) {
  currentTool = tool;
  
  document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tool === tool);
  });
  
  renderToolPanel(tool);
}

function renderToolPanel(tool) {
  const container = document.getElementById('tools-content');
  if (!container) return;

  let html = '';
  
  switch(tool) {
    case 'format-code':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Language</label>
            <select id="tool-lang" class="tool-input">
              <option value="javascript">JavaScript</option>
              <option value="json">JSON</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="sql">SQL</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="php">PHP</option>
              <option value="text">Plain Text</option>
            </select>
          </div>
          <div class="tool-form-group">
            <label>Code</label>
            <textarea id="tool-input" class="tool-textarea" rows="10" placeholder="Paste your code here..."></textarea>
          </div>
          <button class="btn btn-primary btn-sm" onclick="runFormatCode()">Format Code</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'format-json':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>JSON Input</label>
            <textarea id="tool-input" class="tool-textarea" rows="10" placeholder='{"key": "value"}'></textarea>
          </div>
          <button class="btn btn-primary btn-sm" onclick="runFormatJson()">Format JSON</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'base64':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Action</label>
            <select id="tool-action" class="tool-input">
              <option value="encode">Encode to Base64</option>
              <option value="decode">Decode from Base64</option>
            </select>
          </div>
          <div class="tool-form-group">
            <label>Input Text</label>
            <textarea id="tool-input" class="tool-textarea" rows="5" placeholder="Enter text to encode/decode..."></textarea>
          </div>
          <button class="btn btn-primary btn-sm" onclick="runBase64()">Process</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'uuid':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Count</label>
            <input type="number" id="tool-count" class="tool-input" value="5" min="1" max="100">
          </div>
          <button class="btn btn-primary btn-sm" onclick="runUuid()">Generate UUIDs</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'regex-test':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Pattern</label>
            <input type="text" id="tool-pattern" class="tool-input" placeholder="e.g. [a-z]+@[a-z]+\\.[a-z]+">
          </div>
          <div class="tool-form-group">
            <label>Test String</label>
            <textarea id="tool-input" class="tool-textarea" rows="3" placeholder="Text to test against..."></textarea>
          </div>
          <div class="tool-form-group">
            <label>Flags</label>
            <input type="text" id="tool-flags" class="tool-input" value="g" placeholder="g, i, m, etc.">
          </div>
          <button class="btn btn-primary btn-sm" onclick="runRegexTest()">Test Regex</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'color-palette':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Base Color (optional)</label>
            <input type="text" id="tool-base" class="tool-input" placeholder="#6C63FF or leave empty for random">
          </div>
          <div class="tool-form-group">
            <label>Count</label>
            <input type="number" id="tool-count" class="tool-input" value="5" min="2" max="20">
          </div>
          <button class="btn btn-primary btn-sm" onclick="runColorPalette()">Generate Palette</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'markdown-preview':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Markdown</label>
            <textarea id="tool-input" class="tool-textarea" rows="10" placeholder="# Heading\n\n**bold** *italic* \`code\`\n\n- list item"></textarea>
          </div>
          <button class="btn btn-primary btn-sm" onclick="runMarkdownPreview()">Preview</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'env-template':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Type</label>
            <select id="tool-type" class="tool-input">
              <option value="general">General</option>
              <option value="nodejs">Node.js</option>
              <option value="laravel">Laravel</option>
              <option value="react">React</option>
              <option value="python">Python/Flask</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" onclick="runEnvTemplate()">Generate Template</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'sql-format':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>SQL Query</label>
            <textarea id="tool-input" class="tool-textarea" rows="8" placeholder="SELECT * FROM users WHERE id=1"></textarea>
          </div>
          <button class="btn btn-primary btn-sm" onclick="runSqlFormat()">Format SQL</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'lorem-ipsum':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Type</label>
            <select id="tool-type" class="tool-input">
              <option value="paragraph">Paragraphs</option>
              <option value="sentence">Sentences</option>
              <option value="word">Words</option>
            </select>
          </div>
          <div class="tool-form-group">
            <label>Count</label>
            <input type="number" id="tool-count" class="tool-input" value="3" min="1" max="20">
          </div>
          <button class="btn btn-primary btn-sm" onclick="runLoremIpsum()">Generate</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'cron-generator':
      html = `
        <div class="tool-panel">
          <div class="tool-form-row">
            <div class="tool-form-group">
              <label>Minute</label>
              <input type="text" id="tool-minute" class="tool-input" value="*">
            </div>
            <div class="tool-form-group">
              <label>Hour</label>
              <input type="text" id="tool-hour" class="tool-input" value="*">
            </div>
            <div class="tool-form-group">
              <label>Day</label>
              <input type="text" id="tool-day" class="tool-input" value="*">
            </div>
            <div class="tool-form-group">
              <label>Month</label>
              <input type="text" id="tool-month" class="tool-input" value="*">
            </div>
            <div class="tool-form-group">
              <label>Weekday</label>
              <input type="text" id="tool-weekday" class="tool-input" value="*">
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="runCronGenerator()">Generate Cron</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'text-diff':
      html = `
        <div class="tool-panel">
          <div class="tool-form-group">
            <label>Original Text</label>
            <textarea id="tool-text1" class="tool-textarea" rows="6" placeholder="Original text..."></textarea>
          </div>
          <div class="tool-form-group">
            <label>Modified Text</label>
            <textarea id="tool-text2" class="tool-textarea" rows="6" placeholder="Modified text..."></textarea>
          </div>
          <button class="btn btn-primary btn-sm" onclick="runTextDiff()">Compare</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
      
    case 'snippets':
      html = `
        <div class="tool-panel">
          <div class="tool-form-row">
            <input type="text" id="snippet-title" class="tool-input" placeholder="Snippet title" style="flex:1;">
            <input type="text" id="snippet-lang" class="tool-input" placeholder="Language" style="flex:1;">
            <button class="btn btn-primary btn-sm" onclick="saveSnippet()">Save</button>
          </div>
          <textarea id="snippet-code" class="tool-textarea" rows="6" placeholder="Paste your code snippet here..." style="margin:8px 0;"></textarea>
          <input type="text" id="snippet-desc" class="tool-input" placeholder="Description (optional)" style="margin-bottom:8px;">
          <button class="btn btn-secondary btn-sm" onclick="loadSnippets()" style="margin-bottom:12px;">Load My Snippets</button>
          <div id="tool-result" class="tool-result"></div>
        </div>
      `;
      break;
  }
  
  container.innerHTML = html;
}

async function runDevTool(tool, params) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dev-tools/${tool}?${new URLSearchParams(params)}`);
    const data = await response.json();
    
    if (data.success) {
      const resultEl = document.getElementById('tool-result');
      if (resultEl) {
        if (data.formatted) {
          resultEl.innerHTML = `<pre class="tool-output">${escapeHtml(data.formatted)}</pre>`;
        } else if (data.html) {
          resultEl.innerHTML = `<div class="tool-output markdown-preview">${data.html}</div>`;
        } else if (data.result) {
          resultEl.innerHTML = `<pre class="tool-output">${escapeHtml(data.result)}</pre>`;
        } else if (data.template) {
          resultEl.innerHTML = `<pre class="tool-output">${escapeHtml(data.template)}</pre>`;
        } else if (data.uuids) {
          resultEl.innerHTML = `<pre class="tool-output">${data.uuids.join('\n')}</pre>`;
        } else if (data.colors) {
          resultEl.innerHTML = `<div class="tool-output color-palette-result">${data.colors.map(c => `<div class="color-swatch" style="background:${c};color:${isLightColor(c)?'#000':'#fff'};padding:8px 12px;border-radius:6px;margin:4px;display:inline-block;font-family:monospace;">${c}</div>`).join('')}</div>`;
        } else if (data.matches) {
          resultEl.innerHTML = `<pre class="tool-output">Matches: ${data.count}\n${data.matches.map(m => `Line ${m.index + 1}: ${m.match}`).join('\n')}</pre>`;
        } else if (data.diff) {
          resultEl.innerHTML = `<pre class="tool-output">Changes: ${data.changes}\n${data.diff.map(d => `Line ${d.line}: ${d.changed ? 'CHANGED' : 'same'}\n  Original: ${d.original}\n  Modified: ${d.modified}`).join('\n\n')}</pre>`;
        } else if (data.expression) {
          resultEl.innerHTML = `<pre class="tool-output">Expression: ${data.expression}\nDescription: ${data.description}</pre>`;
        } else if (data.snippets) {
          resultEl.innerHTML = data.snippets.map(s => `<div class="snippet-item"><strong>${escapeHtml(s.title)}</strong> <span style="color:var(--text-muted);font-size:0.8rem;">${s.language}</span><pre style="margin-top:4px;max-height:120px;overflow:auto;">${escapeHtml(s.description || '')}</pre></div>`).join('');
        } else if (data.snippet) {
          resultEl.innerHTML = `<pre class="tool-output">${escapeHtml(data.snippet.code)}</pre>`;
        } else if (data.history) {
          resultEl.innerHTML = data.history.map(h => `<div class="history-item" style="padding:8px;border-bottom:1px solid var(--border-color);"><strong>${escapeHtml(h.tool)}</strong> <span style="color:var(--text-muted);font-size:0.75rem;">${new Date(h.created_at).toLocaleString()}</span><pre style="margin-top:4px;font-size:0.85rem;">${escapeHtml(h.input.substring(0, 100))}</pre></div>`).join('');
        } else {
          resultEl.innerHTML = `<pre class="tool-output">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
        }
      }
      
      if (tool !== 'snippets' && tool !== 'history') {
        saveToolHistory(tool, JSON.stringify(params), JSON.stringify(data));
      }
    } else {
      const resultEl = document.getElementById('tool-result');
      if (resultEl) {
        resultEl.innerHTML = `<div class="tool-error">${escapeHtml(data.error || 'Operation failed')}</div>`;
      }
    }
  } catch (err) {
    const resultEl = document.getElementById('tool-result');
    if (resultEl) {
      resultEl.innerHTML = `<div class="tool-error">Network error: ${err.message}</div>`;
    }
  }
}

function isLightColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

async function runFormatCode() {
  const code = document.getElementById('tool-input')?.value;
  const lang = document.getElementById('tool-lang')?.value;
  if (!code) return;
  await runDevTool('format-code', { code, language: lang });
}

async function runFormatJson() {
  const json = document.getElementById('tool-input')?.value;
  if (!json) return;
  await runDevTool('format-json', { json });
}

async function runBase64() {
  const text = document.getElementById('tool-input')?.value;
  const action = document.getElementById('tool-action')?.value;
  if (!text) return;
  await runDevTool('base64', { text, action });
}

async function runUuid() {
  const count = document.getElementById('tool-count')?.value || 1;
  await runDevTool('uuid', { count });
}

async function runRegexTest() {
  const pattern = document.getElementById('tool-pattern')?.value;
  const text = document.getElementById('tool-input')?.value;
  const flags = document.getElementById('tool-flags')?.value;
  if (!pattern || text === undefined) return;
  await runDevTool('regex-test', { pattern, text, flags });
}

async function runColorPalette() {
  const base = document.getElementById('tool-base')?.value;
  const count = document.getElementById('tool-count')?.value || 5;
  await runDevTool('color-palette', { base, count });
}

async function runMarkdownPreview() {
  const markdown = document.getElementById('tool-input')?.value;
  if (!markdown) return;
  await runDevTool('markdown-preview', { markdown });
}

async function runEnvTemplate() {
  const type = document.getElementById('tool-type')?.value;
  await runDevTool('env-template', { type });
}

async function runSqlFormat() {
  const sql = document.getElementById('tool-input')?.value;
  if (!sql) return;
  await runDevTool('sql-format', { sql });
}

async function runLoremIpsum() {
  const count = document.getElementById('tool-count')?.value || 3;
  const type = document.getElementById('tool-type')?.value;
  await runDevTool('lorem-ipsum', { count, type });
}

async function runCronGenerator() {
  const minute = document.getElementById('tool-minute')?.value || '*';
  const hour = document.getElementById('tool-hour')?.value || '*';
  const day = document.getElementById('tool-day')?.value || '*';
  const month = document.getElementById('tool-month')?.value || '*';
  const weekday = document.getElementById('tool-weekday')?.value || '*';
  await runDevTool('cron-generator', { minute, hour, day, month, weekday });
}

async function runTextDiff() {
  const text1 = document.getElementById('tool-text1')?.value;
  const text2 = document.getElementById('tool-text2')?.value;
  if (!text1 || text2 === undefined) return;
  await runDevTool('text-diff', { text1, text2 });
}

async function saveSnippet() {
  const title = document.getElementById('snippet-title')?.value;
  const language = document.getElementById('snippet-lang')?.value;
  const code = document.getElementById('snippet-code')?.value;
  const description = document.getElementById('snippet-desc')?.value;
  
  if (!title || !code) {
    alert('Title and code are required');
    return;
  }
  
  await fetch(`${API_BASE_URL}/api/dev-tools/snippets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUserId, title, language, code, description })
  });
  
  document.getElementById('snippet-title').value = '';
  document.getElementById('snippet-lang').value = '';
  document.getElementById('snippet-code').value = '';
  document.getElementById('snippet-desc').value = '';
  
  loadSnippets();
}

async function loadSnippets() {
  const response = await fetch(`${API_BASE_URL}/api/dev-tools/snippets?user_id=${currentUserId}`);
  const data = await response.json();
  const resultEl = document.getElementById('tool-result');
  if (resultEl && data.success) {
    if (data.snippets.length === 0) {
      resultEl.innerHTML = '<div class="tool-empty">No saved snippets</div>';
      return;
    }
    resultEl.innerHTML = data.snippets.map(s => `
      <div class="snippet-item">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong>${escapeHtml(s.title)}</strong>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="loadSnippet(${s.id})">Load</button>
            <button class="btn btn-secondary btn-sm" onclick="deleteSnippet(${s.id})">Delete</button>
          </div>
        </div>
        <span style="color:var(--text-muted);font-size:0.8rem;">${s.language} - ${new Date(s.created_at).toLocaleDateString()}</span>
        ${s.description ? `<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px;">${escapeHtml(s.description)}</div>` : ''}
      </div>
    `).join('');
  }
}

async function loadSnippet(id) {
  const response = await fetch(`${API_BASE_URL}/api/dev-tools/snippets/${id}?user_id=${currentUserId}`);
  const data = await response.json();
  if (data.success) {
    document.getElementById('snippet-code').value = data.snippet.code;
    document.getElementById('snippet-title').value = data.snippet.title;
    document.getElementById('snippet-lang').value = data.snippet.language;
    document.getElementById('snippet-desc').value = data.snippet.description || '';
    switchTool('snippets');
  }
}

async function deleteSnippet(id) {
  if (!confirm('Delete this snippet?')) return;
  await fetch(`${API_BASE_URL}/api/dev-tools/snippets/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUserId })
  });
  loadSnippets();
}

async function saveToolHistory(tool, input, output) {
  try {
    await fetch(`${API_BASE_URL}/api/dev-tools/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, tool, input: input.substring(0, 1000), output: output.substring(0, 2000) })
    });
  } catch (e) {
    // silent fail
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', function(e) {
      const btn = document.getElementById('verify-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Verifying...';
      }
    });
  }
});
