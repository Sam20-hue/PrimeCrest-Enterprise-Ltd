# Primecrest Backend API

This backend exposes simple REST endpoints for the Primecrest frontend app (`src/services/mysqlService.ts`).

## Local config

- MySQL host: `localhost`
- MySQL user: `root`
- MySQL password: `Sam20???`
- MySQL database: `primecrest_enterprise`
- Backend port: `3001`

## Install and run

```bash
cd backend
npm install
npm run start
```

## MySQL setup

```bash
mysql -u root -p
# then use Sam20??? password
SOURCE sql/init.sql;
```

## Test

- `curl http://localhost:3001/api/health`
- `curl http://localhost:3001/api/services`

## 2FA Setup (Authenticator App)

The backend uses TOTP (Time-based One-Time Password) via authenticator apps like Google Authenticator, Authy, or Microsoft Authenticator.

**No configuration needed** — just start the backend and login to admin. On first login after password, you'll see a QR code to scan.

1. Admin enters password
2. Backend shows QR code
3. Admin scans QR with authenticator app
4. Admin enters 6-digit code to confirm
5. On future logins, admin enters 6-digit code from app

## Contact Form Email Setup

To enable contact form emails (visitors can send messages that arrive in your inbox at samsonakula3@gmail.com):

### Requirements
- SMTP server credentials (Gmail, Outlook, SendGrid, etc.)
- For Gmail: Use app-specific password if 2FA is enabled

### Setup Steps (PowerShell)

```powershell
# Set these environment variables before running npm start
$env:SMTP_HOST = 'smtp.gmail.com'
$env:SMTP_PORT = '587'
$env:SMTP_SECURE = 'false'
$env:SMTP_USER = 'your-email@gmail.com'
$env:SMTP_PASS = 'your-app-password'
$env:SENDER_EMAIL = 'your-email@gmail.com'

# Then start the backend
npm run start
```

### Gmail Setup (Recommended)
1. Enable 2-Step Verification on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and "Windows Computer"
4. Google will generate a 16-character app password
5. Use that app password as `SMTP_PASS` in the command above

### Supported SMTP Providers
- **Gmail**: smtp.gmail.com (port 587, secure: false)
- **Outlook**: smtp-mail.outlook.com (port 587, secure: false)
- **SendGrid**: smtp.sendgrid.net (port 587, secure: false)
- **AWS SES**: email-smtp.[region].amazonaws.com (port 587)

### Email Features
- **To Admin**: Professional HTML email with visitor details
- **To Visitor**: Confirmation email acknowledging receipt
- **Auto-reply**: Sent from your configured email

## Frontend

Open admin settings in frontend and set `MySQL API Base URL` to `http://localhost:3001`, then click Test Connection.
