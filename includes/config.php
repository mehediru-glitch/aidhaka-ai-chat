<?php
/**
 * Aidhaka AI Chat - Configuration
 */

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'diamonds_aidhaka');
define('DB_USER', 'diamonds_aidhaka');
define('DB_PASS', 'omorhafsaM1@');
define('SITE_URL', 'https://aidhaka.aiammu.com');
define('APP_NAME', 'Aidhaka AI');

// Chat cache directory (OUTSIDE web root)
define('CACHE_DIR', '/home/diamonds/aidhaka-cache');

// API Keys file (OUTSIDE web root)
// Change this to your actual cPanel username
define('KEYS_FILE', '/home/diamonds/aidhaka.json');

// Load API keys
$apiKeys = [];
if (file_exists(KEYS_FILE)) {
    $apiKeys = json_decode(file_get_contents(KEYS_FILE), true);
    if (!is_array($apiKeys)) {
        $apiKeys = [];
    }
}

define('OMNIROUTE_API_KEY', $apiKeys['omniroute'] ?? '');
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
ini_set('session.use_only_cookies', 1);
