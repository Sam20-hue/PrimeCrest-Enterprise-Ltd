<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(200, ['status' => 'ok', 'message' => 'Upload API is available. Use POST to upload files.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Method not allowed.']);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    respond(400, ['error' => 'No file uploaded or upload error.']);
}

$uploadsDir = __DIR__ . '/../uploads';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

$file = $_FILES['file'];
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$ext = $ext ? '.' . preg_replace('/[^a-zA-Z0-9]/', '', $ext) : '';
$filename = time() . '-' . bin2hex(random_bytes(4)) . $ext;
$target = $uploadsDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $target)) {
    respond(500, ['error' => 'Failed to save uploaded file.']);
}

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$url = sprintf('%s://%s/uploads/%s', $protocol, $host, $filename);

respond(200, ['url' => $url]);
