<?php
require_once __DIR__ . '/includes/functions.php';

if (isLoggedIn()) {
    redirect('/chat.php');
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    setSecurityHeaders();
    
    $email = sanitize($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        $error = 'Please fill in all fields';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid email';
    } elseif (!checkLoginAttempts($email)) {
        $error = 'Too many failed attempts. Please try again in 15 minutes.';
    } else {
        $stmt = $pdo->prepare("SELECT id, password_hash, is_paid FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && verifyPassword($password, $user['password_hash'])) {
            recordLoginAttempt($email, true);
            regenerateSessionId();
            $_SESSION['user_id'] = $user['id'];
            
            if (!$user['is_paid'] && !checkTrial()) {
                redirect('/payment.php');
            }
            
            redirect('/chat.php');
        } else {
            recordLoginAttempt($email, false);
            $error = 'Invalid email or password';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Aidhaka AI</title>
    <link rel="icon" href="favicon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="auth-page">
    <div class="auth-bg">
        <div class="auth-orb"></div>
    </div>
    
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-header">
                <a href="/" class="logo">
                    <div class="logo-icon">AI</div>
                    <span class="logo-text">Aidhaka</span>
                </a>
                <h2 data-i18n="login_title">Welcome Back</h2>
                <p data-i18n="login_subtitle">Sign in to continue your AI journey</p>
            </div>
            
            <?php if ($error): ?>
                <div class="alert alert-error visible"><?= sanitize($error); ?></div>
            <?php endif; ?>
            
            <form method="POST" action="" class="auth-form" id="login-form">
                <?= csrfField(); ?>
                <div class="form-group">
                    <label class="form-label" data-i18n="label_email">Email Address</label>
                    <input type="email" name="email" class="form-input" placeholder="you@example.com" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" data-i18n="label_password">Password</label>
                    <div class="password-wrapper">
                        <input type="password" name="password" id="login-password" class="form-input" placeholder="Enter your password" required>
                        <button type="button" class="password-toggle" onclick="togglePassword('login-password', this)" aria-label="Toggle password visibility">
                            👁️
                        </button>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block" data-i18n="btn_login">Sign In</button>
            </form>
            
            <div class="auth-footer">
                <span data-i18n="auth_no_account">Don't have an account?</span>
                <a href="/register.php" data-i18n="auth_register_link">Sign up</a>
            </div>
        </div>
    </div>

    <script src="assets/js/translations.js"></script>
    <script src="assets/js/main.js"></script>
</body>
</html>
