require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({ storage });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'primecrest_enterprise',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Ensure settings table exists (with 2FA columns) for persistence.
(async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      siteName VARCHAR(255),
      logo VARCHAR(500),
      phone VARCHAR(100),
      email VARCHAR(255),
      address TEXT,
      footerText TEXT,
      aboutText TEXT,
      heroTitle VARCHAR(255),
      heroSubtitle VARCHAR(255),
      heroImage VARCHAR(500),
      admin2faSecret VARCHAR(255),
      admin2faEnabled TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    const [cols] = await pool.query("SHOW COLUMNS FROM settings LIKE 'admin2faSecret'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE settings ADD COLUMN admin2faSecret VARCHAR(255) NULL, ADD COLUMN admin2faEnabled TINYINT(1) DEFAULT 0");
      console.log('Added admin2faSecret/admin2faEnabled columns to settings');
    }

    // Ensure contacts table exists for message persistence
    await pool.query(`CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(100),
      service VARCHAR(255),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('Contacts table ensured');
  } catch (err) {
    console.error('Could not ensure settings/contacts table exist:', err.message || err);
  }
})();

// Email (Nodemailer) Configuration
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const smtpSecure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const senderEmail = process.env.SENDER_EMAIL || smtpUser;
const adminEmail = process.env.ADMIN_EMAIL || senderEmail;

let transporter = null;
if (smtpHost && smtpPort && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  });
  console.log('Email service initialized:', { host: smtpHost, port: smtpPort, user: smtpUser, adminEmail });
} else {
  console.warn('SMTP not fully configured. Contact form emails will not be sent.');
}

// Health-check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ping');
    return res.json({ status: 'ok', ping: rows[0] });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message || err });
  }
});

// Upload images (logo/gallery/etc.)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

// TOTP (Time-based One-Time Password) for Authenticator app
// Store 2FA secrets per admin email
const adminSecrets = new Map();

// Setup 2FA: generate secret and QR code
app.post('/api/auth/setup-2fa', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const secret = speakeasy.generateSecret({
    name: `Primecrest Enterprise (${email})`,
    issuer: 'Primecrest Enterprise',
  });

  try {
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    adminSecrets.set(email, { secret: secret.base32, verified: false });

    // Persist secret into settings table for stable reboots
    const [settingsRows] = await pool.query('SELECT id FROM settings LIMIT 1');
    if (settingsRows.length > 0) {
      await pool.query('UPDATE settings SET admin2faSecret = ?, admin2faEnabled = 0 WHERE id = ?', [secret.base32, settingsRows[0].id]);
    } else {
      await pool.query('INSERT INTO settings (admin2faSecret, admin2faEnabled) VALUES (?, ?)', [secret.base32, 0]);
    }

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'Scan this QR code with Google Authenticator, Authy, or Microsoft Authenticator',
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Verify 2FA token from authenticator app
app.post('/api/auth/verify-2fa', async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ error: 'Email and token are required' });

  let badgeSecret = null;
  let adminData = adminSecrets.get(email);

  try {
    const [settingsRows] = await pool.query('SELECT admin2faSecret FROM settings LIMIT 1');
    if (settingsRows.length > 0 && settingsRows[0].admin2faSecret) {
      badgeSecret = settingsRows[0].admin2faSecret;
    }
  } catch (err) {
    console.error('2FA verify fetch secret failed:', err);
  }

  if (!badgeSecret && adminData) {
    badgeSecret = adminData.secret;
  }

  if (!badgeSecret) {
    return res.status(400).json({ error: '2FA not set up for this email. Call setup-2fa first.' });
  }

  const verified = speakeasy.totp.verify({
    secret: badgeSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (verified) {
    if (adminData) {
      adminSecrets.set(email, { ...adminData, verified: true });
    }

    try {
      const [settingsRows] = await pool.query('SELECT id FROM settings LIMIT 1');
      if (settingsRows.length > 0) {
        await pool.query('UPDATE settings SET admin2faEnabled = 1 WHERE id = ?', [settingsRows[0].id]);
      }
    } catch (err) {
      console.error('2FA verify set enabled failed:', err);
    }

    res.json({ success: true, message: '2FA token verified!' });
  } else {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Check if 2FA setup exists for admin
app.get('/api/auth/2fa-status', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ setup: false, error: 'Email query parameter is required' });
  }

  try {
    const [rows] = await pool.query('SELECT admin2faSecret, admin2faEnabled FROM settings LIMIT 1');
    if (rows.length > 0 && rows[0].admin2faSecret) {
      return res.json({ setup: true, enabled: !!rows[0].admin2faEnabled });
    }

    const adminData = adminSecrets.get(email);
    return res.json({ setup: !!adminData, enabled: adminData?.verified || false });
  } catch (err) {
    return res.status(500).json({ setup: false, error: err.message || err });
  }
});

// Contact Form Email Handler
const generateContactEmailHTML = (name, email, phone, service, message) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9fafb;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 14px;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .field {
      margin-bottom: 25px;
      border-left: 4px solid #ea580c;
      padding-left: 15px;
    }
    .field-label {
      font-size: 12px;
      font-weight: 700;
      color: #ea580c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .field-value {
      font-size: 15px;
      color: #374151;
      word-break: break-word;
    }
    .message-box {
      background-color: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-top: 8px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 13px;
      color: #6b7280;
    }
    .footer-brand {
      color: #ea580c;
      font-weight: 700;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .button {
      display: inline-block;
      background-color: #ea580c;
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 20px;
      font-size: 14px;
    }
    .divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 25px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 New Contact Form Submission</h1>
      <p>A visitor has sent you a message through your website</p>
    </div>
    <div class="content">
      <p class="greeting">Hello Primecrest Team,</p>
      <p>You have received a new message from your website contact form:</p>
      
      <div class="field">
        <div class="field-label">Sender Name</div>
        <div class="field-value">${name}</div>
      </div>
      
      <div class="field">
        <div class="field-label">Email Address</div>
        <div class="field-value"><a href="mailto:${email}" style="color: #ea580c; text-decoration: none;">${email}</a></div>
      </div>
      
      ${phone ? `
      <div class="field">
        <div class="field-label">Phone Number</div>
        <div class="field-value"><a href="tel:${phone}" style="color: #ea580c; text-decoration: none;">${phone}</a></div>
      </div>
      ` : ''}
      
      ${service ? `
      <div class="field">
        <div class="field-label">Service of Interest</div>
        <div class="field-value">${service}</div>
      </div>
      ` : ''}
      
      <div class="field">
        <div class="field-label">Message</div>
        <div class="field-value">
          <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
        </div>
      </div>
      
      <hr class="divider">
      
      <p style="color: #6b7280; font-size: 13px;">
        <strong>Reply to:</strong> <a href="mailto:${email}" style="color: #ea580c; text-decoration: none;">${email}</a>
      </p>
    </div>
    <div class="footer">
      <div class="footer-brand">Primecrest Enterprise LTD</div>
      <p style="margin: 10px 0 0 0;">Professional Security & Digital Solutions<br>
      This email was generated by your website contact form.</p>
    </div>
  </div>
</body>
</html>
`;

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Save contact to database for persistence
  try {
    await pool.query('INSERT INTO contacts (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)', [
      name, email, phone || null, service || null, message
    ]);
  } catch (dbErr) {
    console.error('Failed to save contact to database:', dbErr.message || dbErr);
    // Continue with email logic even if DB save fails
  }

  // If SMTP is not configured, accept the message but do not fail UX.
  if (!transporter) {
    console.warn('Email service is not configured; contact form request is accepted without sending email.');
    return res.status(200).json({
      success: true,
      warning: 'Email service is not configured. Message received and will be handled manually.',
      message: 'Your message was received successfully.',
    });
  }

  try {
    const htmlContent = generateContactEmailHTML(name, email, phone, service, message);

    // Send email to admin
    await transporter.sendMail({
      from: senderEmail,
      to: adminEmail,
      subject: `New Contact Form Submission from ${name}`,
      html: htmlContent,
      replyTo: email,
    });

    // Optional: Send confirmation email to sender
    const confirmationHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f9fafb;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          padding: 40px 30px;
        }
        .footer {
          background-color: #f9fafb;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Message Received</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thank you for reaching out to Primecrest Enterprise! We have received your message and appreciate your interest.</p>
          <p>Our team will review your inquiry and get back to you as soon as possible, typically within 24-48 business hours.</p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
            <strong>Message Summary:</strong><br>
            Service: ${service || 'General Inquiry'}<br>
            Submitted: ${new Date().toLocaleString()}
          </p>
        </div>
        <div class="footer">
          <div style="color: #ea580c; font-weight: 700; font-size: 16px; margin-bottom: 10px;">Primecrest Enterprise LTD</div>
          <p style="margin: 0;">Professional Security & Digital Solutions</p>
        </div>
      </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
      from: senderEmail,
      to: email,
      subject: 'We Received Your Message - Primecrest Enterprise',
      html: confirmationHTML,
    });

    res.json({ success: true, message: 'Your message has been sent successfully. We will contact you soon!' });
  } catch (err) {
    console.error('Contact form email error:', err);
    const errorMessage = 'Failed to send email. Please try again later.';
    const detailed = process.env.NODE_ENV !== 'production' ? ` ${err.message || err}` : '';
    res.status(500).json({ error: `${errorMessage}${detailed}` });
  }
});

