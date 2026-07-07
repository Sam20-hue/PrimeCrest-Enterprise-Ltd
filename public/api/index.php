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

try {
    // ==================== SETTINGS ====================
    if ($resource === 'settings' || $endpoint === 'settings') {
        if ($method === 'GET') {
            $row = fetch_one($conn, 'SELECT * FROM settings LIMIT 1');
            echo json_encode($row ?: []);
        } elseif ($method === 'PUT') {
            $fields = [];
            $values = [];
            $types = '';
            
            foreach (['siteName', 'logo', 'phone', 'email', 'address', 'footerText', 'aboutText', 'heroTitle', 'heroSubtitle', 'heroImage'] as $field) {
                if (isset($input[$field])) {
                    $fields[] = "$field = ?";
                    $values[] = $input[$field];
                    $types .= 's';
                }
            }
            
            if (!empty($fields)) {
                $query = 'UPDATE settings SET ' . implode(', ', $fields) . ', updated_at = NOW()';
                $result = query_json($conn, $query, $values, $types);
                echo json_encode(['success' => true, 'message' => 'Settings updated']);
            } else {
                echo json_encode(['error' => 'No fields to update']);
            }
        }
    }
    
    // ==================== SERVICES ====================
    else if ($resource === 'services' || $endpoint === 'services') {
        if ($method === 'GET') {
            $rows = fetch_all_assoc($conn, 'SELECT * FROM services ORDER BY id');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            $stmt = $conn->prepare('INSERT INTO services (title, subtitle, icon, description, imageUrl, images, imagesCaptions) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $stmt->bind_param('sssssss', $input['title'], $input['subtitle'], $input['icon'], $input['description'], $input['imageUrl'], $images, $captions);
            $stmt->execute();
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $stmt = $conn->prepare('UPDATE services SET title = ?, subtitle = ?, icon = ?, description = ?, imageUrl = ?, images = ?, imagesCaptions = ? WHERE id = ?');
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $stmt->bind_param('sssssssi', $input['title'], $input['subtitle'], $input['icon'], $input['description'], $input['imageUrl'], $images, $captions, $id);
            $stmt->execute();
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
            $stmt = $conn->prepare('INSERT INTO gallery (title, category, imageUrl, images, imagesCaptions, description) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->bind_param('ssssss', $input['title'], $input['category'], $input['imageUrl'], $images, $captions, $input['description']);
            $stmt->execute();
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $stmt = $conn->prepare('UPDATE gallery SET title = ?, category = ?, imageUrl = ?, images = ?, imagesCaptions = ?, description = ? WHERE id = ?');
            $stmt->bind_param('ssssssi', $input['title'], $input['category'], $input['imageUrl'], $images, $captions, $input['description'], $id);
            $stmt->execute();
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
            $stmt = $conn->prepare('INSERT INTO blog (title, excerpt, content, category, imageUrl, images, imagesCaptions, author, authorId, published, date, published_at, newsletterSent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->bind_param('ssssssssisssi', $input['title'], $input['excerpt'], $input['content'], $input['category'], $input['imageUrl'], $images, $captions, $input['author'], $input['authorId'], $published, $input['date'], $input['published_at'] ?? $input['date'], !empty($input['newsletterSent']) ? 1 : 0);
            $stmt->execute();
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $images = is_array($input['images'] ?? null) ? json_encode($input['images'], JSON_UNESCAPED_UNICODE) : ($input['images'] ?? null);
            $captions = is_array($input['imagesCaptions'] ?? null) ? json_encode($input['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($input['imagesCaptions'] ?? null);
            $published = !empty($input['published']) ? 1 : 0;
            $stmt = $conn->prepare('UPDATE blog SET title = ?, excerpt = ?, content = ?, category = ?, imageUrl = ?, images = ?, imagesCaptions = ?, author = ?, authorId = ?, published = ?, date = ?, published_at = ?, newsletterSent = ? WHERE id = ?');
            $stmt->bind_param('ssssssssisssii', $input['title'], $input['excerpt'], $input['content'], $input['category'], $input['imageUrl'], $images, $captions, $input['author'], $input['authorId'], $published, $input['date'], $input['published_at'] ?? $input['date'], !empty($input['newsletterSent']) ? 1 : 0, $id);
            $stmt->execute();
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
            $stmt = $conn->prepare('INSERT INTO testimonials (name, role, photo, quote) VALUES (?, ?, ?, ?)');
            $stmt->bind_param('ssss', $input['name'], $input['role'], $input['photo'], $input['quote']);
            $stmt->execute();
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $stmt = $conn->prepare('UPDATE testimonials SET name = ?, role = ?, photo = ?, quote = ? WHERE id = ?');
            $stmt->bind_param('ssssi', $input['name'], $input['role'], $input['photo'], $input['quote'], $id);
            $stmt->execute();
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
            $stmt = $conn->prepare('INSERT INTO team (name, role, imageUrl) VALUES (?, ?, ?)');
            $stmt->bind_param('sss', $input['name'], $input['role'], $input['imageUrl']);
            $stmt->execute();
            echo json_encode(['id' => $conn->insert_id, 'success' => true]);
        } elseif ($method === 'PUT' && $id) {
            $stmt = $conn->prepare('UPDATE team SET name = ?, role = ?, imageUrl = ? WHERE id = ?');
            $stmt->bind_param('sssi', $input['name'], $input['role'], $input['imageUrl'], $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        } elseif ($method === 'DELETE' && $id) {
            $stmt = $conn->prepare('DELETE FROM team WHERE id = ?');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
    
    // ==================== CONTACTS ====================
    else if ($resource === 'contacts' || $endpoint === 'contact') {
        if ($method === 'GET') {
            $rows = fetch_all_assoc($conn, 'SELECT * FROM contacts ORDER BY created_at DESC');
            echo json_encode($rows);
        } elseif ($method === 'POST') {
            $stmt = $conn->prepare('INSERT INTO contacts (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)');
            $stmt->bind_param('sssss', $input['name'], $input['email'], $input['phone'], $input['service'], $input['message']);
            $stmt->execute();
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
