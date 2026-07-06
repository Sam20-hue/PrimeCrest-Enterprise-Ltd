# MySQL Backend Setup Guide

This guide explains how to set up a MySQL backend so that custom authors and other data are synchronized across all machines and users.

## Quick Start (Node.js/Express + MySQL)

### Step 1: Create Backend Project

```bash
mkdir primecrest-backend
cd primecrest-backend
npm init -y
npm install express mysql2 cors dotenv
```

### Step 2: Create `server.js`

```javascript
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'primecrest_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Authors endpoints
app.get('/api/authors', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM authors ORDER BY id DESC');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/authors', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const { id, name, subtitle, imageUrl, bio, joinDate, lastActive, linkedIn, upwork } = req.body;
    await conn.query(
      'INSERT INTO authors (id, name, subtitle, imageUrl, bio, joinDate, lastActive, linkedIn, upwork) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, subtitle, imageUrl, bio, joinDate, lastActive, linkedIn, upwork]
    );
    conn.release();
    res.json({ status: 'Created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/authors/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const { name, subtitle, imageUrl, bio, joinDate, lastActive, linkedIn, upwork } = req.body;
    await conn.query(
      'UPDATE authors SET name=?, subtitle=?, imageUrl=?, bio=?, joinDate=?, lastActive=?, linkedIn=?, upwork=? WHERE id=?',
      [name, subtitle, imageUrl, bio, joinDate, lastActive, linkedIn, upwork, req.params.id]
    );
    conn.release();
    res.json({ status: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/authors/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.query('DELETE FROM authors WHERE id=?', [req.params.id]);
    conn.release();
    res.json({ status: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all data (simplified)
app.post('/api/sync', async (req, res) => {
  try {
    const { authors } = req.body;
    
    if (authors && Array.isArray(authors)) {
      const conn = await pool.getConnection();
      // Clear existing authors and insert new ones
      await conn.query('TRUNCATE TABLE authors');
      for (const author of authors) {
        const { id, name, subtitle, imageUrl, bio, joinDate, lastActive, linkedIn, upwork } = author;
        await conn.query(
          'INSERT INTO authors (id, name, subtitle, imageUrl, bio, joinDate, lastActive, linkedIn, upwork) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, name, subtitle, imageUrl, bio, joinDate, lastActive, linkedIn, upwork]
        );
      }
      conn.release();
    }
    
    res.json({ status: 'Synced' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3: Create Database Tables

Run this SQL on your MySQL database:

```sql
CREATE TABLE IF NOT EXISTS authors (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  imageUrl LONGTEXT,
  bio LONGTEXT,
  joinDate VARCHAR(50),
  lastActive VARCHAR(50),
  linkedIn VARCHAR(500),
  upwork VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Step 4: Create `.env` File

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=primecrest_db
PORT=3001
```

### Step 5: Run Backend

```bash
node server.js
```

Your backend will be at: `http://localhost:3001`

## Step 6: Configure Frontend

1. Go to Admin Panel
2. Click **Settings**
3. Find **MySQL Database Connection**
4. Enter: `http://localhost:3001` (or your server URL)
5. Click **Test Connection**
6. Save Settings

## What Gets Synced

Once configured, the following data syncs to all machines:
- ✅ Custom Authors
- ✅ Blog Posts
- ✅ Services
- ✅ Gallery Items
- ✅ Testimonials
- ✅ Team Members
- ✅ Settings

## Testing

1. **Machine A:** Add a custom author in Admin Panel
2. **Save Settings** with MySQL API URL
3. **Machine B:** Refresh the page
4. Custom author should appear automatically!

## Troubleshooting

**API Connection Failed?**
- Check MySQL server is running
- Verify API URL is correct
- Check firewall allows connections
- Verify database credentials in `.env`

**Authors Not Syncing?**
- Check browser console for errors
- Verify MySQL API URL in Settings
- Make sure `/api/authors` endpoint is accessible

**Need Help?**
See detailed MySQL setup in `src/services/mysqlService.ts` comments

---

That's it! Your PRIMECREST website now syncs data across all machines and users.
