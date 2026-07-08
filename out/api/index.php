<?php
/**
 * Unified API Router for all data operations
 * Handles GET, POST, PUT, DELETE for all entities
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
ensureSchema($conn);

// Simple logging utility for server-side diagnostics
function log_error(string $msg): void {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    @file_put_contents($logDir . '/api.log', $line, FILE_APPEND | LOCK_EX);
}

set_exception_handler(function($e) {
    log_error("Uncaught exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error.']);
    exit;
});

set_error_handler(function($severity, $message, $file, $line) {
    log_error("PHP error [$severity]: $message in $file:$line");
    // Let PHP handle the error as well
    return false;
});

register_shutdown_function(function() {
    $err = error_get_last();
    if ($err) {
        log_error('Shutdown error: ' . json_encode($err));
        // If a fatal error occurred, ensure JSON response for the client with diagnostics (for debugging).
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Fatal PHP error', 'details' => $err]);
        }
    }
});

function getExistingColumns(mysqli $conn, string $table): array {
    $stmt = $conn->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
    if (!$stmt) {
        return [];
    }
    $stmt->bind_param('s', $table);
    $stmt->execute();
    $result = $stmt->get_result();
    $columns = [];
    while ($row = $result->fetch_assoc()) {
        $columns[] = $row['COLUMN_NAME'];
    }
    return $columns;
}

function buildFieldData(array $input, array $columns, bool $forUpdate = false): array {
    $fields = [];
    $values = [];
    $types = '';
    foreach ($columns as $column) {
        if ($forUpdate && !array_key_exists($column, $input)) {
            continue;
        }
        if (!$forUpdate) {
            if (!array_key_exists($column, $input) && !in_array($column, ['published', 'newsletterSent', 'published_at'], true)) {
                continue;
            }
        }
        $value = $input[$column] ?? null;
        if ($column === 'published' || $column === 'newsletterSent') {
            $value = !empty($input[$column]) ? 1 : 0;
            $types .= 'i';
        } elseif ($column === 'price') {
            $value = isset($input['price']) ? floatval($input['price']) : 0.0;
            $types .= 'd';
        } elseif ($column === 'published_at') {
            $value = $input['published_at'] ?? ($input['date'] ?? null);
            $types .= 's';
        } elseif ($column === 'images' || $column === 'imagesCaptions') {
            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE);
            }
            $types .= 's';
        } else {
            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE);
            }
            $types .= 's';
        }
        if ($forUpdate) {
            $fields[] = "$column = ?";
        } else {
            $fields[] = $column;
        }
        $values[] = $value;
    }
    return [$fields, $values, $types];
}

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = array_values(array_filter(explode('/', $path), fn($part) => $part !== ''));
if (isset($pathParts[0]) && $pathParts[0] === 'api') {
    array_shift($pathParts);
}
$resource = $pathParts[0] ?? '';
$endpoint = end($pathParts) ?: '';
$id = isset($pathParts[1]) && ctype_digit($pathParts[1]) ? $pathParts[1] : null;

// Get ID from URL if present when using fallback numeric segments
if ($id === null && preg_match('/\/(\d+)\/?$/', $path, $matches)) {
    $id = $matches[1];
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Dedicated contact submission handler for both DB and file-fallback modes.
if ($resource === 'contact' || $endpoint === 'contact') {
    require_once __DIR__ . '/contact.php';
    exit;
}

// FILE-FALLBACK ROUTER: if DB connection is unavailable, use JSON files in ./data/
if (!isset($conn) || $conn === null) {
    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);

    $readJson = function($name) use ($dataDir) {
        $file = $dataDir . '/' . $name . '.json';
        if (!is_file($file)) return null;
        $txt = file_get_contents($file);
        return json_decode($txt, true);
    };

    $writeJson = function($name, $data) use ($dataDir) {
        $file = $dataDir . '/' . $name . '.json';
        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    };

    // Contact submissions: delegate only /api/contact to contact.php.
    if ($resource === 'contact' || $endpoint === 'contact') {
        require_once __DIR__ . '/contact.php';
        exit;
    }

    // Settings
    if ($resource === 'settings' || $endpoint === 'settings') {
        if ($method === 'GET') {
            $s = $readJson('settings') ?? [];
            echo json_encode($s);
            exit;
        }
        if ($method === 'PUT' || $method === 'POST') {
            $current = $readJson('settings') ?? [];
            $new = array_merge($current, $input);
            $writeJson('settings', $new);
            echo json_encode(['success' => true, 'message' => 'Settings updated']);
            exit;
        }
    }

    // Gallery
    if ($resource === 'gallery' || $endpoint === 'gallery') {
        $items = $readJson('gallery') ?? [];
        if ($method === 'GET') {
            echo json_encode($items);
            exit;
        }
        if ($method === 'POST') {
            $id = (count($items) ? (max(array_column($items, 'id')) + 1) : 1);
            $record = array_merge(['id' => $id, 'created_at' => date('Y-m-d H:i:s')], $input);
            $items[] = $record;
            $writeJson('gallery', $items);
            echo json_encode(['id' => $id, 'success' => true]);
            exit;
        }
        if (($method === 'PUT' || $method === 'DELETE') && $id) {
            $found = false;
            $new = [];
            foreach ($items as $it) {
                if (isset($it['id']) && (int)$it['id'] === (int)$id) {
                    $found = true;
                    if ($method === 'PUT') {
                        $new[] = array_merge($it, $input);
                    }
                    // skip for DELETE
                } else {
                    $new[] = $it;
                }
            }
            $writeJson('gallery', $new);
            echo json_encode(['success' => $found]);
            exit;
        }
    }

    // Sync endpoint: accept full sync payload and write to respective JSON files
    if ($resource === 'sync' || $endpoint === 'sync') {
        if ($method === 'POST') {
            if (isset($input['settings'])) $writeJson('settings', $input['settings']);
            if (isset($input['services'])) $writeJson('services', $input['services']);
            if (isset($input['gallery'])) $writeJson('gallery', $input['gallery']);
            if (isset($input['blog'])) $writeJson('blog', $input['blog']);
            if (isset($input['authors'])) $writeJson('authors', $input['authors']);
            if (isset($input['team'])) $writeJson('team', $input['team']);
            if (isset($input['testimonials'])) $writeJson('testimonials', $input['testimonials']);
            if (isset($input['subscribers'])) $writeJson('subscribers', $input['subscribers']);
            echo json_encode(['success' => true, 'message' => 'Data synced to file fallback']);
            exit;
        }
    }

    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found (file-fallback)']);
    exit;
}

try {
    // ==================== SETTINGS ====================
    if ($resource === 'settings' || $endpoint === 'settings') {
        if ($method === 'GET') {
            $row = fetch_one($conn, 'SELECT * FROM settings LIMIT 1');
            $dataDir = __DIR__ . '/data';
            $file = $dataDir . '/settings.json';
            $staticSettings = is_file($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
            $merged = array_merge($row ?: [], $staticSettings);
            echo json_encode($merged);
        } elseif ($method === 'PUT') {
            // Persist textual settings to a static JSON file so wording remains static.
            $dataDir = __DIR__ . '/data';
            if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);
            $file = $dataDir . '/settings.json';
            $current = is_file($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];

            // Treat fields that likely contain image data separately; everything else is textual/static.
            $imagePattern = '/logo|image|photo|avatar/i';
            $textPayload = [];
            $imagePayload = [];
            foreach ($input as $k => $v) {
                if (preg_match($imagePattern, $k)) {
                    $imagePayload[$k] = $v;
                } else {
                    $textPayload[$k] = $v;
                }
            }

            // Merge textual settings into the static settings file
            $merged = array_merge($current, $textPayload);
            file_put_contents($file, json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            // If DB connection exists and image-like fields were provided, update them in DB.
            if (!empty($imagePayload) && $conn instanceof mysqli) {
                $fields = [];
                $values = [];
                $types = '';
                foreach ($imagePayload as $k => $v) {
                    $fields[] = "$k = ?";
                    $values[] = is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : $v;
                    $types .= 's';
                }
                if (!empty($fields)) {
                    $query = 'UPDATE settings SET ' . implode(', ', $fields) . ', updated_at = NOW()';
                    query_json($conn, $query, $values, $types);
                }
            }

            echo json_encode(['success' => true, 'message' => 'Settings updated (text saved as static, images persisted to DB if provided)']);
        }
    }
    
    // ==================== SERVICES ====================
    else if ($resource === 'services' || $endpoint === 'services') {
        if ($method === 'GET') {
            $rows = fetch_all_assoc($conn, 'SELECT * FROM services ORDER BY id');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $title = $input['title'] ?? null;
            $subtitle = $input['subtitle'] ?? null;
            $icon = $input['icon'] ?? null;
            $description = $input['description'] ?? null;
            $imageUrl = $input['imageUrl'] ?? null;

            $stmt = $conn->prepare('INSERT INTO services (title, subtitle, icon, description, imageUrl, images, imagesCaptions) VALUES (?, ?, ?, ?, ?, ?, ?)');
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]);
                exit;
            }
            $ok = $stmt->bind_param('sssssss', $title, $subtitle, $icon, $description, $imageUrl, $images, $captions);
            if ($ok === false) {
                http_response_code(500);
                echo json_encode(['error' => 'bind_param failed']);
                exit;
            }
            if (!$stmt->execute()) {
                http_response_code(500);
                echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
                exit;
            }
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $title = $input['title'] ?? null;
            $subtitle = $input['subtitle'] ?? null;
            $icon = $input['icon'] ?? null;
            $description = $input['description'] ?? null;
            $imageUrl = $input['imageUrl'] ?? null;

            $stmt = $conn->prepare('UPDATE services SET title = ?, subtitle = ?, icon = ?, description = ?, imageUrl = ?, images = ?, imagesCaptions = ? WHERE id = ?');
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]);
                exit;
            }
            $ok = $stmt->bind_param('sssssssi', $title, $subtitle, $icon, $description, $imageUrl, $images, $captions, $id);
            if ($ok === false) {
                http_response_code(500);
                echo json_encode(['error' => 'bind_param failed']);
                exit;
            }
            if (!$stmt->execute()) {
                http_response_code(500);
                echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
                exit;
            }
            echo json_encode(['success' => true]);
        } elseif ($method === 'DELETE' && $id) {
            $stmt = $conn->prepare('DELETE FROM services WHERE id = ?');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
    
    // ==================== GALLERY ====================
    else if ($resource === 'gallery' || $endpoint === 'gallery') {
        if ($method === 'GET') {
            $rows = fetch_all_assoc($conn, 'SELECT * FROM gallery ORDER BY id');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $title = $input['title'] ?? null;
            $category = $input['category'] ?? null;
            $imageUrl = $input['imageUrl'] ?? null;
            $description = $input['description'] ?? null;

            $stmt = $conn->prepare('INSERT INTO gallery (title, category, imageUrl, images, imagesCaptions, description) VALUES (?, ?, ?, ?, ?, ?)');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('ssssss', $title, $category, $imageUrl, $images, $captions, $description);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $title = $input['title'] ?? null;
            $category = $input['category'] ?? null;
            $imageUrl = $input['imageUrl'] ?? null;
            $description = $input['description'] ?? null;

            $stmt = $conn->prepare('UPDATE gallery SET title = ?, category = ?, imageUrl = ?, images = ?, imagesCaptions = ?, description = ? WHERE id = ?');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('ssssssi', $title, $category, $imageUrl, $images, $captions, $description, $id);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['success' => true]);
        } elseif ($method === 'DELETE' && $id) {
            $stmt = $conn->prepare('DELETE FROM gallery WHERE id = ?');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
    
    // ==================== BLOG ====================
    else if ($resource === 'blog' || $endpoint === 'blog') {
        if ($method === 'GET') {
            $rows = fetch_all_assoc($conn, 'SELECT * FROM blog ORDER BY published_at DESC');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $published = !empty($input['published']) ? 1 : 0;
            $title = $input['title'] ?? null;
            $excerpt = $input['excerpt'] ?? null;
            $content = $input['content'] ?? null;
            $category = $input['category'] ?? null;
            $imageUrl = $input['imageUrl'] ?? null;
            $author = $input['author'] ?? null;
            $authorId = $input['authorId'] ?? null;
            $date = $input['date'] ?? null;
            $published_at = $input['published_at'] ?? $date;
            $newsletterSent = !empty($input['newsletterSent']) ? 1 : 0;

            $stmt = $conn->prepare('INSERT INTO blog (title, excerpt, content, category, imageUrl, images, imagesCaptions, author, authorId, published, date, published_at, newsletterSent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('ssssssssisssi', $title, $excerpt, $content, $category, $imageUrl, $images, $captions, $author, $authorId, $published, $date, $published_at, $newsletterSent);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $published = !empty($input['published']) ? 1 : 0;
            $title = $input['title'] ?? null;
            $excerpt = $input['excerpt'] ?? null;
            $content = $input['content'] ?? null;
            $category = $input['category'] ?? null;
            $imageUrl = $input['imageUrl'] ?? null;
            $author = $input['author'] ?? null;
            $authorId = $input['authorId'] ?? null;
            $date = $input['date'] ?? null;
            $published_at = $input['published_at'] ?? $date;
            $newsletterSent = !empty($input['newsletterSent']) ? 1 : 0;

            $stmt = $conn->prepare('UPDATE blog SET title = ?, excerpt = ?, content = ?, category = ?, imageUrl = ?, images = ?, imagesCaptions = ?, author = ?, authorId = ?, published = ?, date = ?, published_at = ?, newsletterSent = ? WHERE id = ?');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('ssssssssisssii', $title, $excerpt, $content, $category, $imageUrl, $images, $captions, $author, $authorId, $published, $date, $published_at, $newsletterSent, $id);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['success' => true]);
        } elseif ($method === 'DELETE' && $id) {
            $stmt = $conn->prepare('DELETE FROM blog WHERE id = ?');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
    
    // ==================== TESTIMONIALS ====================
    else if ($resource === 'testimonials' || $endpoint === 'testimonials') {
        if ($method === 'GET') {
            $rows = fetch_all_assoc($conn, 'SELECT * FROM testimonials ORDER BY id');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            $name = $input['name'] ?? null;
            $role = $input['role'] ?? null;
            $photo = $input['photo'] ?? null;
            $quote = $input['quote'] ?? null;

            $stmt = $conn->prepare('INSERT INTO testimonials (name, role, photo, quote) VALUES (?, ?, ?, ?)');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('ssss', $name, $role, $photo, $quote);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $name = $input['name'] ?? null;
            $role = $input['role'] ?? null;
            $photo = $input['photo'] ?? null;
            $quote = $input['quote'] ?? null;

            $stmt = $conn->prepare('UPDATE testimonials SET name = ?, role = ?, photo = ?, quote = ? WHERE id = ?');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('ssssi', $name, $role, $photo, $quote, $id);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['success' => true]);
        } elseif ($method === 'DELETE' && $id) {
            $stmt = $conn->prepare('DELETE FROM testimonials WHERE id = ?');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
    
    // ==================== TEAM ====================
    else if ($resource === 'team' || $endpoint === 'team') {
        if ($method === 'GET') {
            $rows = fetch_all_assoc($conn, 'SELECT * FROM team ORDER BY id');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            $name = $input['name'] ?? null;
            $role = $input['role'] ?? null;
            $imageUrl = $input['imageUrl'] ?? null;

            $stmt = $conn->prepare('INSERT INTO team (name, role, imageUrl) VALUES (?, ?, ?)');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('sss', $name, $role, $imageUrl);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $name = $input['name'] ?? null;
            $role = $input['role'] ?? null;
            $imageUrl = $input['imageUrl'] ?? null;

            $stmt = $conn->prepare('UPDATE team SET name = ?, role = ?, imageUrl = ? WHERE id = ?');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('sssi', $name, $role, $imageUrl, $id);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['success' => true]);
        } elseif ($method === 'DELETE' && $id) {
            $stmt = $conn->prepare('DELETE FROM team WHERE id = ?');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
    
    // ==================== CONTACTS ====================
    else if ($resource === 'contacts') {
        if ($method === 'GET') {
            $rows = fetch_all_assoc($conn, 'SELECT * FROM contacts ORDER BY created_at DESC');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            $name = $input['name'] ?? null;
            $email = $input['email'] ?? null;
            $phone = $input['phone'] ?? null;
            $service = $input['service'] ?? null;
            $message = $input['message'] ?? null;

            $stmt = $conn->prepare('INSERT INTO contacts (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)');
            if ($stmt === false) { http_response_code(500); echo json_encode(['error' => 'Database prepare failed: ' . ($conn->error ?? 'unknown')]); exit; }
            $ok = $stmt->bind_param('sssss', $name, $email, $phone, $service, $message);
            if ($ok === false) { http_response_code(500); echo json_encode(['error' => 'bind_param failed']); exit; }
            if (!$stmt->execute()) { http_response_code(500); echo json_encode(['error' => 'Execute failed: ' . $stmt->error]); exit; }
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'DELETE' && $id) {
            $stmt = $conn->prepare('DELETE FROM contacts WHERE id = ?');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
    
    // ==================== SUBSCRIBERS ====================
    else if ($resource === 'subscribers' || $endpoint === 'subscribe') {
        if ($method === 'GET') {
            // Get subscribers (admin only - no email field exposed)
            $rows = fetch_all_assoc($conn, 'SELECT id, email FROM subscribers ORDER BY created_at DESC');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            // Subscribe new email
            $email = $input['email'] ?? '';
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid email']);
                exit;
            }
            
            // Check if already exists
            $existing = fetch_one($conn, 'SELECT id FROM subscribers WHERE email = ?', [$email], 's');
            if ($existing) {
                echo json_encode(['success' => false, 'message' => 'Already subscribed']);
                exit;
            }
            
            $stmt = $conn->prepare('INSERT INTO subscribers (email) VALUES (?)');
            $stmt->bind_param('s', $email);
            $stmt->execute();
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        }
    }
    
    else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
?>
