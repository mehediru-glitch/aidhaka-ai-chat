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