// Batch sync - overwrite the whole dataset (for full persistence overrides)
app.post('/api/sync', async (req, res) => {
  const { settings: settingsBody, services: servicesBody, gallery: galleryBody, blog: blogBody, products: productsBody, testimonials: testimonialsBody, team: teamBody } = req.body;
  try {
    // External syncing is optional - each sector may be present.
    if (Array.isArray(servicesBody)) {
      await pool.query('TRUNCATE TABLE services');
      for (const item of servicesBody) {
        await pool.query('INSERT INTO services (title, subtitle, icon, description) VALUES (?, ?, ?, ?)', [item.title, item.subtitle, item.icon, item.description]);
      }
    }
    if (Array.isArray(galleryBody)) {
      await pool.query('TRUNCATE TABLE gallery');
      for (const item of galleryBody) {
        await pool.query('INSERT INTO gallery (title, imageUrl) VALUES (?, ?)', [item.title, item.imageUrl]);
      }
    }
    if (Array.isArray(blogBody)) {
      await pool.query('TRUNCATE TABLE blog');
      for (const item of blogBody) {
        await pool.query('INSERT INTO blog (title, excerpt, content, published_at) VALUES (?, ?, ?, ?)', [item.title, item.excerpt, item.content, item.published_at || new Date()]);
      }
    }
    if (Array.isArray(productsBody)) {
      await pool.query('TRUNCATE TABLE products');
      for (const item of productsBody) {
        await pool.query('INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)', [item.name, item.description, item.price, item.image]);
      }
    }
    if (Array.isArray(testimonialsBody)) {
      await pool.query('TRUNCATE TABLE testimonials');
      for (const item of testimonialsBody) {
        await pool.query('INSERT INTO testimonials (name, role, photo, quote) VALUES (?, ?, ?, ?)', [item.name, item.role, item.photo, item.quote]);
      }
    }
    if (Array.isArray(teamBody)) {
      await pool.query('TRUNCATE TABLE team');
      for (const item of teamBody) {
        await pool.query('INSERT INTO team (name, role, imageUrl) VALUES (?, ?, ?)', [item.name, item.role, item.imageUrl]);
      }
    }
    if (settingsBody && typeof settingsBody === 'object') {
      const [existing] = await pool.query('SELECT * FROM settings LIMIT 1');
      if (existing.length === 0) {
        await pool.query('INSERT INTO settings (siteName, logo, phone, email, address, footerText, admin2faSecret, admin2faEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
          settingsBody.companyName || settingsBody.siteName || '',
          settingsBody.logoUrl || settingsBody.logo || '',
          settingsBody.phone || '',
          settingsBody.email || '',
          settingsBody.address || '',
          settingsBody.footerText || '',
          settingsBody.admin2faSecret || null,
          settingsBody.admin2faEnabled ? 1 : 0,
        ]);
      } else {
        const existingSecret = existing[0].admin2faSecret || null;
        const existingEnabled = existing[0].admin2faEnabled ? 1 : 0;

        await pool.query('UPDATE settings SET siteName = ?, logo = ?, phone = ?, email = ?, address = ?, footerText = ?, admin2faSecret = ?, admin2faEnabled = ? WHERE id = ?', [
          settingsBody.companyName || settingsBody.siteName || '',
          settingsBody.logoUrl || settingsBody.logo || '',
          settingsBody.phone || '',
          settingsBody.email || '',
          settingsBody.address || '',
          settingsBody.footerText || '',
          settingsBody.admin2faSecret || existingSecret,
          typeof settingsBody.admin2faEnabled !== 'undefined' ? (settingsBody.admin2faEnabled ? 1 : 0) : existingEnabled,
          existing[0].id,
        ]);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

// Generic CRUD helper for table names used in frontend
const autoCrud = (route, table, idColumn = 'id') => {
  app.get(`/api/${route}`, async (req, res) => {
    const [rows] = await pool.query(`SELECT * FROM ${table}`);
    res.json(rows);
  });

  app.post(`/api/${route}`, async (req, res) => {
    const payload = req.body;
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Empty payload' });
    }
    const [result] = await pool.query(`INSERT INTO ${table} SET ?`, [payload]);
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [result.insertId]);
    res.json(rows[0] || {});
  });

  app.put(`/api/${route}/:${idColumn}`, async (req, res) => {
    const id = req.params[idColumn];
    const payload = req.body;
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Empty payload' });
    }
    await pool.query(`UPDATE ${table} SET ? WHERE ${idColumn} = ?`, [payload, id]);
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [id]);
    res.json(rows[0] || {});
  });

  app.delete(`/api/${route}/:${idColumn}`, async (req, res) => {
    const id = req.params[idColumn];
    await pool.query(`DELETE FROM ${table} WHERE ${idColumn} = ?`, [id]);
    res.json({ success: true, id });
  });
};

