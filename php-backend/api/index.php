<?php
/**
 * Primecrest Backend API - Main Router
 * PHP Backend for Tru Host
 */

require_once __DIR__ . '/config.php';

$route = getRoute();
$method = getMethod();
$input = getInput();

// Health check
if ($route === 'health') {
    try {
        $stmt = Database::query('SELECT 1 AS ping');
        $result = Database::fetch($stmt);
        jsonResponse(['status' => 'ok', 'ping' => $result]);
    } catch (Exception $e) {
        errorResponse('Database connection failed: ' . $e->getMessage(), 500);
    }
}

// File upload
elseif ($route === 'upload' && $method === 'POST') {
    if (!isset($_FILES['file'])) {
        errorResponse('No file uploaded', 400);
    }

    $file = $_FILES['file'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!in_array($file['type'], $allowedTypes)) {
        errorResponse('Invalid file type. Only images are allowed.', 400);
    }

    if ($file['size'] > 10 * 1024 * 1024) { // 10MB limit
        errorResponse('File too large. Maximum 10MB allowed.', 400);
    }

    $filename = time() . '-' . bin2hex(random_bytes(5)) . '-' . basename($file['name']);
    $filepath = UPLOADS_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        errorResponse('Failed to upload file', 500);
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $baseUrl = PUBLIC_BASE_URL ?: "$protocol://$host";
    $url = $baseUrl . '/uploads/' . $filename;

    jsonResponse(['url' => $url]);
}

// Settings endpoints
elseif ($route === 'settings') {
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM settings LIMIT 1');
            $settings = Database::fetch($stmt);
            jsonResponse($settings ?: []);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'POST' || $method === 'PUT') {
        try {
            $fields = ['siteName', 'logo', 'phone', 'email', 'address', 'footerText', 'aboutText', 'heroTitle', 'heroSubtitle', 'heroImage', 'adminEmail', 'adminPassword'];
            $values = [];
            $params = [];
            $types = '';

            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $values[] = "$field = ?";
                    $params[] = $input[$field];
                    $types .= 's';
                }
            }

            if (empty($values)) {
                errorResponse('No fields to update', 400);
            }

            $sql = 'UPDATE settings SET ' . implode(', ', $values) . ', updated_at = CURRENT_TIMESTAMP WHERE id = 1';
            Database::query($sql, $params);

            // If no settings exist, insert
            $check = Database::query('SELECT id FROM settings LIMIT 1');
            if (!Database::fetch($check)) {
                $sql = 'INSERT INTO settings (siteName, phone, email) VALUES (?, ?, ?)';
                Database::query($sql, [$input['siteName'] ?? '', $input['phone'] ?? '', $input['email'] ?? '']);
            }

            successResponse([], 'Settings updated');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Services endpoints
