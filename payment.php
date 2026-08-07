<?php
require_once __DIR__ . '/includes/functions.php';
requireAuth();

$user = getUser();
if (!$user) {
    redirect('/login.php');
}

$isPaid = $user['is_paid'];
if ($isPaid) {
    redirect('/chat.php');
}

$trialDaysLeft = getTrialDaysLeft();
if ($trialDaysLeft > 0) {
    redirect('/chat.php');
}

$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $trxid = sanitize($_POST['trxid'] ?? '');
    $amount = sanitize($_POST['amount'] ?? '');
    
    if (empty($trxid) || empty($amount)) {
        $message = 'Please fill in all fields';
        $messageType = 'error';
    } elseif ((int)$amount !== PAYMENT_AMOUNT) {
        $message = 'Please enter the correct amount: ৳' . PAYMENT_AMOUNT;
        $messageType = 'error';
    } else {
        $ch = curl_init(PAYMENT_API_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'trxid' => $trxid,
            'amount' => $amount
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . PAYMENT_API_KEY
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $result = json_decode($response, true);
        
        if ($httpCode === 200 && isset($result['status'])) {
            if ($result['status'] === 'verified') {
                $stmt = $pdo->prepare("UPDATE users SET is_paid = TRUE, paid_at = NOW() WHERE id = ?");
                $stmt->execute([$user['id']]);
                $message = 'Payment verified successfully! Redirecting...';
                $messageType = 'success';
                echo '<script>setTimeout(() => window.location.href = "/chat.php", 2000);</script>';
            } elseif ($result['status'] === 'pending') {
                $message = 'Payment is pending. Please wait 1-2 minutes and try again.';
                $messageType = 'warning';
            } else {
                $message = 'Payment verification failed. Please contact support.';
                $messageType = 'error';
            }
        } else {
            $message = 'Payment verification service unavailable. Please try again later.';
            $messageType = 'error';
        }
    }
}

$bkashNumber = BKASH_NUMBER;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment - Aidhaka AI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="payment-page">
    <div class="payment-bg">
        <div class="payment-orb"></div>
    </div>
    
    <div class="payment-container">
        <div class="payment-card">
            <div class="payment-header">
                <div class="payment-icon">💳</div>
                <h2 data-i18n="payment_title">Upgrade to Premium</h2>
                <p data-i18n="payment_subtitle">Get unlimited access to Aidhaka AI</p>
            </div>
            
            <?php if ($message): ?>
                <div class="alert alert-<?= $messageType; ?> visible">
                    <?= sanitize($message); ?>
                </div>
            <?php endif; ?>
            
            <div class="payment-amount">
                <span class="amount-currency">৳</span>
                <span class="amount-value">2000</span>
                <span class="amount-period">/month</span>
            </div>
            
            <div class="payment-methods">
                <div class="payment-method-card selected">
                    <div class="method-icon">📱</div>
                    <div class="method-name">bKash</div>
                    <div class="method-number" style="cursor: pointer;" onclick="copyToClipboard('<?= sanitize($bkashNumber); ?>')" title="Click to copy">
                        <?= sanitize($bkashNumber); ?> 📋
                    </div>
                </div>
            </div>
            
            <div class="payment-instructions">
                <h4 data-i18n="payment_steps_title">Payment Steps</h4>
                <ol>
                    <li data-i18n="payment_step_1">Open bKash app on your phone</li>
                    <li data-i18n="payment_step_2">Send <strong>৳2000</strong> to <strong><?= sanitize($bkashNumber); ?></strong></li>
                    <li data-i18n="payment_step_3">Copy the Transaction ID (TRXID)</li>
                    <li data-i18n="payment_step_4">Enter TRXID and amount below</li>
                </ol>
            </div>
            
            <form method="POST" action="" class="payment-form" id="payment-form">
                <div class="form-group">
                    <label class="form-label" data-i18n="label_trxid">Transaction ID (TRXID)</label>
                    <input type="text" name="trxid" class="form-input" placeholder="e.g., ABC123XYZ789" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" data-i18n="label_amount">Amount (৳)</label>
                    <input type="number" name="amount" class="form-input" value="2000" required min="2000" step="1">
                </div>
                
                <button type="submit" class="btn btn-primary btn-block" data-i18n="btn_verify" id="verify-btn">
                    <span class="btn-text">Verify Payment</span>
                </button>
            </form>
            
            <div class="payment-footer">
                <p data-i18n="payment_note">After verification, you'll get 1 year of unlimited access for ৳2000.</p>
                <p style="margin-top: 8px;">
                    📞 Need help? <a href="https://wa.me/8801552665356" target="_blank" style="color: var(--accent-primary);">WhatsApp Support</a>
                </p>
            </div>
        </div>
    </div>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied: ' + text);
            });
        }
    </script>

    <script src="/assets/js/translations.js"></script>
    <script src="/assets/js/main.js"></script>
</body>
</html>
