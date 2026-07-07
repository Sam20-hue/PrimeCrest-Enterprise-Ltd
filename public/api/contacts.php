<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';

function respond($code, $payload) {
    if (ob_get_length() !== false) {
        ob_clean();
    }
    http_response_code($code);
    $json = json_encode($payload);
    if ($json === false) {
        $json = json_encode(['error' => 'Unable to encode response as JSON']);
    }
    echo preg_replace('/^\xEF\xBB\xBF+/', '', $json);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if ($id === null || !ctype_digit((string)$id)) {
        respond(400, ['error' => 'Contact id is required for deletion.']);
    }
    safeQuery($conn, 'DELETE FROM contacts WHERE id = ?', [(int)$id], 'i');
    respond(200, ['success' => true, 'id' => (int)$id]);
}

$contacts = fetch_all_assoc($conn, 'SELECT * FROM contacts ORDER BY created_at DESC');
respond(200, $contacts);
