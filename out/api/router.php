<?php
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT & ~E_NOTICE & ~E_WARNING);

if (ob_get_level() === 0) {
    ob_start();
}
// Path for append-only API response debug log. Keep small; rotate/delete on server if needed.
$__api_debug_log = __DIR__ . '/last_api_responses.log';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';

if (!function_exists('ensureSchema')) {
    function ensureSchema(?mysqli $conn): void {
        // Fallback stub for static analysis; actual implementation is loaded from db.php.
    }
}

if (!function_exists('fetch_one')) {
    function fetch_one(?mysqli $conn, string $query, array $params = [], string $types = ''): ?array {
        return null;
    }
}

if (!function_exists('fetch_all_assoc')) {
    function fetch_all_assoc(?mysqli $conn, string $query, array $params = [], string $types = ''): array {
        return [];
    }
}

if (!function_exists('safeQuery')) {
    function safeQuery(?mysqli $conn, string $query, array $params = [], string $types = '') {
        return false;
    }
}

if (!function_exists('query_json')) {
    function query_json(?mysqli $conn, string $query, array $params = [], string $types = ''): bool {
        return false;
    }
}

ensureSchema($conn);

/**
 * @param int $code
 * @param mixed $payload
 */
function respond(int $code, mixed $payload): void {
    global $__api_debug_log;

    // Ensure any accidental buffered output is removed so client receives pure JSON.
    if (ob_get_length() !== false) {
        ob_clean();
    }

    // Create a compact log entry for debugging; do not include headers or secrets.
    try {
        $entry = [
            'time' => date('c'),
            'uri' => $_SERVER['REQUEST_URI'] ?? '',
            'method' => $_SERVER['REQUEST_METHOD'] ?? '',
            'status' => $code,
            'payload' => $payload,
        ];
        @file_put_contents($__api_debug_log, json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND | LOCK_EX);
    } catch (Throwable $e) {
        // ignore logging failures
    }

    http_response_code($code);
    $json = json_encode($payload);
    if ($json === false) {
        $json = json_encode(['error' => 'Unable to encode response as JSON']);
    }
    echo preg_replace('/^\xEF\xBB\xBF+/', '', $json);
    exit;
}

function getRequestBody(): ?array {
    $input = file_get_contents('php://input');
    if ($input === false || trim($input) === '') {
        return null;
    }

    $decoded = json_decode($input, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        return $decoded;
    }

    if (!empty($_POST)) {
        return $_POST;
    }

    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (strpos($contentType, 'application/x-www-form-urlencoded') !== false) {
        parse_str($input, $parsed);
        return $parsed;
    }

    return null;
}

function getRandomBytes(int $length): string {
    if (function_exists('random_bytes')) {
        return random_bytes($length);
    }
    if (function_exists('openssl_random_pseudo_bytes')) {
        return openssl_random_pseudo_bytes($length);
    }
    $bytes = '';
    for ($i = 0; $i < $length; $i++) {
        $bytes .= chr(mt_rand(0, 255));
    }
    return $bytes;
}

function base32Encode(string $data): string {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $binary = '';
    foreach (str_split($data) as $char) {
        $binary .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
    }
    $output = '';
    foreach (str_split($binary, 5) as $chunk) {
        $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
        $output .= $alphabet[bindec($chunk)];
    }
    while (strlen($output) % 8 !== 0) {
        $output .= '=';
    }
    return $output;
}

function base32Decode(string $b32): string {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $b32 = strtoupper($b32);
    $b32 = str_replace('=', '', $b32);
    $binary = '';
    foreach (str_split($b32, 1) as $char) {
        $pos = strpos($alphabet, $char);
        if ($pos === false) {
            continue;
        }
        $binary .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
    }
    $output = '';
    foreach (str_split($binary, 8) as $byte) {
        if (strlen($byte) === 8) {
            $output .= chr(bindec($byte));
        }
    }
    return $output;
}

function hotp(string $secret, int $counter, int $digits = 6): string {
    $key = base32Decode($secret);
    $counterBytes = pack('NN', $counter >> 32, $counter & 0xFFFFFFFF);
    $hash = hash_hmac('sha1', $counterBytes, $key, true);
    $offset = ord($hash[19]) & 0x0F;
    $binary = ((ord($hash[$offset]) & 0x7f) << 24) |
              ((ord($hash[$offset + 1]) & 0xff) << 16) |
              ((ord($hash[$offset + 2]) & 0xff) << 8) |
              (ord($hash[$offset + 3]) & 0xff);
    $otp = $binary % pow(10, $digits);
    return str_pad((string)$otp, $digits, '0', STR_PAD_LEFT);
}

