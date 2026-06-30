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

To enable contact form emails for your Primecrest site using the cPanel email account:

### Required SMTP values
- `SMTP_HOST=mail.primecrestenterprise.com`
- `SMTP_USER=info@primecrestenterprise.com`
- `SMTP_PASS=<email account password>`
- `SENDER_EMAIL=info@primecrestenterprise.com`
- `ADMIN_EMAIL=info@primecrestenterprise.com`

### Recommended cPanel SMTP settings
Use the SSL/TLS settings from cPanel for best results:

```powershell
$env:SMTP_HOST = 'mail.primecrestenterprise.com'
$env:SMTP_PORT = '465'
$env:SMTP_SECURE = 'true'
$env:SMTP_USER = 'info@primecrestenterprise.com'
$env:SMTP_PASS = 'your_email_password'
$env:SENDER_EMAIL = 'info@primecrestenterprise.com'
$env:ADMIN_EMAIL = 'info@primecrestenterprise.com'

npm run start
```

> Important: do not commit the actual password into Git. Keep it in a local `backend/.env` file or in your deployment environment variables.

If you prefer non-SSL/TLS, use:

```powershell
$env:SMTP_HOST = 'mail.primecrestenterprise.com'
$env:SMTP_PORT = '587'
$env:SMTP_SECURE = 'false'
$env:SMTP_USER = 'info@primecrestenterprise.com'
$env:SMTP_PASS = 'your_email_password'
$env:SENDER_EMAIL = 'info@primecrestenterprise.com'
$env:ADMIN_EMAIL = 'info@primecrestenterprise.com'

npm run start
```

### Notes
- Port `465` requires `SMTP_SECURE=true`
- Port `587` requires `SMTP_SECURE=false`
- The password must be the email account password for `info@primecrestenterprise.com`

### Supported SMTP Providers
- **cPanel mail**: mail.primecrestenterprise.com (port 465 for SSL/TLS)
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