elseif ($route === 'services') {
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM services ORDER BY id DESC');
            $services = Database::fetchAll($stmt);
            jsonResponse(['data' => $services]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'POST') {
        try {
            $stmt = Database::query(
                'INSERT INTO services (name, description, icon, price) VALUES (?, ?, ?, ?)',
                [$input['name'] ?? '', $input['description'] ?? '', $input['icon'] ?? '', $input['price'] ?? '']
            );
            successResponse(['id' => Database::connect()->insert_id], 'Service created');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Single service
elseif (preg_match('/^services\/(\d+)$/', $route, $matches)) {
    $id = (int)$matches[1];
    
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM services WHERE id = ?', [$id]);
            $service = Database::fetch($stmt);
            $service ? jsonResponse($service) : errorResponse('Service not found', 404);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'PUT') {
        try {
            $updates = [];
            $params = [];
            foreach (['name', 'description', 'icon', 'price'] as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $input[$field];
                }
            }
            if (empty($updates)) {
                errorResponse('No fields to update', 400);
            }
            $params[] = $id;
            $sql = 'UPDATE services SET ' . implode(', ', $updates) . ' WHERE id = ?';
            Database::query($sql, $params);
            successResponse([], 'Service updated');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'DELETE') {
        try {
            Database::query('DELETE FROM services WHERE id = ?', [$id]);
            successResponse([], 'Service deleted');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Gallery endpoints
elseif ($route === 'gallery') {
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM gallery ORDER BY id DESC');
            $gallery = Database::fetchAll($stmt);
            jsonResponse(['data' => $gallery]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'POST') {
        try {
            Database::query(
                'INSERT INTO gallery (imageUrl, title, description) VALUES (?, ?, ?)',
                [$input['imageUrl'] ?? '', $input['title'] ?? '', $input['description'] ?? '']
            );
            successResponse(['id' => Database::connect()->insert_id], 'Gallery item created');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Single gallery item
elseif (preg_match('/^gallery\/(\d+)$/', $route, $matches)) {
    $id = (int)$matches[1];
    
    if ($method === 'DELETE') {
        try {
            Database::query('DELETE FROM gallery WHERE id = ?', [$id]);
            successResponse([], 'Gallery item deleted');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Blog endpoints
elseif ($route === 'blog') {
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM blog ORDER BY date DESC, id DESC');
            $posts = Database::fetchAll($stmt);
            jsonResponse(['data' => $posts]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'POST') {
        try {
            $published = isset($input['published']) && $input['published'] ? 1 : 0;
            Database::query(
                'INSERT INTO blog (title, excerpt, content, category, imageUrl, author, authorId, published, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $input['title'] ?? '',
                    $input['excerpt'] ?? '',
                    $input['content'] ?? '',
                    $input['category'] ?? '',
                    $input['imageUrl'] ?? '',
                    $input['author'] ?? '',
                    $input['authorId'] ?? '',
                    $published,
                    $input['date'] ?? date('Y-m-d')
                ]
            );
            successResponse(['id' => Database::connect()->insert_id], 'Blog post created');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Single blog post
elseif (preg_match('/^blog\/(\d+)$/', $route, $matches)) {
    $id = (int)$matches[1];
    
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM blog WHERE id = ?', [$id]);
            $post = Database::fetch($stmt);
            $post ? jsonResponse($post) : errorResponse('Post not found', 404);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'PUT') {
        try {
            $updates = [];
            $params = [];
            foreach (['title', 'excerpt', 'content', 'category', 'imageUrl', 'author', 'authorId', 'published', 'date'] as $field) {
                if (isset($input[$field])) {
                    if ($field === 'published') {
                        $updates[] = "$field = ?";
                        $params[] = $input[$field] ? 1 : 0;
                    } else {
                        $updates[] = "$field = ?";
                        $params[] = $input[$field];
                    }
                }
            }
            if (empty($updates)) {
                errorResponse('No fields to update', 400);
            }
            $params[] = $id;
            $sql = 'UPDATE blog SET ' . implode(', ', $updates) . ' WHERE id = ?';
            Database::query($sql, $params);
            successResponse([], 'Blog post updated');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'DELETE') {
        try {
            Database::query('DELETE FROM blog WHERE id = ?', [$id]);
            successResponse([], 'Blog post deleted');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Authors endpoints
elseif ($route === 'authors') {
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM authors ORDER BY id DESC');
            $authors = Database::fetchAll($stmt);
            jsonResponse(['data' => $authors]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'POST') {
        try {
            Database::query(
                'INSERT INTO authors (name, imageUrl, bio, subtitle, joinDate, lastActive, linkedIn, upwork) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $input['name'] ?? '',
                    $input['imageUrl'] ?? '',
                    $input['bio'] ?? '',
                    $input['subtitle'] ?? '',
                    $input['joinDate'] ?? '',
                    $input['lastActive'] ?? '',
                    $input['linkedIn'] ?? '',
                    $input['upwork'] ?? ''
                ]
            );
            successResponse(['id' => Database::connect()->insert_id], 'Author created');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Single author
elseif (preg_match('/^authors\/(\d+)$/', $route, $matches)) {
    $id = (int)$matches[1];
    
    if ($method === 'PUT') {
        try {
            $updates = [];
            $params = [];
            foreach (['name', 'imageUrl', 'bio', 'subtitle', 'joinDate', 'lastActive', 'linkedIn', 'upwork'] as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $input[$field];
                }
            }
            if (empty($updates)) {
                errorResponse('No fields to update', 400);
            }
            $params[] = $id;
            $sql = 'UPDATE authors SET ' . implode(', ', $updates) . ' WHERE id = ?';
            Database::query($sql, $params);
            successResponse([], 'Author updated');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'DELETE') {
        try {
            Database::query('DELETE FROM authors WHERE id = ?', [$id]);
            successResponse([], 'Author deleted');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Subscribers endpoints
elseif ($route === 'subscribers') {
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM subscribers ORDER BY id DESC');
            $subscribers = Database::fetchAll($stmt);
            jsonResponse(['data' => $subscribers]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'POST') {
        try {
            $email = $input['email'] ?? '';
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                errorResponse('Invalid email address', 400);
            }
            
            // Check if already subscribed
            $check = Database::query('SELECT id FROM subscribers WHERE email = ?', [$email]);
            if (Database::fetch($check)) {
                errorResponse('Already subscribed', 400);
            }
            
            Database::query('INSERT INTO subscribers (email) VALUES (?)', [$email]);
            successResponse(['id' => Database::connect()->insert_id], 'Subscriber added');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Team endpoints
elseif ($route === 'team') {
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM team ORDER BY id DESC');
            $team = Database::fetchAll($stmt);
            jsonResponse(['data' => $team]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'POST') {
        try {
            Database::query(
                'INSERT INTO team (name, role, imageUrl) VALUES (?, ?, ?)',
                [$input['name'] ?? '', $input['role'] ?? '', $input['imageUrl'] ?? '']
            );
            successResponse(['id' => Database::connect()->insert_id], 'Team member created');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Single team member
elseif (preg_match('/^team\/(\d+)$/', $route, $matches)) {
    $id = (int)$matches[1];
    
    if ($method === 'PUT') {
        try {
            $updates = [];
            $params = [];
            foreach (['name', 'role', 'imageUrl'] as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $input[$field];
                }
            }
            if (empty($updates)) {
                errorResponse('No fields to update', 400);
            }
            $params[] = $id;
            $sql = 'UPDATE team SET ' . implode(', ', $updates) . ' WHERE id = ?';
            Database::query($sql, $params);
            successResponse([], 'Team member updated');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'DELETE') {
        try {
            Database::query('DELETE FROM team WHERE id = ?', [$id]);
            successResponse([], 'Team member deleted');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Testimonials endpoints
elseif ($route === 'testimonials') {
    if ($method === 'GET') {
        try {
            $stmt = Database::query('SELECT * FROM testimonials ORDER BY id DESC');
            $testimonials = Database::fetchAll($stmt);
            jsonResponse(['data' => $testimonials]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    } elseif ($method === 'POST') {
        try {
            Database::query(
                'INSERT INTO testimonials (name, text, author) VALUES (?, ?, ?)',
                [$input['name'] ?? '', $input['text'] ?? '', $input['author'] ?? '']
            );
            successResponse(['id' => Database::connect()->insert_id], 'Testimonial created');
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
    }
}

// Contact form
elseif ($route === 'contact' && $method === 'POST') {
    $name = $input['name'] ?? '';
    $email = $input['email'] ?? '';
    $phone = $input['phone'] ?? '';
    $service = $input['service'] ?? '';
    $message = $input['message'] ?? '';

    if (!$name || !$email || !$message) {
        errorResponse('Name, email, and message are required', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('Invalid email address', 400);
    }

    try {
        // Save to database
        Database::query(
            'INSERT INTO contacts (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)',
            [$name, $email, $phone, $service, $message]
        );

        // Send email (if SMTP configured)
        sendContactEmail($name, $email, $phone, $service, $message);

        successResponse([], 'Message received successfully');
    } catch (Exception $e) {
        errorResponse($e->getMessage(), 500);
    }
}

// Sync endpoint for frontend data persistence
elseif ($route === 'sync' && $method === 'POST') {
    try {
        $data = $input;
        
        // Sync settings
        if (isset($data['settings'])) {
            $settings = $data['settings'];
            $stmt = Database::query('SELECT id FROM settings LIMIT 1');
            $exists = Database::fetch($stmt);
            
            if ($exists) {
                $fields = ['siteName', 'logo', 'phone', 'email', 'address', 'footerText', 'aboutText', 'heroTitle', 'heroSubtitle', 'heroImage', 'adminEmail', 'adminPassword'];
                $updates = [];
                $params = [];
                foreach ($fields as $field) {
                    if (isset($settings[$field])) {
                        $updates[] = "$field = ?";
                        $params[] = $settings[$field];
                    }
                }
                if ($updates) {
                    $params[] = $exists['id'];
                    $sql = 'UPDATE settings SET ' . implode(', ', $updates) . ' WHERE id = ?';
                    Database::query($sql, $params);
                }
            }
        }

        // Sync services
        if (isset($data['services']) && is_array($data['services'])) {
            foreach ($data['services'] as $service) {
                if (isset($service['id'])) {
                    $updates = [];
                    $params = [];
                    foreach (['name', 'description', 'icon', 'price'] as $field) {
                        if (isset($service[$field])) {
                            $updates[] = "$field = ?";
                            $params[] = $service[$field];
                        }
                    }
                    if ($updates) {
                        $params[] = $service['id'];
                        $sql = 'UPDATE services SET ' . implode(', ', $updates) . ' WHERE id = ?';
                        Database::query($sql, $params);
                    }
                } else {
                    Database::query(
                        'INSERT INTO services (name, description, icon, price) VALUES (?, ?, ?, ?)',
                        [$service['name'] ?? '', $service['description'] ?? '', $service['icon'] ?? '', $service['price'] ?? '']
                    );
                }
            }
        }

        successResponse([], 'Data synced successfully');
    } catch (Exception $e) {
        errorResponse($e->getMessage(), 500);
    }
}

// 2FA Status check
elseif (preg_match('/^auth\/2fa-status/', $route) && $method === 'GET') {
    $email = $_GET['email'] ?? '';
    if (!$email) {
        errorResponse('Email required', 400);
    }
    
    try {
        $stmt = Database::query('SELECT admin2faEnabled FROM settings LIMIT 1');
        $settings = Database::fetch($stmt);
        
        $response = [
            'setup' => true,
            'enabled' => ($settings && $settings['admin2faEnabled']) ? true : false
        ];
        successResponse($response, '');
    } catch (Exception $e) {
        errorResponse($e->getMessage(), 500);
    }
}

// 2FA Setup - Generate secret and QR code
elseif (preg_match('/^auth\/setup-2fa/', $route) && $method === 'POST') {
    try {
        $email = $input['email'] ?? '';
        if (!$email) {
            errorResponse('Email required', 400);
        }
        
        // Generate a random base32 secret (16 characters)
        $secret = generateTotpSecret();
        
        // Generate otpauth URL for QR code
        $appName = 'Primecrest';
        $issuer = 'PrimecrestEnterprise';
        $otpauthUrl = "otpauth://totp/$appName:$email?secret=$secret&issuer=$issuer";
        
        // Generate QR code using Google Charts API
        $qrCodeUrl = 'https://chart.googleapis.com/chart?chs=300x300&chld=M|0&cht=qr&chl=' . urlencode($otpauthUrl);
        
        // Store secret temporarily (in real app, only store after verification)
        $_SESSION['totp_secret_temp'] = $secret;
        $_SESSION['totp_email_temp'] = $email;
        
        $response = [
            'secret' => $secret,
            'otpauthUrl' => $otpauthUrl,
            'qrCode' => $qrCodeUrl
        ];
        
        successResponse($response, '');
    } catch (Exception $e) {
        errorResponse('Failed to setup 2FA: ' . $e->getMessage(), 500);
    }
}

// 2FA Verify - Verify TOTP token
elseif (preg_match('/^auth\/verify-2fa/', $route) && $method === 'POST') {
    $email = $input['email'] ?? '';
    $token = $input['token'] ?? '';
    
    if (!$email || !$token) {
        errorResponse('Email and token required', 400);
    }
    
    // Get the secret from session or database
    $secret = $_SESSION['totp_secret_temp'] ?? null;
    
    if (!$secret) {
        // If not in session, try to get from settings (for verification of existing 2FA)
        try {
            $stmt = Database::query('SELECT admin2faSecret FROM settings LIMIT 1');
            $settings = Database::fetch($stmt);
            $secret = $settings['admin2faSecret'] ?? null;
        } catch (Exception $e) {
            // Ignore, secret will be null
        }
    }
    
    if (!$secret) {
        errorResponse('2FA not setup. Please setup 2FA first.', 400);
    }
    
    // Verify the token
    if (verifyTotpToken($secret, $token)) {
        // Token is valid
        try {
            // Update settings to enable 2FA and store secret
            $stmt = Database::query('SELECT id FROM settings LIMIT 1');
            $settings = Database::fetch($stmt);
            
            if ($settings) {
                Database::query(
                    'UPDATE settings SET admin2faSecret = ?, admin2faEnabled = 1 WHERE id = ?',
                    [$secret, $settings['id']]
                );
            } else {
                Database::query(
                    'INSERT INTO settings (admin2faSecret, admin2faEnabled) VALUES (?, 1)',
                    [$secret]
                );
            }
            
            // Clear session
            unset($_SESSION['totp_secret_temp']);
            unset($_SESSION['totp_email_temp']);
            
            $response = ['verified' => true, 'message' => '2FA verified successfully'];
            successResponse($response, '');
        } catch (Exception $e) {
            errorResponse('Failed to save 2FA settings: ' . $e->getMessage(), 500);
        }
    } else {
        errorResponse('Invalid token. Please check your authenticator app.', 400);
    }
}

// 2FA Reset - Clear 2FA setup
elseif (preg_match('/^auth\/reset-2fa/', $route) && $method === 'POST') {
    try {
        // Clear session secrets
        unset($_SESSION['totp_secret_temp']);
        unset($_SESSION['totp_email_temp']);
        
        // Clear database 2FA settings
        $stmt = Database::query('SELECT id FROM settings LIMIT 1');
        $settings = Database::fetch($stmt);
        
        if ($settings) {
            Database::query(
                'UPDATE settings SET admin2faSecret = NULL, admin2faEnabled = 0 WHERE id = ?',
                [$settings['id']]
            );
        }
        
        $response = ['reset' => true, 'message' => '2FA has been reset. Please setup again.'];
        successResponse($response, '');
    } catch (Exception $e) {
        errorResponse('Failed to reset 2FA: ' . $e->getMessage(), 500);
    }
}

// 404 - Route not found
else {
    errorResponse('Endpoint not found', 404);
}

/**
 * Send contact email
 */
function sendContactEmail($name, $email, $phone, $service, $message) {
    $subject = "New Contact Form Submission from $name";
    $to = ADMIN_EMAIL;
    
    $htmlContent = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; }
            .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
            .field { margin-bottom: 15px; border-left: 4px solid #ea580c; padding-left: 15px; }
            .field-label { font-weight: bold; color: #ea580c; font-size: 12px; text-transform: uppercase; }
            .field-value { color: #333; margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>New Contact Form Submission</h2>
            </div>
            <div class='field'>
                <div class='field-label'>Name</div>
                <div class='field-value'>$name</div>
            </div>
            <div class='field'>
                <div class='field-label'>Email</div>
                <div class='field-value'><a href='mailto:$email'>$email</a></div>
            </div>
            " . ($phone ? "<div class='field'><div class='field-label'>Phone</div><div class='field-value'>$phone</div></div>" : "") . "
            " . ($service ? "<div class='field'><div class='field-label'>Service</div><div class='field-value'>$service</div></div>" : "") . "
            <div class='field'>
                <div class='field-label'>Message</div>
                <div class='field-value'>" . nl2br(htmlspecialchars($message)) . "</div>
            </div>
        </div>
    </body>
    </html>
    ";

    // Use PHP mail as fallback
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . SENDER_EMAIL . "\r\n";
    
    mail($to, $subject, $htmlContent, $headers);
}

