# PHP Backend Deployment Guide - Tru Host

Complete step-by-step instructions for deploying the Primecrest PHP backend to Tru Host.

## Overview

- **Frontend**: Static files from `out/` folder → Deploy to public_html
- **Backend**: PHP files from `php-backend/` → Deploy to public_html/api

## Apps to Deploy
- `out/` folder: frontend static site output
- `php-backend/api/`: PHP REST API backend and 2FA endpoints
- `uploads/`: writable directory for uploaded images
- `logs/`: writable directory for backend error logs

## Step 1: Prepare the Backend Folder

Before uploading, make sure you have:

```
php-backend/
├── api/
│   ├── index.php
│   ├── config.php
│   └── .htaccess
├── uploads/          (empty directory)
├── logs/             (will be created)
└── README.md
```

## Step 2: Upload to Tru Host via cPanel

1. **Login to cPanel** at your domain
2. Go to **File Manager**
3. Navigate to **public_html** (or your primary domain folder)
4. Create a new folder called **api** (or **backend**)
5. Upload these files into the **api** folder:
   - `api/index.php`
   - `api/config.php`
   - `api/.htaccess`

6. Create two empty directories:
   - **uploads** (for image storage)
   - **logs** (for error logs)

### File Structure After Upload

```
public_html/
├── (your frontend files from out/)
├── index.html
├── .htaccess
├── api/
│   ├── index.php
│   ├── config.php
│   └── .htaccess
├── uploads/
└── logs/
```

## Step 3: Configure the Backend

1. **In cPanel File Manager**, right-click **api/config.php** → **Edit**
2. Update these values with your **actual Tru Host credentials**:

### Database Configuration
```php
define('DB_HOST', 'localhost');        // Don't change - same server
define('DB_PORT', 3306);               // Don't change
define('DB_USER', 'nzesuzlm_primecrest_enterprise');  // Your DB username
define('DB_PASS', 'Samson20???');      // Your DB password
define('DB_NAME', 'nzesuzlm_primecrest_enterprise');  // Your DB name
```

### Email Configuration (Optional)
```php
define('SMTP_HOST', 'mail.primecrestenterprise.com');
define('SMTP_PORT', 465);
define('SMTP_USER', 'info@primecrestenterprise.com');
define('SMTP_PASS', 'Samson20???');
define('SENDER_EMAIL', 'info@primecrestenterprise.com');
define('ADMIN_EMAIL', 'info@primecrestenterprise.com');
```

### Public URL
```php
define('PUBLIC_BASE_URL', 'https://primecrestenterprise.com');  // Your domain
```

3. **Save the file**

## Step 4: Set Directory Permissions

In **cPanel File Manager**:

1. Right-click **uploads** folder → **Change Permissions**
   - Set to **755** (read/write for owner, read for others)

2. Right-click **logs** folder → **Change Permissions**
   - Set to **755**

3. Right-click **api** folder → **Change Permissions**
   - Set to **755**

## Step 5: Test the Backend

Open your browser and visit:

```
https://primecrestenterprise.com/api/health
```

### Expected Response
```json
{"status":"ok","ping":{"ping":1}}
```

If you see this, the backend is working! ✓

### If you get an error

1. Check database credentials in `api/config.php`
2. Verify the database exists in cPanel → **Databases**
3. Check error logs in cPanel → **Error Log**
4. Visit `https://yourdomain.com/api/health` to see error details

## Step 6: Upload Frontend

1. Extract all files from the `out/` folder
2. Upload them to **public_html** (same location where you created the **api** folder)
3. Make sure `index.html` is in **public_html** root

## Step 7: Configure Frontend to Use the Backend

1. Visit your website: `https://primecrestenterprise.com`
2. Login to admin panel (admin page)
3. Go to **Admin Settings**
4. Find **MySQL API Base URL** field
5. Enter: `https://primecrestenterprise.com/api`
6. Click **Test Connection**
7. Should show: **✓ Connected**

## Step 8: Verify Everything Works

Test each feature:

- [ ] Settings save and appear on the site
- [ ] Services can be created/edited/deleted
- [ ] Gallery images upload and display
- [ ] Blog posts publish and appear
- [ ] Contact form works and sends emails
- [ ] Team members display on About page
- [ ] Testimonials appear on home page

## Troubleshooting

### API returns 404 errors

1. Make sure `.htaccess` was uploaded to **api** folder
2. Check cPanel that **mod_rewrite** is enabled (usually is)
3. Try visiting: `https://yourdomain.com/api/index.php/health`
4. If that works, `.htaccess` needs adjustment

### Database connection fails

1. Check credentials in `api/config.php`
2. Verify database name is correct in cPanel → **Databases**
3. Try connecting via **phpMyAdmin** with same credentials
4. If phpMyAdmin works but API doesn't, check error logs

### Uploads don't work

1. Make sure **uploads** folder exists and is writable (755)
2. Check that `api/index.php` can write to the folder
3. Check cPanel error log for permission issues

### Emails don't send

1. PHP uses server's mail function
2. Make sure email credentials in `api/config.php` are correct
3. Check if the cPanel email account exists
4. Some hosts require specific SMTP settings - contact Tru Host support

### Can't login to admin

If database connection fails:

1. Run the validation script:
   ```
   php validate.php
   ```

2. Or check the error log in `logs/error.log` via cPanel File Manager

## Files Reference

| File | Purpose |
|------|---------|
| `api/index.php` | Main API router - handles all requests |
| `api/config.php` | Database and email configuration |
| `api/.htaccess` | URL rewriting for clean API routes |
| `uploads/` | Image storage directory |
| `logs/` | Error log files |

## Next Steps

1. **Backup** your database regularly via cPanel
2. **Monitor** error logs weekly
3. **Update** PHP version in cPanel when available
4. **Test** after any Tru Host updates

## Support

- **Tru Host Help**: Use their cPanel support or knowledge base
- **PHP Issues**: Check error logs in cPanel
- **Database Issues**: Use phpMyAdmin in cPanel

## Important Notes

⚠️ **NEVER** commit `api/config.php` with real credentials to Git
⚠️ Keep your database credentials secure
⚠️ Regularly backup your database
⚠️ Monitor the error log for issues

---

**Your backend is now ready for production!**

After deployment, your frontend will automatically sync all changes to the database, making your data visible across all devices and browsers.
