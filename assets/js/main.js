// ============================================
// Aidhaka AI - Main JavaScript
// ============================================

let currentLang = localStorage.getItem('aidhaka_lang') || 'en';
let isChatLoading = false;
let chatHistoryLoaded = false;
let notificationEnabled = true;
let lastFailedMessage = '';

document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  initNavbar();
  initChat();
  initAnimations();
  
  if (document.body.classList.contains('chat-page')) {
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

async function loadChatHistory() {
  if (chatHistoryLoaded) return;
  
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  try {
    const response = await fetch(`${HISTORY_API_URL}/index.php?user_id=${currentUserId}`);
    
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
      loadSidebarHistory(data.history);
    }
  } catch (err) {
    if (typeof __DEBUG__ !== 'undefined') {
      console.error('Failed to load chat history:', err);
    }
  }
}

function loadSidebarHistory(history) {
  const historyList = document.getElementById('history-list');
  if (!historyList || !history || history.length === 0) return;

  try {
    historyList.innerHTML = '';
    
    history.forEach((msg, index) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.dataset.index = index;
      
      const content = document.createElement('div');
      content.className = 'history-item-content';
      
      const preview = msg.question.length > 40 ? msg.question.substring(0, 40) + '...' : msg.question;
      content.innerHTML = `
        <div class="history-question">${escapeHtml(preview)}</div>
        <div class="history-time">${new Date(msg.created_at).toLocaleString()}</div>
      `;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'history-delete-btn';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Delete this chat';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSingleHistory(item, msg.question);
      });
      
      item.appendChild(content);
      item.appendChild(deleteBtn);
      
      item.addEventListener('click', () => {
        const container = document.getElementById('chat-messages');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
      
      historyList.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load sidebar history:', err);
  }
}

async function deleteSingleHistory(itemElement, question) {
  if (!confirm('Delete this chat?')) return;
  
  try {
    const response = await fetch(`${HISTORY_API_URL}/index.php?user_id=${currentUserId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    
    if (response.ok) {
      if (itemElement) {
        itemElement.remove();
      }
      chatHistoryLoaded = false;
      loadChatHistory();
    }
  } catch (err) {
    console.error('Failed to delete chat:', err);
  }
}

async function clearAllHistory() {
  if (!confirm('Clear all chat history? This cannot be undone.')) return;
  
  const btn = document.querySelector('.history-clear-btn');
  if (btn) btn.disabled = true;
  
  try {
    const response = await fetch(`${HISTORY_API_URL}/index.php?user_id=${currentUserId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      startNewChat();
    }
  } catch (err) {
    console.error('Failed to clear chat:', err);
    startNewChat();
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function saveToHistoryLocally(question, answer, provider) {
  try {
    const response = await fetch(`${HISTORY_API_URL}/index.php?user_id=${currentUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, provider })
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

function isImageRequest(text) {
  const lower = text.toLowerCase();
  const imagePhrases = [
    'generate image', 'create image', 'make image', 'draw image',
    'generate a image', 'create a image', 'make a image', 'draw a image',
    'generate an image', 'create an image', 'make an image', 'draw an image',
    'generate picture', 'create picture', 'make picture', 'draw picture',
    'generate a picture', 'create a picture', 'make a picture', 'draw a picture',
    'generate photo', 'create photo', 'make photo', 'draw photo',
    'generate a photo', 'create a photo', 'make a photo', 'draw a photo',
    'generate illustration', 'create illustration', 'make illustration',
    'generate art', 'create art', 'make art',
    'draw a', 'draw me', 'draw for me',
    'image of', 'picture of', 'photo of', 'illustration of', 'painting of', 'artwork of',
    'text to image', 'txt2img',
    'show me an image', 'show me a picture', 'show me an picture',
    'i want an image', 'i want a picture', 'i want a photo',
    'make me an image', 'make me a picture', 'make me a photo',
    'generate for me', 'create for me', 'make for me'
  ];
  
  if (imagePhrases.some(phrase => lower.includes(phrase))) {
    return true;
  }
  
  const hasImageWord = ['image', 'picture', 'photo', 'illustration', 'painting', 'artwork', 'drawing', 'sketch', 'portrait', 'landscape'].some(w => lower.includes(w));
  const hasActionWord = ['generate', 'create', 'make', 'draw', 'render'].some(w => lower.includes(w));
  
  if (hasImageWord && hasActionWord) {
    const codeWords = ['code', 'program', 'function', 'app', 'website', 'database', 'api', 'html', 'css', 'javascript', 'python', 'java', 'react', 'sql', 'bug', 'error', 'fix'];
    const hasCodeContext = codeWords.some(w => lower.includes(w));
    if (!hasCodeContext) return true;
  }
  
  return false;
}

async function sendMessage(retryMessage = null) {
  const textarea = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const container = document.getElementById('chat-messages');
  const message = retryMessage || textarea.value.trim();

  if (!message || isChatLoading) return;

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

    if (isImageRequest(message)) {
      clearTimeout(timeoutId);
      removeSkeletonLoading();
      
      appendMessage('assistant', 'Generating image...', true, 'pollinations');
      isChatLoading = false;
      sendBtn.disabled = false;
      
      try {
        const imgRes = await fetch(`${API_BASE_URL}/api/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: message, user_id: currentUserId })
        });
        const imgData = await imgRes.json();
        
        if (imgData.success && imgData.imageUrl) {
          lastGeneratedImageUrl = imgData.imageUrl;
          appendImageMessage(imgData.imageUrl, message);
          saveToHistoryLocally(message, imgData.imageUrl, 'image');
        } else {
          appendMessage('assistant', imgData.error || t('chat_error'), true, null, true);
        }
      } catch (imgErr) {
        appendMessage('assistant', t('chat_network_error'), true, null, true);
      }
      
      textarea.focus();
      return;
    }

    if (isImageEditRequest(message)) {
      clearTimeout(timeoutId);
      removeSkeletonLoading();
      
      appendMessage('user', message);
      await handleImageEdit(message);
      
      textarea.focus();
      return;
    }

    const useStreaming = message.length > 100;
    const endpoint = useStreaming ? '/api/chat/stream' : '/api/chat';
    
    if (useStreaming) {
      clearTimeout(timeoutId);
      removeSkeletonLoading();
      
      appendMessage('user', message);
      const streamingMsg = await appendStreamingMessage('', 'pollinations');
      
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: message,
            language: currentLang,
            user_id: currentUserId
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          if (streamingMsg) {
            const textEl = streamingMsg.querySelector('.streaming-text');
            if (textEl) {
              textEl.innerHTML = parseMarkdown(fullText);
              container.scrollTop = container.scrollHeight;
            }
          }
        }
        
        if (streamingMsg) {
          streamingMsg.classList.remove('streaming');
          const textEl = streamingMsg.querySelector('.streaming-text');
          if (textEl) textEl.classList.remove('streaming-text');
        }
        
        chatHistoryLoaded = true;
        lastFailedMessage = '';
        playNotificationSound();
        saveToHistoryLocally(message, fullText, 'pollinations');
      } catch (err) {
        if (streamingMsg) {
          streamingMsg.remove();
        }
        if (err.name === 'AbortError') {
          appendMessage('assistant', 'Request timed out. Please try again.');
        } else {
          lastFailedMessage = message;
          appendMessage('assistant', t('chat_network_error'), true, null, true);
        }
      } finally {
        isChatLoading = false;
        sendBtn.disabled = false;
        textarea.focus();
      }
      
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: message,
        language: currentLang,
        user_id: currentUserId
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const data = await response.json();
    removeSkeletonLoading();

    if (data.reply) {
      appendMessage('assistant', data.reply, true, data.provider);
      chatHistoryLoaded = true;
      lastFailedMessage = '';
      playNotificationSound();
      
      saveToHistoryLocally(message, data.reply, data.provider || 'unknown');
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

function appendMessage(role, content, animate = true, provider = null, isError = false) {
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

  if (role === 'assistant' && provider) {
    const providerBadge = document.createElement('div');
    providerBadge.className = 'message-provider';
    providerBadge.textContent = provider;
    messageContent.appendChild(providerBadge);
  }

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

async function appendStreamingMessage(content, provider = null, isError = false) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message message-assistant streaming';
  if (isError) messageDiv.classList.add('message-error');

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = 'AI';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  if (provider) {
    const providerBadge = document.createElement('div');
    providerBadge.className = 'message-provider';
    providerBadge.textContent = provider;
    messageContent.appendChild(providerBadge);
  }

  const messageText = document.createElement('div');
  messageText.className = 'message-text streaming-text';
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

  const words = content.split(' ');
  let currentText = '';
  
  for (let i = 0; i < words.length; i++) {
    currentText += (i > 0 ? ' ' : '') + words[i];
    messageText.innerHTML = parseMarkdown(currentText);
    container.scrollTop = container.scrollHeight;
    await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
  }

  messageDiv.classList.remove('streaming');
  return messageDiv;
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

function isImageEditRequest(text) {
  const lower = text.toLowerCase();
  const editPhrases = [
    'change', 'edit', 'modify', 'update', 'replace', 'remove', 'add',
    'make the', 'change the', 'edit the', 'replace the',
    'different', 'another', 'new', 'instead',
    'red sky', 'blue sky', 'green sky',
    'different color', 'different background',
    'with a', 'without a', 'add a', 'remove a'
  ];
  
  const imageWords = ['image', 'picture', 'photo', 'illustration', 'painting', 'artwork', 'drawing', 'generated', 'created'];
  
  if (editPhrases.some(p => lower.includes(p)) && lastGeneratedImageUrl !== null) {
    const hasImageContext = imageWords.some(w => lower.includes(w));
    const hasActionContext = ['generate', 'create', 'make', 'draw', 'render', 'show'].some(w => lower.includes(w));
    
    if (hasImageContext || hasActionContext) return true;
    
    const codeWords = ['code', 'program', 'function', 'app', 'website', 'database', 'api', 'html', 'css', 'javascript', 'python', 'java', 'react', 'sql', 'bug', 'error', 'fix', 'password', 'profile', 'account', 'name', 'email'];
    const hasCodeContext = codeWords.some(w => lower.includes(w));
    
    if (!hasCodeContext) return true;
  }
  return false;
}

let lastGeneratedImageUrl = null;

async function handleImageEdit(prompt) {
  if (!lastGeneratedImageUrl) {
    appendMessage('assistant', 'No previous image to edit. Please generate an image first.', true, null, true);
    return;
  }
  
  appendMessage('assistant', 'Editing image...', true, 'pollinations');
  
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const editedImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true&image=${encodeURIComponent(lastGeneratedImageUrl)}`;
    
    lastGeneratedImageUrl = editedImageUrl;
    appendImageMessage(editedImageUrl, prompt);
    saveToHistoryLocally(prompt, editedImageUrl, 'image-edit');
  } catch (err) {
    appendMessage('assistant', t('chat_image_error'), true, null, true);
  }
}

function appendImageMessage(imageUrl, prompt, animate = true) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message message-assistant';
  if (!animate) messageDiv.style.animation = 'none';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = 'AI';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  const providerBadge = document.createElement('div');
  providerBadge.className = 'message-provider';
  providerBadge.textContent = 'image';
  messageContent.appendChild(providerBadge);

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'generated-image-wrapper';
  
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = prompt || 'AI generated image';
  img.className = 'generated-image';
  img.loading = 'lazy';
  
  imageWrapper.appendChild(img);
  messageContent.appendChild(imageWrapper);

  const imageCaption = document.createElement('div');
  imageCaption.className = 'message-text';
  imageCaption.innerHTML = parseMarkdown(prompt || '');
  messageContent.appendChild(imageCaption);

  const imageActions = document.createElement('div');
  imageActions.className = 'image-actions';
  
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'image-btn';
  downloadBtn.textContent = '⬇ Download';
  downloadBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'aidhaka-image-' + Date.now() + '.png';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
  
  const openBtn = document.createElement('button');
  openBtn.className = 'image-btn';
  openBtn.textContent = '🔗 Open';
  openBtn.addEventListener('click', () => {
    window.open(imageUrl, '_blank');
  });
  
  imageActions.appendChild(downloadBtn);
  imageActions.appendChild(openBtn);
  messageContent.appendChild(imageActions);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);
  container.appendChild(messageDiv);

  container.scrollTop = container.scrollHeight;
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
