<?php
require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (SITE_URL ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user_id = $_GET['user_id'] ?? $_POST['user_id'] ?? null;

if (!$user_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'user_id is required']);
    exit;
}

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        provider VARCHAR(50) DEFAULT 'unknown',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    try {
        $pdo->exec("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'unknown' AFTER answer");
    } catch (PDOException $alterErr) {
        error_log('Alter table note: ' . $alterErr->getMessage());
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->prepare('SELECT question, answer, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at ASC');
        $stmt->execute([$user_id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'history' => $history]);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $question = $input['question'] ?? '';
        $answer = $input['answer'] ?? '';
        $provider = $input['provider'] ?? 'unknown';
        
        if (!$question || !$answer) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'question and answer are required']);
            exit;
        }
        
        try {
            $stmt = $pdo->prepare('INSERT INTO chat_history (user_id, question, answer, provider) VALUES (?, ?, ?, ?)');
            $stmt->execute([$user_id, $question, $answer, $provider]);
        } catch (PDOException $insertErr) {
            error_log('Insert with provider failed: ' . $insertErr->getMessage());
            try {
                $stmt = $pdo->prepare('INSERT INTO chat_history (user_id, question, answer) VALUES (?, ?, ?)');
                $stmt->execute([$user_id, $question, $answer]);
            } catch (PDOException $insertErr2) {
                throw new PDOException('Failed to save chat: ' . $insertErr2->getMessage());
            }
        }
        
        echo json_encode(['success' => true, 'message' => 'Chat saved']);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $question = $input['question'] ?? null;
            
            if ($question) {
                $stmt = $pdo->prepare('DELETE FROM chat_history WHERE user_id = ? AND question = ?');
                $stmt->execute([$user_id, $question]);
                $deletedRows = $stmt->rowCount();
                
                if ($deletedRows === 0) {
                    $stmt = $pdo->prepare('DELETE FROM chat_history WHERE user_id = ?');
                    $stmt->execute([$user_id]);
                    $deletedRows = $stmt->rowCount();
                }
            } else {
                $stmt = $pdo->prepare('DELETE FROM chat_history WHERE user_id = ?');
                $stmt->execute([$user_id]);
                $deletedRows = $stmt->rowCount();
            }
            
            error_log("DELETE history for user $user_id: rows=$deletedRows");
            echo json_encode(['success' => true, 'message' => 'Chat history cleared', 'deleted_rows' => $deletedRows]);
        } catch (PDOException $deleteErr) {
            error_log('Delete failed: ' . $deleteErr->getMessage());
            echo json_encode(['success' => false, 'error' => 'Failed to clear history: ' . $deleteErr->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (PDOException $e) {
    error_log('Chat history error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