// Register endpoints used by frontend
autoCrud('services', 'services');
autoCrud('gallery', 'gallery');
autoCrud('blog', 'blog');
autoCrud('products', 'products');
autoCrud('testimonials', 'testimonials');

// Contacts endpoint for admin
app.get('/api/contacts', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
  res.json(rows);
});

app.delete('/api/contacts', async (req, res) => {
  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'Contact id is required.' });
  }
  await pool.query('DELETE FROM contacts WHERE id = ?', [id]);
  res.json({ success: true, id });
});

app.get('/api/settings', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
  res.json(rows[0] || {});
});

app.put('/api/settings', async (req, res) => {
  const payload = req.body;
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'Empty payload' });
  }
  // Upsert first row in settings
  const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
  if (rows.length === 0) {
    const [result] = await pool.query('INSERT INTO settings (siteName, logo, phone, email, address, footerText, admin2faSecret, admin2faEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      payload.siteName || '',
      payload.logo || '',
      payload.phone || '',
      payload.email || '',
      payload.address || '',
      payload.footerText || '',
      payload.admin2faSecret || null,
      payload.admin2faEnabled ? 1 : 0,
    ]);
    const [newRow] = await pool.query('SELECT * FROM settings WHERE id = ?', [result.insertId]);
    return res.json(newRow[0] || {});
  }
  const settingsId = rows[0].id;
  // Preserve existing 2FA state
  const existingSecret = rows[0].admin2faSecret || null;
  const existingEnabled = rows[0].admin2faEnabled ? 1 : 0;
  
  await pool.query('UPDATE settings SET siteName = ?, logo = ?, phone = ?, email = ?, address = ?, footerText = ?, admin2faSecret = ?, admin2faEnabled = ? WHERE id = ?', [
    payload.siteName || rows[0].siteName || '',
    payload.logo || rows[0].logo || '',
    payload.phone || rows[0].phone || '',
    payload.email || rows[0].email || '',
    payload.address || rows[0].address || '',
    payload.footerText || rows[0].footerText || '',
    payload.admin2faSecret || existingSecret,
    typeof payload.admin2faEnabled !== 'undefined' ? (payload.admin2faEnabled ? 1 : 0) : existingEnabled,
    settingsId,
  ]);
  const [updated] = await pool.query('SELECT * FROM settings WHERE id = ?', [settingsId]);
  res.json(updated[0] || {});
});

