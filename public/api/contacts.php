<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function getContactsStoragePath() {
    return __DIR__ . '/contacts.json';
}

function respond($code, $payload) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function loadContactsFromFile() {
    $path = getContactsStoragePath();
    if (!file_exists($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(400, ['error' => 'Contact id is required for deletion.']);
    }

    $contacts = loadContactsFromFile();
    $filtered = array_values(array_filter($contacts, function ($contact) use ($id) {
        return (string) $contact['id'] !== (string) $id;
    }));

    file_put_contents(getContactsStoragePath(), json_encode($filtered, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    respond(200, ['success' => true, 'id' => $id]);
}

$contacts = loadContactsFromFile();

usort($contacts, function ($a, $b) {
    return strtotime($b['created_at']) <=> strtotime($a['created_at']);
});

respond(200, $contacts);
