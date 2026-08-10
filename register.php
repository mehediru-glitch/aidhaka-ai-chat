<?php
require_once __DIR__ . '/includes/functions.php';

if (isLoggedIn()) {
    redirect('/chat.php');
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    setSecurityHeaders();
    
    $fullName = sanitize($_POST['full_name'] ?? '');
    $email = sanitize($_POST['email'] ?? '');
    $phone = sanitize($_POST['phone'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    if (empty($fullName) || empty($email) || empty($phone) || empty($password)) {
        $error = 'Please fill in all fields';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid email';
    } elseif ($password !== $confirmPassword) {
        $error = 'Passwords do not match';
    } else {
        $strength = validatePasswordStrength($password);
        if (!$strength['valid']) {
            $error = $strength['message'];
        } else {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            
            if ($stmt->fetch()) {
                $error = 'Email already registered';
            } else {
                $passwordHash = hashPassword($password);
                $stmt = $pdo->prepare("INSERT INTO users (full_name, email, phone, password_hash, trial_start) VALUES (?, ?, ?, ?, CURDATE())");
                
                if ($stmt->execute([$fullName, $email, $phone, $passwordHash])) {
                    regenerateSessionId();
                    $_SESSION['user_id'] = $pdo->lastInsertId();
                    redirect('/chat.php');
                } else {
                    $error = 'Registration failed. Please try again.';
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - Aidhaka AI</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/style.css">
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
                <h2 data-i18n="register_title">Create Account</h2>
                <p data-i18n="register_subtitle">Start your 15-day free trial</p>
            </div>
            
            <?php if ($error): ?>
                <div class="alert alert-error visible"><?= sanitize($error); ?></div>
            <?php endif; ?>
            
            <form method="POST" action="" class="auth-form" id="register-form">
                <?= csrfField(); ?>
                <div class="form-group">
                    <label class="form-label" data-i18n="label_full_name">Full Name</label>
                    <input type="text" name="full_name" class="form-input" placeholder="Enter your full name" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" data-i18n="label_email">Email Address</label>
                    <input type="email" name="email" class="form-input" placeholder="you@example.com" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" data-i18n="label_phone">Phone Number</label>
                    <input type="tel" name="phone" class="form-input" placeholder="01712345678" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" data-i18n="label_password">Password</label>
                    <div class="password-wrapper">
                        <input type="password" name="password" id="register-password" class="form-input" placeholder="Min. 8 characters" required minlength="8" oninput="checkPasswordStrength(this.value)">
                        <button type="button" class="password-toggle" onclick="togglePassword('register-password', this)" aria-label="Toggle password visibility">
                            👁️
                        </button>
                    </div>
                    <div class="password-strength">
                        <div class="password-strength-bar" id="password-strength-bar"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label" data-i18n="label_confirm_password">Confirm Password</label>
                    <div class="password-wrapper">
                        <input type="password" name="confirm_password" id="confirm-password" class="form-input" placeholder="Re-enter password" required>
                        <button type="button" class="password-toggle" onclick="togglePassword('confirm-password', this)" aria-label="Toggle password visibility">
                            👁️
                        </button>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block" data-i18n="btn_register">Create Account</button>
            </form>
            
            <div class="auth-footer">
                <span data-i18n="auth_has_account">Already have an account?</span>
                <a href="/login.php" data-i18n="auth_login_link">Sign in</a>
            </div>
        </div>
    </div>

    <script src="/assets/js/translations.js"></script>
    <script src="/assets/js/main.js"></script>
</body>
</html>
