<?php
require_once __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

function getUser() {
    if (!isLoggedIn()) return null;
    global $pdo;
    $stmt = $pdo->prepare("SELECT id, full_name, email, phone, language, trial_start, is_paid FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}

function requireAuth() {
    if (!isLoggedIn()) {
        header('Location: /login.php');
        exit;
    }
}

function checkTrial() {
    $user = getUser();
    if (!$user) return false;
    if ($user['is_paid']) return true;
    
    $trialStart = new DateTime($user['trial_start']);
    $trialEnd = (clone $trialStart)->modify('+' . TRIAL_DAYS . ' days');
    return new DateTime() < $trialEnd;
}

function getTrialDaysLeft() {
    $user = getUser();
    if (!$user) return 0;
    if ($user['is_paid']) return -1;
    
    $trialStart = new DateTime($user['trial_start']);
    $trialEnd = (clone $trialStart)->modify('+' . TRIAL_DAYS . ' days');
    $now = new DateTime();
    
    if ($now >= $trialEnd) return 0;
    return (int)$trialEnd->diff($now)->days;
}

function sanitize($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function redirect($url) {
    header('Location: ' . $url);
    exit;
}

function jsonResponse($data, $status = 200) {
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function csrfToken() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrfField() {
    return '<input type="hidden" name="csrf_token" value="' . csrfToken() . '">';
}

function verifyCsrf() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
    if (empty($token) || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Invalid security token']);
        exit;
    }
}

function regenerateSessionId() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    session_regenerate_id(true);
}

function checkLoginAttempts($email) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT login_attempts, locked_until FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && $user['locked_until']) {
            $lockedUntil = new DateTime($user['locked_until']);
            if (new DateTime() < $lockedUntil) {
                return false;
            }
        }
        
        if ($user && $user['login_attempts'] >= 5) {
            if (!$user['locked_until']) {
                $lockedUntil = new DateTime();
                $lockedUntil->modify('+15 minutes');
                $stmt = $pdo->prepare("UPDATE users SET locked_until = ? WHERE email = ?");
                $stmt->execute([$lockedUntil->format('Y-m-d H:i:s'), $email]);
            }
            return false;
        }
    } catch (PDOException $e) {
        error_log('Login throttling not available: ' . $e->getMessage());
    }
    
    return true;
}

function recordLoginAttempt($email, $success = false) {
    global $pdo;
    
    try {
        if ($success) {
            $stmt = $pdo->prepare("UPDATE users SET login_attempts = 0, locked_until = NULL WHERE email = ?");
            $stmt->execute([$email]);
        } else {
            $stmt = $pdo->prepare("SELECT login_attempts FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            $attempts = ($user ? $user['login_attempts'] : 0) + 1;
            
            if ($attempts >= 5) {
                $lockedUntil = new DateTime();
                $lockedUntil->modify('+15 minutes');
                $stmt = $pdo->prepare("UPDATE users SET login_attempts = ?, locked_until = ? WHERE email = ?");
                $stmt->execute([$attempts, $lockedUntil->format('Y-m-d H:i:s'), $email]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET login_attempts = ? WHERE email = ?");
                $stmt->execute([$attempts, $email]);
            }
        }
    } catch (PDOException $e) {
        error_log('Login attempt recording not available: ' . $e->getMessage());
    }
}

function checkConcurrentSessions($userId, $maxSessions = 3) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM chat_sessions 
        WHERE user_id = ? 
        AND updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ");
    $stmt->execute([$userId]);
    $result = $stmt->fetch();
    
    return $result && $result['count'] < $maxSessions;
}

function getPasswordStrength($password) {
    $strength = 0;
    if (strlen($password) >= 8) $strength++;
    if (strlen($password) >= 12) $strength++;
    if (preg_match('/[a-z]/', $password) && preg_match('/[A-Z]/', $password)) $strength++;
    if (preg_match('/[0-9]/', $password)) $strength++;
    if (preg_match('/[^a-zA-Z0-9]/', $password)) $strength++;
    
    return $strength;
}

function validatePasswordStrength($password) {
    if (strlen($password) < 8) {
        return ['valid' => false, 'message' => 'Password must be at least 8 characters'];
    }
    
    $strength = getPasswordStrength($password);
    
    if ($strength < 3) {
        return ['valid' => false, 'message' => 'Password is too weak. Use uppercase, lowercase, numbers, and symbols'];
    }
    
    return ['valid' => true, 'strength' => $strength];
}

function setSecurityHeaders() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
}

function generateSecureToken($length = 32) {
    return bin2hex(random_bytes($length));
}
