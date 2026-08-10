<?php
/**
 * Aidhaka AI Chat - Configuration
 */

// Database
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'diamonds_aidhaka');
define('DB_USER', getenv('DB_USER') ?: 'diamonds_aidhaka');
define('DB_PASS', getenv('DB_PASS') ?: 'omorhafsaM1@');
define('SITE_URL', getenv('SITE_URL') ?: 'https://aidhaka.aiammu.com');
define('APP_NAME', 'Aidhaka AI');

// Chat cache directory (OUTSIDE web root)
define('CACHE_DIR', '/home/diamonds/aidhaka-cache');

// API Keys file (OUTSIDE web root)
define('KEYS_FILE', '/home/diamonds/aidhaka.json');

// Load API keys
$apiKeys = [];
if (file_exists(KEYS_FILE)) {
    $content = @file_get_contents(KEYS_FILE);
    if ($content !== false) {
        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            $apiKeys = $decoded;
        }
    }
}

define('OMNIROUTE_API_KEY', $apiKeys['omniroute'] ?? '');
define('COHERE_API_KEY', $apiKeys['cohere'] ?? '');
define('PAYMENT_API_KEY', $apiKeys['payment'] ?? '');
define('BKASH_NUMBER', $apiKeys['bkash'] ?? '01552665356');

// Payment Gateway
define('PAYMENT_API_URL', 'https://pay.aiammu.com/api/verify.php');
define('PAYMENT_AMOUNT', 2000);

// API Base URL (for external deployment on Render.com)
define('API_BASE_URL', 'https://aidhaka-ai-chat.onrender.com');

// OmniRoute
define('OMNIROUTE_ENDPOINT', 'https://cloud.omniroute.online/v1/chat/completions');
define('OMNIROUTE_MODEL', 'deepseek/deepseek-chat');

// Trial
define('TRIAL_DAYS', 15);

// Timezone
date_default_timezone_set('Asia/Dhaka');

// Session security
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_only_cookies', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cache_limiter', 'nocache');
