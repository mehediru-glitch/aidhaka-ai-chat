function initChat() {
  const messageInput = document.getElementById('messageInput');
  if (!messageInput) return;

  messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
  });

  messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = document.getElementById('chatForm');
      if (form) form.dispatchEvent(new Event('submit'));
    }
  });
}

document.addEventListener('DOMContentLoaded', initChat);
