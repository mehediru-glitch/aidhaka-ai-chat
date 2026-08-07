// ============================================
// Aidhaka AI - Main JavaScript
// ============================================

let currentLang = localStorage.getItem('aidhaka_lang') || 'en';
let isChatLoading = false;
let chatHistoryLoaded = false;

document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  initNavbar();
  initChat();
  initAnimations();
  
  // Load chat history from API
  if (typeof currentUserId !== 'undefined') {
    loadChatHistory();
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
}

async function loadChatHistory() {
  if (chatHistoryLoaded) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/history?user_id=${currentUserId}`);
    const data = await response.json();
    
    if (data.success && data.history && data.history.length > 0) {
      const container = document.getElementById('chat-messages');
      container.innerHTML = '';
      
      data.history.forEach(msg => {
        appendMessage('user', msg.question, false);
        appendMessage('assistant', msg.answer, false);
      });
      
      chatHistoryLoaded = true;
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.error('Failed to load chat history:', err);
  }
}

async function sendMessage() {
  const textarea = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const message = textarea.value.trim();

  if (!message || isChatLoading) return;

  isChatLoading = true;
  sendBtn.disabled = true;
  textarea.value = '';
  textarea.style.height = 'auto';

  appendMessage('user', message);
  showSkeletonLoading();

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: message,
        language: currentLang,
        user_id: currentUserId
      })
    });

    const data = await response.json();
    removeSkeletonLoading();

    if (data.reply) {
      appendMessage('assistant', data.reply);
      chatHistoryLoaded = true;
    } else {
      appendMessage('assistant', data.error || t('chat_error'));
    }
  } catch (err) {
    removeSkeletonLoading();
    appendMessage('assistant', t('chat_network_error'));
  } finally {
    isChatLoading = false;
    sendBtn.disabled = false;
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

function appendMessage(role, content, animate = true) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${role}`;
  if (!animate) messageDiv.style.animation = 'none';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'You' : 'AI';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.textContent = content;

  messageContent.appendChild(messageText);
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);
  container.appendChild(messageDiv);

  container.scrollTop = container.scrollHeight;
}

function downloadChat() {
  const messages = document.querySelectorAll('.message-text');
  if (messages.length === 0) {
    alert('No chat history to download');
    return;
  }

  let content = `Aidhaka AI - Chat History\n`;
  content += `Generated: ${new Date().toLocaleString()}\n`;
  content += `${'='.repeat(50)}\n\n`;

  const messageDivs = document.querySelectorAll('.message');
  messageDivs.forEach(msg => {
    const role = msg.classList.contains('message-user') ? 'You' : 'Aidhaka AI';
    const text = msg.querySelector('.message-text')?.textContent || '';
    content += `[${role}]: ${text}\n\n`;
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
}

function startNewChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  container.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-avatar">AI</div>
      <h3 data-i18n="welcome_title">Hello! I'm Aidhaka AI</h3>
      <p data-i18n="welcome_subtitle">How can I help you today? Ask me anything in English, Bangla, or Hindi.</p>
    </div>
  `;
  
  chatHistoryLoaded = false;
}

function clearChat() {
  if (!confirm('Clear all chat history?')) return;
  
  fetch(`${API_BASE_URL}/api/chat/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUserId })
  }).then(() => {
    startNewChat();
  }).catch(err => {
    console.error('Failed to clear chat:', err);
    startNewChat();
  });
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
