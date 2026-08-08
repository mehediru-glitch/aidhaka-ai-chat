-- Database: diamonds_aidhaka
-- Users table + chat history

CREATE DATABASE IF NOT EXISTS diamonds_aidhaka
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE diamonds_aidhaka;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    trial_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_paid TINYINT(1) DEFAULT 0,
    paid_at DATETIME NULL,
    language VARCHAR(10) DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_is_paid (is_paid)
);

CREATE TABLE IF NOT EXISTS chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    provider VARCHAR(50) DEFAULT 'unknown',
    is_image TINYINT(1) DEFAULT 0,
    share_id VARCHAR(20) UNIQUE NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_share_id (share_id)
);

CREATE TABLE IF NOT EXISTS prompt_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    prompt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) DEFAULT 'New Chat',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_updated (user_id, updated_at)
);

CREATE TABLE IF NOT EXISTS shared_chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    share_id VARCHAR(20) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    messages JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_share_id (share_id)
);

-- For existing databases, run these ALTER statements:
-- ALTER TABLE chat_history ADD COLUMN session_id INT NULL,
--   ADD FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
--   ADD INDEX idx_session_created (session_id, created_at);
