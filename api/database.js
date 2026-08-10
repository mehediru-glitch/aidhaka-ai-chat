const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'diamonds_aidhaka',
  password: process.env.DB_PASS || 'omorhafsaM1@',
  database: process.env.DB_NAME || 'diamonds_aidhaka',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
}).promise();

async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS routing_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        question_hash VARCHAR(64) NOT NULL,
        question TEXT NOT NULL,
        selected_provider VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        confidence REAL,
        quality_score REAL,
        response_time INT,
        success INT DEFAULT 1,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session (session_id),
        INDEX idx_provider (selected_provider),
        INDEX idx_category (category),
        INDEX idx_timestamp (timestamp)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255),
        session_id VARCHAR(255) NOT NULL,
        title TEXT,
        summary TEXT,
        topic_tags TEXT,
        turn_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        INDEX idx_conv_session (session_id),
        INDEX idx_conv_user (user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        parent_id INT,
        turn_number INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        sanitized_content TEXT,
        intent VARCHAR(100),
        sentiment VARCHAR(50),
        emotion VARCHAR(50),
        entities TEXT,
        message_references TEXT,
        provider VARCHAR(100),
        quality_score INT,
        satisfaction INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        FOREIGN KEY (parent_id) REFERENCES messages(id),
        INDEX idx_msg_conv (conversation_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        topic VARCHAR(255) NOT NULL,
        confidence REAL,
        mention_count INT DEFAULT 1,
        first_mentioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_mentioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        INDEX idx_topic_conv (conversation_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id VARCHAR(255) PRIMARY KEY,
        preferences TEXT,
        known_entities TEXT,
        interaction_count INT DEFAULT 0,
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        avg_satisfaction REAL,
        preferred_providers TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cache_key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cache_key (cache_key),
        INDEX idx_cache_expires (expires_at)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        provider VARCHAR(100) DEFAULT 'unknown',
        is_image INT DEFAULT 0,
        share_id VARCHAR(255),
        session_id VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_user (user_id),
        INDEX idx_chat_session (session_id)
      )
    `);

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error.message);
    return false;
  }
}

async function isHealthy() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

const run = (sql, params = []) => {
  return pool.query(sql, params).then(([result]) => {
    return { id: result.insertId || 0, changes: result.affectedRows || 0 };
  }).catch(err => {
    console.error('DB run error:', err.message);
    throw err;
  });
};

const get = (sql, params = []) => {
  return pool.query(sql, params).then(([rows]) => {
    return rows[0] || null;
  }).catch(err => {
    console.error('DB get error:', err.message);
    throw err;
  });
};

const all = (sql, params = []) => {
  return pool.query(sql, params).then(([rows]) => {
    return rows;
  }).catch(err => {
    console.error('DB all error:', err.message);
    throw err;
  });
};

module.exports = {
  pool,
  run,
  get,
  all,
  init,
  isHealthy
};
