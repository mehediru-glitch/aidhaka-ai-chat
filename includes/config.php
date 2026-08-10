<?php
/**
 * Aidhaka AI Chat - Configuration
 */

$apiKeys = [];

if (file_exists(__DIR__ . '/../aidhaka.json')) {
    $content = @file_get_contents(__DIR__ . '/../aidhaka.json');
    if ($content !== false) {
        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            $apiKeys = $decoded;
        }
    }
}

$dbPass = getenv('DB_PASS') ?: ($apiKeys['db_pass'] ?? '');

if (empty($dbPass)) {
    error_log('Database password not configured. Set DB_PASS environment variable.');
}

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'diamonds_aidhaka');
define('DB_USER', getenv('DB_USER') ?: 'diamonds_aidhaka');
define('DB_PASS', $dbPass);
define('SITE_URL', getenv('SITE_URL') ?: 'https://aidhaka.aiammu.com');
define('APP_NAME', 'Aidhaka AI');

define('OMNIROUTE_API_KEY', getenv('OMNIROUTE_API_KEY') ?: ($apiKeys['omniroute'] ?? ''));
define('COHERE_API_KEY', getenv('COHERE_API_KEY') ?: ($apiKeys['cohere'] ?? ''));
define('PAYMENT_API_KEY', getenv('PAYMENT_API_KEY') ?: ($apiKeys['payment'] ?? ''));

$bkashNumber = getenv('BKASH_NUMBER') ?: ($apiKeys['bkash'] ?? '');
if (!empty($bkashNumber)) {
    define('BKASH_NUMBER', $bkashNumber);
}

define('PAYMENT_API_URL', 'https://pay.aiammu.com/api/verify.php');
define('PAYMENT_AMOUNT', 2000);

define('API_BASE_URL', 'https://aidhaka-ai-chat.onrender.com');

define('OMNIROUTE_ENDPOINT', 'https://cloud.omniroute.online/v1/chat/completions');
define('OMNIROUTE_MODEL', 'deepseek/deepseek-chat');

define('TRIAL_DAYS', 15);

date_default_timezone_set('Asia/Dhaka');

ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_only_cookies', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cache_limiter', 'nocache');
