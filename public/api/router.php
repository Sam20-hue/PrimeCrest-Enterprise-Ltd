<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond($code, $payload) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function getStorageDir() {
    $dir = __DIR__ . '/storage';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function storagePath($filename) {
    return getStorageDir() . '/' . $filename;
}

function loadJson($filename) {
    $path = storagePath($filename);
    if (!file_exists($path)) return null;
    $contents = file_get_contents($path);
    return json_decode($contents, true) ?: null;
}

function saveJson($filename, $data) {
    $path = storagePath($filename);
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function getDefaultSettings() {
    return [
        'logoUrl' => 'https://static.readdy.ai/image/2645941fdc0e183360970fc234d34970/773766d2f6ed38db8ecc7ecb533b68b7.jpeg',
        'companyName' => 'PRIMECREST ENTERPRISE LTD',
        'tagline' => 'Your Trusted Security & Technology Partner',
        'phone' => '0721579821',
        'email' => 'primecrestenterprise@gmail.com',
        'address' => 'Nairobi, Kenya',
        'aboutText' => 'PRIMECREST ENTERPRISE LTD is a leading security and technology company providing comprehensive solutions across Kenya. With years of experience, we deliver professional CCTV installations, vault engineering, biometric systems, alarm installations, and IT infrastructure for banks, Saccos, businesses, and homes.',
        'adminPassword' => 'admin123',
        'adminEmail' => 'samsonakula3@gmail.com',
        'heroTitle' => 'Enterprise Security & Technology Solutions',
        'heroSubtitle' => 'CCTV • Vault Engineering • Biometric Systems • Alarm Systems • IT Solutions',
        'socialMedia' => [
            'facebook' => '',
            'instagram' => '',
            'twitter' => '',
            'linkedin' => '',
            'whatsapp' => '',
            'youtube' => '',
            'tiktok' => '',
        ],
        'mysqlApiUrl' => '',
    ];
}

function getRequestBody() {
    $input = file_get_contents('php://input');
    if (!$input) return null;
    return json_decode($input, true);
}

function generateId() {
    return (string) time() . bin2hex(random_bytes(3));
}

function findItemIndex(array $items, string $id) {
    foreach ($items as $index => $item) {
        if ((string)($item['id'] ?? '') === (string)$id) {
            return $index;
        }
    }
    return null;
}

function base32Encode(string $data): string {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $binary = '';
    foreach (str_split($data) as $c) {
        $binary .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
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
    foreach (str_split($b32) as $c) {
        $pos = strpos($alphabet, $c);
        if ($pos === false) continue;
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
    for ($i = -2; $i <= 2; $i++) {
        $counter = floor($timestamp / $interval) + $i;
        if (hotp($secret, $counter) === $token) {
            return true;
        }
    }
    return false;
}

function getAuthData(): array {
    $data = loadJson('auth.json');
    return is_array($data) ? $data : [];
}

function saveAuthData(array $data) {
    saveJson('auth.json', $data);
}

function getAuthEntry(array &$auth, string $email): array {
    if (is_array($auth[$email] ?? null)) {
        return $auth[$email];
    }

    if (!empty($auth['secret'])) {
        $legacyEntry = [
            'secret' => $auth['secret'],
            'enabled' => !empty($auth['enabled']),
        ];
        if ($email !== '') {
            $auth[$email] = $legacyEntry;
            saveAuthData($auth);
        }
        return $legacyEntry;
    }

    return [];
}

function buildQrCodeUrl(string $email, string $secret): string {
    $label = rawurlencode('Primecrest Enterprise:' . $email);
    $issuer = rawurlencode('Primecrest Enterprise');
    $otpauth = "otpauth://totp/{$label}?secret={$secret}&issuer={$issuer}&algorithm=SHA1&digits=6&period=30";
    return 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=' . rawurlencode($otpauth);
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$script = dirname($_SERVER['SCRIPT_NAME']);
$path = trim(substr($uri, strlen($script)), '/');
$parts = explode('/', $path);
$resource = $parts[0] ?? '';
$id = $parts[1] ?? null;

if ($resource === 'sync' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = getRequestBody();
    if (!is_array($payload)) {
        respond(400, ['error' => 'Invalid sync payload.']);
    }

    $saved = [];
    $collections = ['services', 'gallery', 'blog', 'products', 'testimonials', 'team'];

    if (isset($payload['settings']) && is_array($payload['settings'])) {
        saveJson('settings.json', $payload['settings']);
        $saved[] = 'settings';
    }

    foreach ($collections as $collection) {
        if (isset($payload[$collection]) && is_array($payload[$collection])) {
            saveJson($collection . '.json', $payload[$collection]);
            $saved[] = $collection;
        }
    }

    respond(200, ['success' => true, 'updated' => $saved]);
}

$allowedResources = ['services', 'gallery', 'blog', 'products', 'settings', 'testimonials', 'team', 'auth'];
if (!in_array($resource, $allowedResources, true)) {
    respond(404, ['error' => 'Resource not found.']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($resource === 'settings') {
    $settings = loadJson('settings.json');
    if (!is_array($settings)) {
        $settings = getDefaultSettings();
    }
    if ($method === 'GET') {
        respond(200, $settings);
    }
    if ($method === 'PUT') {
        $payload = getRequestBody();
        if (!is_array($payload)) {
            respond(400, ['error' => 'Invalid request payload.']);
        }
        $updated = array_merge($settings, $payload);
        saveJson('settings.json', $updated);
        respond(200, $updated);
    }
    respond(405, ['error' => 'Method not allowed.']);
}

if ($resource === 'auth') {
    $action = $parts[1] ?? '';
    if ($action === '2fa-status' && $method === 'GET') {
        $email = trim($_GET['email'] ?? '');
        if ($email === '') {
            respond(400, ['error' => 'Email query parameter is required.']);
        }
        $auth = getAuthData();
        $userAuth = getAuthEntry($auth, $email);
        respond(200, [
            'setup' => !empty($userAuth['secret']),
            'enabled' => !empty($userAuth['enabled']),
        ]);
    }
    if ($action === 'setup-2fa' && $method === 'POST') {
        $body = getRequestBody() ?: [];
        $email = trim($body['email'] ?? '');
        if ($email === '') {
            respond(400, ['error' => 'Email is required.']);
        }
        $secret = base32Encode(random_bytes(10));
        $auth = getAuthData();
        $auth[$email] = [
            'secret' => $secret,
            'enabled' => false,
        ];
        saveAuthData($auth);
        $otpauthUrl = "otpauth://totp/" . rawurlencode('Primecrest Enterprise:' . $email) . "?secret={$secret}&issuer=" . rawurlencode('Primecrest Enterprise') . "&algorithm=SHA1&digits=6&period=30";
        respond(200, [
            'success' => true,
            'secret' => $secret,
            'qrCode' => buildQrCodeUrl($email, $secret),
            'otpauthUrl' => $otpauthUrl,
        ]);
    }
    if ($action === 'verify-2fa' && $method === 'POST') {
        $body = getRequestBody() ?: [];
        $email = trim($body['email'] ?? '');
        $token = trim($body['token'] ?? '');
        if ($email === '' || $token === '') {
            respond(400, ['error' => 'Email and token are required.']);
        }
        $auth = getAuthData();
        $userAuth = getAuthEntry($auth, $email);
        $secret = $userAuth['secret'] ?? '';
        if (!$secret) {
            respond(400, ['error' => '2FA is not set up yet for this email.']);
        }
        if (!verifyTotp($secret, $token)) {
            respond(401, ['error' => 'Invalid or expired token.']);
        }
        $auth[$email]['enabled'] = true;
        saveAuthData($auth);
        respond(200, ['success' => true, 'message' => '2FA token verified!']);
    }
    respond(404, ['error' => 'Auth endpoint not found.']);
}

// Collections: services, gallery, blog, products, testimonials, team
$filename = $resource . '.json';
$items = loadJson($filename);
if (!is_array($items)) {
    $items = [];
}

if ($method === 'GET') {
    if ($id === null) {
        respond(200, $items);
    }
    $index = findItemIndex($items, $id);
    if ($index === null) {
        respond(404, ['error' => 'Item not found.']);
    }
    respond(200, $items[$index]);
}

if ($method === 'POST') {
    $payload = getRequestBody();
    if (!is_array($payload) || empty($payload)) {
        respond(400, ['error' => 'Invalid request payload.']);
    }
    $payload['id'] = generateId();
    $payload['created_at'] = $payload['created_at'] ?? date('Y-m-d H:i:s');
    $items[] = $payload;
    saveJson($filename, $items);
    respond(201, $payload);
}

if ($method === 'PUT') {
    if ($id === null) {
        respond(400, ['error' => 'Item ID is required.']);
    }
    $payload = getRequestBody();
    if (!is_array($payload)) {
        respond(400, ['error' => 'Invalid request payload.']);
    }
    $index = findItemIndex($items, $id);
    if ($index === null) {
        respond(404, ['error' => 'Item not found.']);
    }
    $items[$index] = array_merge($items[$index], $payload, ['id' => $id]);
    saveJson($filename, $items);
    respond(200, $items[$index]);
}

if ($method === 'DELETE') {
    if ($id === null) {
        respond(400, ['error' => 'Item ID is required.']);
    }
    $index = findItemIndex($items, $id);
    if ($index === null) {
        respond(404, ['error' => 'Item not found.']);
    }
    array_splice($items, $index, 1);
    saveJson($filename, $items);
    respond(200, ['success' => true, 'id' => $id]);
}

respond(405, ['error' => 'Method not allowed.']);
