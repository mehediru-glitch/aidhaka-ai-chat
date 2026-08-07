<?php
require_once __DIR__ . '/includes/functions.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Aidhaka AI - Your Intelligent AI Assistant powered by DeepSeek. Chat in English, Bangla, or Hindi.">
    <title>Aidhaka AI - Your Intelligent AI Assistant</title>
    <link rel="icon" href="data:;base64,iVBORw0KGgo=">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <nav class="navbar" id="navbar">
        <div class="container nav-container">
            <a href="/" class="logo">
                <div class="logo-icon">AI</div>
                <span class="logo-text">Aidhaka</span>
            </a>
            <ul class="nav-links" id="nav-links">
                <li><a href="#features" data-i18n="nav_features">Features</a></li>
                <?php if (isLoggedIn()): ?>
                    <li><a href="/chat.php" data-i18n="nav_chat">Chat</a></li>
                    <li><a href="/logout.php" class="btn btn-outline" data-i18n="nav_logout">Logout</a></li>
                <?php else: ?>
                    <li><a href="/login.php" data-i18n="nav_login">Login</a></li>
                    <li><a href="/register.php" class="btn btn-primary" data-i18n="nav_register">Get Started</a></li>
                <?php endif; ?>
            </ul>
            <div class="nav-actions">
                <div class="lang-toggle" id="lang-toggle">
                    <button class="lang-btn active" data-lang="en" onclick="setLanguage('en')">EN</button>
                    <button class="lang-btn" data-lang="bn" onclick="setLanguage('bn')">বাংলা</button>
                </div>
                <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </div>
    </nav>

    <section class="hero" id="hero">
        <div class="hero-bg">
            <div class="hero-orb"></div>
            <div class="hero-orb orb-2"></div>
        </div>
        <div class="container hero-container">
            <div class="hero-content">
                <div class="hero-badge">
                    <span class="badge-dot"></span>
                    <span data-i18n="hero_badge">AI-Powered Assistant</span>
                </div>
                <div class="trial-banner">
                    <span>⚡</span>
                    <span>15 days free trial • No credit card required</span>
                </div>
                <h1 class="hero-title">
                    <span data-i18n="hero_title_1">Your Intelligent</span><br>
                    <span class="gradient-text" data-i18n="hero_title_2">AI Companion</span>
                </h1>
                <p class="hero-subtitle" data-i18n="hero_subtitle">
                    Experience the power of multi-provider AI. Chat in English, Bangla, or Hindi and get instant, intelligent responses.
                </p>
                <div class="hero-cta">
                    <?php if (isLoggedIn()): ?>
                        <a href="/chat.php" class="btn btn-primary btn-lg" data-i18n="hero_cta_chat">Start Chatting</a>
                    <?php else: ?>
                        <a href="/register.php" class="btn btn-primary btn-lg" data-i18n="hero_cta_primary">Start Free Trial</a>
                        <a href="#features" class="btn btn-secondary btn-lg" data-i18n="hero_cta_secondary">Learn More</a>
                    <?php endif; ?>
                </div>
            </div>
            <div class="hero-visual">
                <div class="ai-orb">
                    <div class="orb-inner">
                        <div class="orb-ring"></div>
                        <div class="orb-ring ring-2"></div>
                        <div class="orb-ring ring-3"></div>
                        <div class="orb-core"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="hero-scroll">
            <span data-i18n="scroll_text">Scroll to explore</span>
            <div class="scroll-arrow"></div>
        </div>
    </section>

    <section class="features" id="features">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title" data-i18n="features_title">Why Choose Aidhaka AI?</h2>
                <p class="section-subtitle" data-i18n="features_subtitle">Built with cutting-edge AI technology to provide you with the best conversational experience.</p>
            </div>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🌐</div>
                    <h3 data-i18n="feat_1_title">Bilingual Support</h3>
                    <p data-i18n="feat_1_desc">Chat seamlessly in English, Bangla, or Hindi. AI understands and responds naturally in your preferred language.</p>
                </div>
                <div class="feature-card">
                <div class="feature-icon">🧠</div>
                <h3 data-i18n="feat_2_title">Multi-Provider AI</h3>
                <p data-i18n="feat_2_desc">Powered by multiple AI providers (Pollinations, Groq, Gemini, Cohere, DeepSeek) with automatic fallback for reliable responses every time.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📝</div>
                    <h3 data-i18n="feat_3_title">Chat History</h3>
                    <p data-i18n="feat_3_desc">All your conversations are saved securely. Download your chat history anytime in .txt format.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎁</div>
                    <h3 data-i18n="feat_4_title">Free Trial</h3>
                    <p data-i18n="feat_4_desc">Start with 15 days free trial. No credit card required. Experience full features before you pay.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔒</div>
                    <h3 data-i18n="feat_5_title">Secure & Private</h3>
                    <p data-i18n="feat_5_desc">Your data is encrypted and secure. We prioritize your privacy above everything.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📱</div>
                    <h3 data-i18n="feat_6_title">Mobile Friendly</h3>
                    <p data-i18n="feat_6_desc">Access from any device. Perfect experience on mobile, tablet, and desktop.</p>
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>&copy; <?= date('Y'); ?> Aidhaka AI. All rights reserved.</p>
        </div>
    </footer>

    <script src="/assets/js/translations.js"></script>
    <script src="/assets/js/main.js"></script>
</body>
</html>