function verifyTotp(string $secret, string $token): bool {
    $timestamp = time();
    $interval = 30;
    for ($i = -1; $i <= 1; $i++) {
        $counter = (int) floor($timestamp / $interval) + $i;
        if (hotp($secret, $counter) === $token) {
            return true;
        }
    }
    return false;
}

function upsertSettings(array $payload): void {
    $allowed = [
        'siteName','logo','logoUrl','logoAltText','logoWidth','logoHeight','logoDisplayMode','logoContrast','logoSharpness','logoBorderRadius',
        'companyName','tagline','phone','email','address','aboutText','briefExplanation','privacyPolicy','termsOfService',
        'adminPassword','adminEmail','heroTitle','heroSubtitle','heroImage','footerText','mysqlApiUrl','admin2faSecret','admin2faEnabled',
    ];

    $fields = [];
    $params = [];
    $types = '';
    foreach ($allowed as $field) {
        if (array_key_exists($field, $payload)) {
            $fields[] = "$field = ?";
            $params[] = $payload[$field];
            $types .= is_int($payload[$field]) || is_bool($payload[$field]) ? 'i' : 's';
        }
    }

    if (empty($fields)) {
        return;
    }

    $existing = fetch_one($GLOBALS['conn'], 'SELECT id FROM settings LIMIT 1');
    if ($existing) {
        $params[] = $existing['id'];
        $types .= 'i';
        safeQuery($GLOBALS['conn'], 'UPDATE settings SET ' . implode(', ', $fields) . ' WHERE id = ?', $params, $types);
    } else {
        $columns = array_keys(array_filter(array_combine($allowed, $allowed), fn($field) => array_key_exists($field, $payload)));
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        safeQuery($GLOBALS['conn'], 'INSERT INTO settings (' . implode(', ', $columns) . ') VALUES (' . $placeholders . ')', $params, $types);
    }
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '';
$path = preg_replace('#^/api#', '', $uri);
$path = trim($path, '/');
$segments = $path === '' ? [] : explode('/', $path);
$resource = $segments[0] ?? '';
$action = $segments[1] ?? null;
$id = isset($segments[1]) && ctype_digit($segments[1]) ? (int)$segments[1] : null;
$method = $_SERVER['REQUEST_METHOD'];
$payload = getRequestBody();

if ($resource === 'health') {
    respond(200, ['status' => 'ok', 'time' => date('c')]);
}

if ($resource === 'auth') {
    if ($action === '2fa-status' && $method === 'GET') {
        $email = trim($_GET['email'] ?? '');
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(400, ['error' => 'Valid email is required.']);
        }
        $row = fetch_one($conn, 'SELECT admin2faSecret, admin2faEnabled FROM settings LIMIT 1');
        respond(200, ['setup' => !empty($row['admin2faSecret']), 'enabled' => !empty($row['admin2faEnabled'])]);
    }
    if ($action === 'setup-2fa' && $method === 'POST') {
        if (!is_array($payload)) {
            respond(400, ['error' => 'Invalid request payload']);
        }
        $email = trim($payload['email'] ?? '');
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(400, ['error' => 'Valid email is required.']);
        }
        $secret = strtoupper(str_replace('=', '', base32Encode(getRandomBytes(10))));
        $existing = fetch_one($conn, 'SELECT id FROM settings LIMIT 1');
        if ($existing) {
            safeQuery($conn, 'UPDATE settings SET admin2faSecret = ?, admin2faEnabled = 0 WHERE id = ?', [$secret, $existing['id']], 'si');
        } else {
            safeQuery($conn, 'INSERT INTO settings (admin2faSecret, admin2faEnabled) VALUES (?, 0)', [$secret], 's');
        }
        $otpauth = 'otpauth://totp/' . rawurlencode('Primecrest Enterprise:' . $email) . '?secret=' . $secret . '&issuer=' . rawurlencode('Primecrest Enterprise') . '&algorithm=SHA1&digits=6&period=30';
        respond(200, ['success' => true, 'secret' => $secret, 'otpauthUrl' => $otpauth, 'qrCode' => 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=' . rawurlencode($otpauth)]);
    }
    if ($action === 'verify-2fa' && $method === 'POST') {
        if (!is_array($payload)) {
            respond(400, ['error' => 'Invalid request payload']);
        }
        $email = trim($payload['email'] ?? '');
        $token = preg_replace('/\D/', '', trim($payload['token'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(400, ['error' => 'Valid email is required.']);
        }
        if (strlen($token) !== 6) {
            respond(400, ['error' => 'Invalid token format.']);
        }
        $row = fetch_one($conn, 'SELECT admin2faSecret FROM settings LIMIT 1');
        $secret = $row['admin2faSecret'] ?? '';
        if ($secret === '' || !verifyTotp($secret, $token)) {
            respond(401, ['error' => 'Invalid or expired token.']);
        }
        $existing = fetch_one($conn, 'SELECT id FROM settings LIMIT 1');
        if ($existing) {
            safeQuery($conn, 'UPDATE settings SET admin2faEnabled = 1 WHERE id = ?', [$existing['id']], 'i');
        }
        respond(200, ['success' => true, 'message' => '2FA token verified']);
    }
    if ($action === 'reset-2fa' && $method === 'POST') {
        $email = trim($payload['email'] ?? '');
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(400, ['error' => 'Valid email is required.']);
        }
        $existing = fetch_one($conn, 'SELECT id FROM settings LIMIT 1');
        if ($existing) {
            safeQuery($conn, 'UPDATE settings SET admin2faSecret = NULL, admin2faEnabled = 0 WHERE id = ?', [$existing['id']], 'i');
        }
        respond(200, ['success' => true, 'message' => '2FA reset']);
    }
    respond(404, ['error' => 'Auth endpoint not found.']);
}

if ($resource === 'settings') {
    if ($method === 'GET') {
        $row = fetch_one($conn, 'SELECT * FROM settings LIMIT 1');
        respond(200, $row ?: null);
    }
    if ($method === 'PUT') {
        if (!is_array($payload)) {
            respond(400, ['error' => 'Invalid request payload']);
        }
        upsertSettings($payload);
        $row = fetch_one($conn, 'SELECT * FROM settings LIMIT 1');
        respond(200, $row ?: ['success' => true]);
    }
    respond(405, ['error' => 'Method not allowed']);
}

if ($resource === 'sync') {
    if ($method !== 'POST') {
        respond(405, ['error' => 'Method not allowed']);
    }
    if (!is_array($payload)) {
        respond(400, ['error' => 'Invalid sync payload']);
    }
    $collections = ['services','gallery','blog','products','testimonials','team','authors'];
    foreach ($collections as $collection) {
        if (empty($payload[$collection]) || !is_array($payload[$collection])) {
            continue;
        }
        safeQuery($conn, "TRUNCATE TABLE {$collection}");
        foreach ($payload[$collection] as $item) {
            if (!is_array($item)) {
                continue;
            }
            switch ($collection) {
                case 'services':
                    safeQuery($conn, 'INSERT INTO services (title, subtitle, icon, description, imageUrl, images, imagesCaptions) VALUES (?, ?, ?, ?, ?, ?, ?)', [$item['title'] ?? null, $item['subtitle'] ?? null, $item['icon'] ?? null, $item['description'] ?? null, $item['imageUrl'] ?? null, is_array($item['images'] ?? null) ? json_encode($item['images'], JSON_UNESCAPED_UNICODE) : ($item['images'] ?? null), is_array($item['imagesCaptions'] ?? null) ? json_encode($item['imagesCaptions'], JSON_UNESCAPED_UNICODE) : ($item['imagesCaptions'] ?? null)], 'sssssss');
                    break;
                case 'gallery':
                    $imagesValue = null;
                    if (!empty($item['images'])) {
                        $imagesValue = is_array($item['images']) ? json_encode($item['images'], JSON_UNESCAPED_UNICODE) : $item['images'];
                    }
                    $imagesCaptionsValue = null;
                    if (!empty($item['imagesCaptions'])) {
                        $imagesCaptionsValue = is_array($item['imagesCaptions']) ? json_encode($item['imagesCaptions'], JSON_UNESCAPED_UNICODE) : $item['imagesCaptions'];
                    }
                    safeQuery($conn, 'INSERT INTO gallery (title, category, imageUrl, images, imagesCaptions, description) VALUES (?, ?, ?, ?, ?, ?)', [$item['title'] ?? null, $item['category'] ?? null, $item['imageUrl'] ?? null, $imagesValue, $imagesCaptionsValue, $item['description'] ?? null], 'ssssss');
                    break;
                case 'blog':
                    // Allow storing multiple images as JSON in the `images` column if provided.
                    $imagesValue = null;
                    if (!empty($item['images'])) {
                        $imagesValue = is_array($item['images']) ? json_encode($item['images'], JSON_UNESCAPED_UNICODE) : $item['images'];
                    }
                    $imagesCaptionsValue = null;
                    if (!empty($item['imagesCaptions'])) {
                        $imagesCaptionsValue = is_array($item['imagesCaptions']) ? json_encode($item['imagesCaptions'], JSON_UNESCAPED_UNICODE) : $item['imagesCaptions'];
                    }
                    safeQuery($conn, 'INSERT INTO blog (title, excerpt, content, category, imageUrl, images, imagesCaptions, author, authorId, published, date, published_at, newsletterSent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [$item['title'] ?? null, $item['excerpt'] ?? null, $item['content'] ?? null, $item['category'] ?? null, $item['imageUrl'] ?? null, $imagesValue, $imagesCaptionsValue, $item['author'] ?? null, $item['authorId'] ?? null, !empty($item['published']) ? 1 : 0, $item['date'] ?? null, $item['published_at'] ?? ($item['date'] ?? null), !empty($item['newsletterSent']) ? 1 : 0], 'sssssssssissi');
                    break;
                case 'products':
                    safeQuery($conn, 'INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)', [$item['name'] ?? null, $item['description'] ?? null, isset($item['price']) ? floatval($item['price']) : 0.0, $item['image'] ?? null], 'sdss');
                    break;
                case 'testimonials':
                    safeQuery($conn, 'INSERT INTO testimonials (name, role, photo, quote) VALUES (?, ?, ?, ?)', [$item['name'] ?? null, $item['role'] ?? null, $item['photo'] ?? null, $item['quote'] ?? null], 'ssss');
                    break;
                case 'team':
                    safeQuery($conn, 'INSERT INTO team (name, role, imageUrl) VALUES (?, ?, ?)', [$item['name'] ?? null, $item['role'] ?? null, $item['imageUrl'] ?? null], 'sss');
                    break;
                case 'authors':
                    safeQuery($conn, 'INSERT INTO authors (name, imageUrl, bio, subtitle, joinDate, lastActive, linkedIn, upwork) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [$item['name'] ?? null, $item['imageUrl'] ?? null, $item['bio'] ?? null, $item['subtitle'] ?? null, $item['joinDate'] ?? null, $item['lastActive'] ?? null, $item['linkedIn'] ?? null, $item['upwork'] ?? null], 'ssssssss');
                    break;
            }
        }
    }
    if (!empty($payload['settings']) && is_array($payload['settings'])) {
        upsertSettings($payload['settings']);
    }
    respond(200, ['success' => true]);
}

if ($resource === 'blog' && $action === 'notify-subscribers' && $method === 'POST') {
    respond(200, ['success' => true, 'message' => 'Blog notification is not configured on shared hosting.']);
}

$resourceMap = [
    'services' => ['table' => 'services', 'columns' => ['title','subtitle','icon','description','imageUrl','images','imagesCaptions']],
    'gallery' => ['table' => 'gallery', 'columns' => ['title','category','imageUrl','images','imagesCaptions','description']],
    'blog' => ['table' => 'blog', 'columns' => ['title','excerpt','content','category','imageUrl','images','imagesCaptions','author','authorId','published','date','published_at','newsletterSent']],
    'products' => ['table' => 'products', 'columns' => ['name','description','price','image']],
    'testimonials' => ['table' => 'testimonials', 'columns' => ['name','role','photo','quote']],
    'team' => ['table' => 'team', 'columns' => ['name','role','imageUrl']],
    'authors' => ['table' => 'authors', 'columns' => ['name','imageUrl','bio','subtitle','joinDate','lastActive','linkedIn','upwork']],
    'subscribers' => ['table' => 'subscribers', 'columns' => ['email']],
];

function getTableColumns(mysqli $conn, string $table): array {
    $stmt = $conn->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
    $stmt->bind_param('s', $table);
    $stmt->execute();
    $result = $stmt->get_result();
    $columns = [];
    while ($row = $result->fetch_assoc()) {
        $columns[] = $row['COLUMN_NAME'];
    }
    return $columns;
}

function filterColumns(array $desired, array $actual): array {
    return array_values(array_intersect($desired, $actual));
}

if (!isset($resourceMap[$resource])) {
    respond(404, ['error' => 'Endpoint not found']);
}

$actualColumns = getTableColumns($conn, $resourceMap[$resource]['table']);
$columns = filterColumns($resourceMap[$resource]['columns'], $actualColumns);

if (empty($columns) && $resource !== 'subscribers') {
    respond(500, ['error' => 'No valid columns available for resource ' . $resource]);
}

if ($resource === 'subscribers') {
    if ($method === 'GET') {
        $rows = fetch_all_assoc($conn, 'SELECT email FROM subscribers ORDER BY id DESC');
        respond(200, array_map(fn($row) => $row['email'], $rows));
    }
    if ($method === 'POST') {
        if (!is_array($payload) || empty(trim((string)($payload['email'] ?? '')))) {
            respond(400, ['error' => 'Email is required']);
        }
        $email = trim((string)$payload['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(400, ['error' => 'Invalid email']);
        }
        $existing = fetch_one($conn, 'SELECT id FROM subscribers WHERE email = ?', [$email], 's');
        if ($existing) {
            respond(200, ['success' => false, 'message' => 'Already subscribed']);
        }
        safeQuery($conn, 'INSERT INTO subscribers (email) VALUES (?)', [$email], 's');
        respond(201, ['success' => true, 'email' => $email]);
    }
    if ($method === 'DELETE') {
        $email = trim($_GET['email'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(400, ['error' => 'Valid email query parameter required']);
        }
        safeQuery($conn, 'DELETE FROM subscribers WHERE email = ?', [$email], 's');
        respond(200, ['success' => true, 'email' => $email]);
    }
    respond(405, ['error' => 'Method not allowed']);
}

$table = $resourceMap[$resource]['table'];
if ($method === 'GET') {
    if ($id === null) {
        $rows = fetch_all_assoc($conn, "SELECT * FROM {$table} ORDER BY id");
        respond(200, $rows);
    }
    $row = fetch_one($conn, "SELECT * FROM {$table} WHERE id = ?", [$id], 'i');
    if (!$row) {
        respond(404, ['error' => 'Item not found']);
    }
    respond(200, $row);
}

if ($method === 'POST') {
    if (!is_array($payload)) {
        respond(400, ['error' => 'Invalid request payload']);
    }
    $fieldNames = [];
    $values = [];
    $types = '';
    foreach ($columns as $column) {
        $fieldNames[] = $column;
        if ($column === 'published' || $column === 'newsletterSent') {
            $values[] = !empty($payload[$column]) ? 1 : 0;
            $types .= 'i';
        } elseif ($column === 'price') {
            $values[] = isset($payload['price']) ? floatval($payload['price']) : 0.0;
            $types .= 'd';
        } elseif ($column === 'published_at') {
            $values[] = $payload['published_at'] ?? ($payload['date'] ?? null);
            $types .= 's';
        } else {
            $val = $payload[$column] ?? null;
            if (is_array($val)) {
                $val = json_encode($val, JSON_UNESCAPED_UNICODE);
            }
            $values[] = $val;
            $types .= 's';
        }
    }
    $placeholders = implode(', ', array_fill(0, count($fieldNames), '?'));
    safeQuery($conn, "INSERT INTO {$table} (" . implode(', ', $fieldNames) . ") VALUES ({$placeholders})", $values, $types);
    $insertId = $conn->insert_id;
    $row = fetch_one($conn, "SELECT * FROM {$table} WHERE id = ?", [$insertId], 'i');
    respond(201, $row ?: ['id' => $insertId, 'success' => true]);
}

if ($method === 'PUT') {
    if ($id === null) {
        respond(400, ['error' => 'Item ID is required']);
    }
    if (!is_array($payload)) {
        respond(400, ['error' => 'Invalid request payload']);
    }
    $fields = [];
    $values = [];
    $types = '';
    foreach ($columns as $column) {
        if (!array_key_exists($column, $payload)) {
            continue;
        }
        $fields[] = "$column = ?";
        if ($column === 'published' || $column === 'newsletterSent') {
            $values[] = !empty($payload[$column]) ? 1 : 0;
            $types .= 'i';
        } elseif ($column === 'price') {
            $values[] = floatval($payload['price']);
            $types .= 'd';
        } else {
            $val = $payload[$column];
            if (is_array($val)) {
                $val = json_encode($val, JSON_UNESCAPED_UNICODE);
            }
            $values[] = $val;
            $types .= 's';
        }
    }
    if (empty($fields)) {
        respond(400, ['error' => 'No fields to update']);
    }
    $values[] = $id;
    $types .= 'i';
    safeQuery($conn, "UPDATE {$table} SET " . implode(', ', $fields) . " WHERE id = ?", $values, $types);
    $row = fetch_one($conn, "SELECT * FROM {$table} WHERE id = ?", [$id], 'i');
    respond(200, $row ?: ['success' => true]);
}

if ($method === 'DELETE') {
    if ($id === null) {
        respond(400, ['error' => 'Item ID is required']);
    }
    safeQuery($conn, "DELETE FROM {$table} WHERE id = ?", [$id], 'i');
    respond(200, ['success' => true, 'id' => $id]);
}

respond(405, ['error' => 'Method not allowed']);
