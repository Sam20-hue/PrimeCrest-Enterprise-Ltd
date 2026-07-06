# Primecrest Backend - PHP Version

This is a PHP-based REST API backend for the Primecrest Enterprise frontend. It's optimized for Tru Host cPanel deployment.

## Features

- MySQL database integration
- REST API endpoints for settings, services, blog, gallery, team, testimonials, authors, subscribers
- Image upload handling
- Contact form email support
- Data synchronization with frontend
- Email notifications

## Files Structure

```
php-backend/
├── api/
│   ├── index.php       (Main API router - handles all endpoints)
│   ├── config.php      (Database config and helpers)
│   └── .htaccess       (URL rewriting for clean URLs)
├── uploads/            (Image storage directory)
├── logs/               (Error logs - created automatically)
└── README.md           (This file)
```

## Installation on Tru Host

### 1. Upload Files

Upload the `php-backend/api/` folder to your Tru Host public_html or a subdirectory:

```
public_html/
├── (frontend files from out/)
└── api/  (upload the php-backend/api/ contents here)
    ├── index.php
    ├── config.php
    └── .htaccess
```

### 2. Update Database Configuration

Edit `api/config.php` and update these values with your Tru Host database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_USER', 'nzesuzlm_primecrest_enterprise');
define('DB_PASS', 'Samson20???');
define('DB_NAME', 'nzesuzlm_primecrest_enterprise');
```

### 3. Update Email Configuration

Edit `api/config.php` and update email settings:

```php
define('SMTP_HOST', 'mail.primecrestenterprise.com');
define('SMTP_PORT', 465);
define('SMTP_USER', 'info@primecrestenterprise.com');
define('SMTP_PASS', 'Samson20???');
define('SENDER_EMAIL', 'info@primecrestenterprise.com');
define('ADMIN_EMAIL', 'info@primecrestenterprise.com');
```

### 4. Update PUBLIC_BASE_URL

Set this to your public domain for correct image URLs:

```php
define('PUBLIC_BASE_URL', 'https://primecrestenterprise.com');
```

### 5. Set Directory Permissions

In cPanel File Manager, set permissions:

- `api/` folder: `755`
- `uploads/` folder: `755` (must be writable)
- `logs/` folder: `755` (will be created automatically)

### 6. Test the Backend

Visit: `https://yourdomain.com/api/health`

Should return: `{"status":"ok","ping":{"ping":1}}`

## API Endpoints

### Health Check
```
GET /api/health
```

### Settings
```
GET /api/settings           # Get all settings
POST /api/settings          # Update settings
```

### Services
```
GET /api/services           # List all services
POST /api/services          # Create service
GET /api/services/1         # Get single service
PUT /api/services/1         # Update service
DELETE /api/services/1      # Delete service
```

### Blog
```
GET /api/blog               # List all blog posts
POST /api/blog              # Create blog post
GET /api/blog/1             # Get single post
PUT /api/blog/1             # Update post
DELETE /api/blog/1          # Delete post
```

### Gallery
```
GET /api/gallery            # List all gallery items
POST /api/gallery           # Create gallery item
DELETE /api/gallery/1       # Delete gallery item
```

### Authors
```
GET /api/authors            # List all authors
POST /api/authors           # Create author
PUT /api/authors/1          # Update author
DELETE /api/authors/1       # Delete author
```

### Team
```
GET /api/team               # List team members
POST /api/team              # Create team member
PUT /api/team/1             # Update team member
DELETE /api/team/1          # Delete team member
```

### Testimonials
```
GET /api/testimonials       # List testimonials
POST /api/testimonials      # Create testimonial
```

### Subscribers
```
GET /api/subscribers        # List subscribers
POST /api/subscribers       # Add subscriber (email required)
```

### File Upload
```
POST /api/upload
Content-Type: multipart/form-data
file: (binary image file)
```

### Contact Form
```
POST /api/contact
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "service": "Web Design",
  "message": "I'm interested in your services"
}
```

### Data Sync
```
POST /api/sync
{
  "settings": {...},
  "services": [...],
  "blog": [...]
}
```

## Frontend Configuration

In the admin settings, set the `MySQL API Base URL` to:

```
https://yourdomain.com/api
```

Then click "Test Connection" to verify the backend is working.

## Troubleshooting

### 404 Error on API calls

Make sure `.htaccess` is uploaded and `mod_rewrite` is enabled. Check in cPanel that Apache Handlers include PHP.

### Database Connection Error

Verify database credentials in `api/config.php` match your Tru Host setup. Check phpMyAdmin to confirm.

### Permission Denied on Upload

Make sure `uploads/` folder has write permissions (`755` or `775`).

### Emails Not Sending

PHP's mail function sends through your server's Postfix. Verify SMTP settings in config.php match your Tru Host email account.

## Production Notes

- Never commit `.env` or credentials to Git
- Keep `config.php` secure - restrict file access if possible
- Monitor `logs/error.log` for issues
- Regularly backup your database
- Keep PHP version updated in Tru Host

## Support

For Tru Host support, use their cPanel documentation or contact their support team.
