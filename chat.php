<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aidhaka AI Chat</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="chat-container">
    <header class="chat-header">
      <div class="header-left">
        <a href="index.php" class="back-btn">←</a>
        <div class="header-info">
          <h1>Aidhaka AI</h1>
          <span class="status-indicator online"></span>
          <span class="status-text">Online</span>
        </div>
      </div>
      <div class="header-actions">
        <button id="clearChat" class="icon-btn" title="Clear chat">🗑️</button>
      </div>
    </header>

    <div id="chatMessages" class="chat-messages">
      <div class="message assistant">
        <div class="message-avatar">AI</div>
        <div class="message-content">
          <p>Hello! I'm Aidhaka AI, your advanced AI assistant. I can help you with:</p>
          <ul>
            <li>Coding and programming</li>
            <li>Creative writing and brainstorming</li>
            <li>Analysis and research</li>
            <li>Math and logic problems</li>
            <li>Multi-language support</li>
          </ul>
          <p>What would you like to explore today?</p>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <form id="chatForm" class="chat-form">
        <textarea
          id="messageInput"
          placeholder="Ask anything..."
          rows="1"
          autofocus
        ></textarea>
        <button type="submit" class="send-btn" id="sendBtn">
          <span class="send-icon">➤</span>
        </button>
      </form>
      <div class="input-footer">
        <span class="provider-info">Ready to help</span>
        <span class="char-count">0 / 10000</span>
      </div>
    </div>
  </div>

  <script src="assets/js/main.js"></script>
  <script>
    (function() {
      const RENDER_API_URL = 'https://aidhaka-ai-chat.onrender.com/api/chat';
      const chatMessages = document.getElementById('chatMessages');
      const chatForm = document.getElementById('chatForm');
      const messageInput = document.getElementById('messageInput');
      const sendBtn = document.getElementById('sendBtn');
      const clearBtn = document.getElementById('clearChat');
      const charCount = document.querySelector('.char-count');
      const providerInfo = document.querySelector('.provider-info');

      let conversationHistory = [];
      let conversationId = null;
      let userId = 'user_' + Math.random().toString(36).substring(2, 9);
      let isProcessing = false;

      function appendMessage(role, content, extra = {}) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? 'You' : 'AI';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `<p>${escapeHtml(content)}</p>`;

        if (extra.analytics) {
          const meta = document.createElement('div');
          meta.className = 'message-meta';
          meta.innerHTML = `<small>${extra.analytics.provider} • ${extra.analytics.responseTime}ms</small>`;
          contentDiv.appendChild(meta);
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(contentDiv);
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return msgDiv;
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
      }

      function showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = '<div class="message-avatar">AI</div><div class="message-content"><p>Thinking...</p></div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      function hideTyping() {
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();
      }

      async function sendMessage(e) {
        e.preventDefault();
        if (isProcessing) return;

        const question = messageInput.value.trim();
        if (!question) return;

        isProcessing = true;
        sendBtn.disabled = true;
        messageInput.value = '';
        messageInput.style.height = 'auto';
        charCount.textContent = '0 / 10000';

        appendMessage('user', question);
        showTyping();

        conversationHistory.push({ question, answer: '' });

        try {
          const response = await fetch(RENDER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question,
              user_id: userId,
              history: conversationHistory.slice(-10),
              conversation_id: conversationId
            })
          });

          const data = await response.json();
          hideTyping();

          if (data.success) {
            conversationHistory[conversationHistory.length - 1].answer = data.reply;
            appendMessage('assistant', data.reply, { analytics: data.analytics });
            providerInfo.textContent = data.provider ? `Provider: ${data.provider}` : 'Ready to help';
            if (data.conversationId) conversationId = data.conversationId;
          } else {
            appendMessage('assistant', 'Sorry, something went wrong. Please try again.');
            providerInfo.textContent = 'Error occurred';
          }
        } catch (err) {
          hideTyping();
          appendMessage('assistant', 'Network error. Please check your connection and try again.');
          providerInfo.textContent = 'Offline';
        } finally {
          isProcessing = false;
          sendBtn.disabled = false;
          messageInput.focus();
        }
      }

      chatForm.addEventListener('submit', sendMessage);

      messageInput.addEventListener('input', () => {
        const len = messageInput.value.length;
        charCount.textContent = `${len} / 10000`;
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
      });

      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          chatForm.dispatchEvent(new Event('submit'));
        }
      });

      clearBtn.addEventListener('click', async () => {
        if (!confirm('Clear chat history?')) return;
        chatMessages.innerHTML = '';
        conversationHistory = [];
        conversationId = null;
        appendMessage('assistant', 'Chat cleared. How can I help you?');
      });
    })();
  </script>
</body>
</html>
