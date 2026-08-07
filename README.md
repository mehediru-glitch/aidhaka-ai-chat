# Aidhaka AI Chatbot

A complete, production-ready AI chatbot web application powered by multiple AI providers with auto-fallback. Built with PHP, Node.js Express, MySQL, and premium dark theme UI.

## Features

- **User Authentication**: Registration, login, session management
- **15-Day Free Trial**: Automatic trial period with payment redirect
- **Bilingual Support**: English and Bangla interface
- **Unlimited AI Chat**: Multiple AI providers with auto-fallback (Pollinations, Groq, Gemini, DeepSeek, Cohere, OmniRoute)
- **Coding Assistant**: Full coding support with multiple AI models
- **Payment Integration**: bKash payment verification via pay.aiammu.com API
- **Responsive Design**: Mobile-first, works on all devices
- **Premium Dark Theme**: Glassmorphism, animations, gradient accents

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend (Pages)**: PHP with PDO
- **Backend (API)**: Node.js + Express
- **Database**: MySQL
- **Process Manager**: PM2

## File Structure

```
aidhaka-ai-chat/
├── index.php              # Homepage
├── login.php              # Login page
├── register.php           # Registration page
├── chat.php               # Chat interface
├── payment.php            # Payment page
├── logout.php             # Logout handler
├── database.sql           # MySQL schema (users table only)
├── .htaccess              # Clean URLs & security
├── aidhaka.json.example   # API keys template
├── package.json           # Node.js dependencies
├── ecosystem.config.js    # PM2 configuration
├── .env.example           # Environment variables
├── README.md              # This file
├── api/
│   └── server.js          # Express API server
├── assets/
│   ├── css/
│   │   └── style.css      # Premium dark theme
│   └── js/
│       ├── main.js        # Frontend logic
│       └── translations.js # EN/BN translations
├── includes/
│   ├── config.php         # Database & API keys config
│   ├── db.php             # PDO connection
│   └── functions.php      # Helper functions
└── logs/                  # PM2 logs
```

## Database

Only ONE table needed: `users`

```sql
CREATE TABLE users (
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

No chat history stored in DB - chat is unlimited and stateless.

## Installation Steps

### 1. Database Setup

1. Create MySQL database: `diamonds_aidhaka`
2. Username: `diamonds_aidhaka`
3. Password: `omorhafsaM1@`
4. Import `database.sql` via phpMyAdmin

### 2. Create API Keys File (CRITICAL - OUTSIDE WEB ROOT)

1. SSH into server: `ssh diamonds@aidhaka.aiammu.com`
2. Create keys file: `nano /home/diamonds/aidhaka.json`
3. Paste your keys:
```json
{
  "omniroute": "your-omniroute-key",
  "payment": "your-payment-key",
  "bkash": "01552665356",
  "groq": "your-groq-key",
  "gemini": "your-gemini-key",
  "deepseek": "your-deepseek-key",
  "cohere": "your-cohere-key"
}
```
4. Set permissions: `chmod 600 /home/diamonds/aidhaka.json`

### 3. Upload Files

1. Upload all files to `public_html/aidhaka/` via cPanel File Manager or FTP
2. Ensure `.htaccess` is uploaded (may be hidden)

### 4. Node.js API Setup

1. SSH into server:
```bash
cd public_html/aidhaka
npm install
```

2. Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Configure cPanel Node.js App (Alternative)

1. cPanel → Setup Node.js App
2. Application root: `public_html/aidhaka`
3. Application URL: `aidhaka.aiammu.com`
4. Startup file: `api/server.js`

### 6. Fix SSL

1. cPanel → SSL/TLS Status
2. Find `aidhaka.aiammu.com`
3. Click "Run AutoSSL"

## AI Providers (Auto Fallback)

1. **Pollinations AI** - 100% FREE, no API key needed
2. **Groq** - Free with API key (30 RPM)
3. **Google Gemini** - Free with API key (1,500/day)
4. **Cohere** - Free with API key (1,000/month)
5. **DeepSeek** - Limited free
6. **OmniRoute** - Your paid provider (cloud)

System automatically routes queries to the best provider and falls back if one fails.

## Payment Flow

1. User registers → 15-day trial starts
2. After 15 days → Redirect to payment.php
3. User sends ৳2000 via bKash to 01552665356
4. User enters TRXID and amount
5. Server calls `https://pay.aiammu.com/api/verify.php` with X-API-Key
6. If `status === "verified"` → `is_paid = TRUE` → Unlimited chat access
7. If `status === "pending"` → Show "please wait" message

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/chat` | Send message to AI |

## Language Support

- **English**: Default UI language
- **Bangla (বাংলা)**: Full translation available
- **Hindi/Devanagari**: Supported in chat input
- **Mixed Language**: Users can type in any combination

## Fonts

- **English**: Inter
- **Bangla**: Noto Sans Bengali
- **Hindi**: Hind Siliguri

## Troubleshooting

1. **API not working**: Check PM2 status with `pm2 status`
2. **Database errors**: Verify DB credentials in `includes/config.php`
3. **Keys not loading**: Verify path in `config.php` matches actual server path
4. **Payment failing**: Check API key in `aidhaka.json` and network connectivity
5. **SSL 526 error**: Run AutoSSL in cPanel

## License

Private - All rights reserved.
