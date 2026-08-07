<?php
require_once __DIR__ . '/includes/functions.php';
requireAuth();

$user = getUser();
if (!$user) {
    redirect('/login.php');
}

$isPaid = $user['is_paid'];
$trialDaysLeft = getTrialDaysLeft();

if (!$isPaid && $trialDaysLeft === 0) {
    redirect('/payment.php');
}

$userLanguage = $user['language'] ?? 'en';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat - Aidhaka AI</title>
    <link rel="icon" href="data:;base64,iVBORw0KGgo=">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="chat-page">
    <aside class="chat-sidebar" id="chat-sidebar">
        <div class="sidebar-header">
            <a href="/" class="logo">
                <div class="logo-icon">AI</div>
                <span class="logo-text">Aidhaka</span>
            </a>
            <button class="sidebar-close" id="sidebar-close" aria-label="Close sidebar">
                <span></span>
                <span></span>
            </button>
        </div>
        
        <div class="sidebar-content">
            <div class="sidebar-section">
                <button class="btn btn-primary btn-sm" style="width: 100%; margin-bottom: 12px;" onclick="startNewChat()" data-i18n="chat_new">
                    + New Chat
                </button>
                <div class="sidebar-section-title" data-i18n="sidebar_history">Chat History</div>
                <div class="history-header-actions">
                    <button class="history-clear-btn" onclick="clearAllHistory()" data-i18n="chat_clear">Clear All</button>
                </div>
                <div class="history-list" id="history-list">
                    <div class="history-empty" data-i18n="history_empty">No chat history yet</div>
                </div>
            </div>
        </div>
        
        <div class="sidebar-footer">
            <div class="user-info">
                <div class="user-avatar"><?= strtoupper(substr($user['full_name'], 0, 1)); ?></div>
                <div class="user-details">
                    <div class="user-name"><?= sanitize($user['full_name']); ?></div>
                    <div class="user-status">
                        <?php if ($isPaid): ?>
                            <span class="badge badge-success" data-i18n="status_paid">Premium</span>
                        <?php else: ?>
                            <span class="badge badge-warning"><?= $trialDaysLeft; ?> <?= $trialDaysLeft === 1 ? 'day' : 'days'; ?> left</span>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <div class="sidebar-actions">
                <button class="btn btn-secondary btn-sm" onclick="downloadChat()" data-i18n="btn_download">Download</button>
                <a href="/logout.php" class="btn btn-outline btn-sm" data-i18n="btn_logout">Logout</a>
            </div>
        </div>
    </aside>

    <main class="chat-main">
        <div class="chat-header">
            <button class="menu-toggle" id="menu-toggle" aria-label="Toggle sidebar">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <h1 data-i18n="chat_title">Aidhaka AI Chat</h1>
            <div class="lang-toggle">
                <button class="lang-btn active" data-lang="en" onclick="setLanguage('en')">EN</button>
                <button class="lang-btn" data-lang="bn" onclick="setLanguage('bn')">বাংলা</button>
            </div>
        </div>
        
        <div class="chat-messages" id="chat-messages">
            <div class="welcome-message">
                <div class="welcome-avatar">AI</div>
                <h3 data-i18n="welcome_title">Hello! I'm Aidhaka AI</h3>
                <p data-i18n="welcome_subtitle">How can I help you today? Ask me anything in English, Bangla, or Hindi.</p>
            </div>
        </div>
        
        <div class="chat-input-container">
            <div class="input-wrapper">
                <textarea 
                    id="chat-input" 
                    class="chat-input" 
                    rows="1" 
                    placeholder="Type your message..."
                    data-i18n-placeholder="chat_placeholder"
                ></textarea>
                <button class="send-btn" id="send-btn" aria-label="Send message">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
            <div class="typing-indicator" id="typing-indicator" style="display: none;">
                <span></span>
                <span></span>
                <span></span>
            </div>
            
            <div class="chat-actions">
            </div>
        </div>
    </main>

    <script src="/assets/js/translations.js"></script>
    <script src="/assets/js/main.js"></script>
    <script>
        const currentLanguage = '<?= $userLanguage; ?>';
        const currentUserId = <?= $user['id']; ?>;
        const API_BASE_URL = 'https://aidhaka-ai-chat.onrender.com';
        const HISTORY_API_URL = '/api/chat';
    </script>
</body>
</html>