// Seed endpoint for development convenience
app.post('/api/seed', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE services');
    await pool.query('TRUNCATE TABLE gallery');
    await pool.query('TRUNCATE TABLE blog');
    await pool.query('TRUNCATE TABLE products');
    await pool.query('TRUNCATE TABLE testimonials');
    await pool.query('TRUNCATE TABLE settings');

    await pool.query('INSERT INTO services (title, subtitle, icon, description) VALUES ?',[
      [
        ['Web Design', 'Modern responsive websites', 'ri-layout-3-line', 'We build fast, beautiful websites that convert.'],
        ['SEO Optimization', 'Higher search rankings', 'ri-search-line', 'Improve visibility and get more customers with SEO.'],
        ['Digital Marketing', 'Growth-focused campaigns', 'ri-rocket-line', 'From ads to social media, we grow your brand.']
      ]
    ]);

    await pool.query('INSERT INTO gallery (title, imageUrl) VALUES ?',[
      [
        ['Office Interior', 'https://via.placeholder.com/400x250?text=Gallery+1'],
        ['Product Launch', 'https://via.placeholder.com/400x250?text=Gallery+2'],
        ['Team Workshop', 'https://via.placeholder.com/400x250?text=Gallery+3']
      ]
    ]);

    await pool.query('INSERT INTO blog (title, excerpt, content, published_at) VALUES ?',[
      [
        ['How to Scale Your Business', 'Key steps to grow safely.', 'Step 1: ...', new Date()],
        ['Top 10 Marketing Tips', 'Quick wins for new brands.', 'Start by ...', new Date()]
      ]
    ]);

    await pool.query('INSERT INTO products (name, description, price, image) VALUES ?',[
      [
        ['Business Website Package', 'Full website with hosting', 499.99, 'https://via.placeholder.com/400x250?text=Product+1'],
        ['E-Commerce Store', 'Sell products online securely', 899.99, 'https://via.placeholder.com/400x250?text=Product+2']
      ]
    ]);

    await pool.query('INSERT INTO testimonials (name, role, photo, quote) VALUES ?',[
      [
        ['Jane Doe', 'CEO, Example Ltd', 'https://via.placeholder.com/100', 'Outstanding work and great support!'],
        ['John Smith', 'Founder, StartupX', 'https://via.placeholder.com/100', 'They helped us grow fast.']
      ]
    ]);

    await pool.query('INSERT INTO team (name, role, imageUrl) VALUES ?', [
      [
        ['Alice Kamau', 'Operations Manager', 'https://via.placeholder.com/100'],
        ['Paul Otieno', 'Chief Engineer', 'https://via.placeholder.com/100']
      ]
    ]);

    await pool.query('INSERT INTO settings (siteName, logo, phone, email, address, footerText) VALUES (?,?,?,?,?,?)',
      ['Primecrest Enterprise','https://via.placeholder.com/150','+1234567890','hello@primecrest.co.ke','123 Main Street, Nairobi','© 2026 Primecrest Enterprise']);

    res.json({ success: true, message: 'Seed data inserted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Primecrest backend listening on http://localhost:${PORT}`);
});
