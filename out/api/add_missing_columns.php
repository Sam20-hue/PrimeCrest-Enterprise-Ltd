<?php
// Safe migration: add missing columns required by router.php
// Usage: upload to server under public/api/ and visit /api/add_missing_columns.php
// This script includes db.php to reuse the existing DB connection.
ini_set('display_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';

function column_exists($conn, $table, $column) {
    $sql = "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $table, $column);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    return intval($res['c']) > 0;
}

function add_column($conn, $table, $columnSql) {
    $sql = "ALTER TABLE `$table` ADD COLUMN $columnSql";
    return @mysqli_query($conn, $sql);
}

$changes = [];

$migrations = [
    'blog' => [
        "title VARCHAR(255) DEFAULT NULL",
        "excerpt TEXT DEFAULT NULL",
        "content LONGTEXT DEFAULT NULL",
        "category VARCHAR(100) DEFAULT NULL",
        "imageUrl VARCHAR(1000) DEFAULT NULL",
        "images LONGTEXT DEFAULT NULL",
        "imagesCaptions LONGTEXT DEFAULT NULL",
        "author VARCHAR(255) DEFAULT NULL",
        "authorId VARCHAR(100) DEFAULT NULL",
        "published TINYINT(1) DEFAULT 0",
        "date DATE DEFAULT NULL",
        "published_at DATETIME DEFAULT NULL",
        "newsletterSent TINYINT(1) DEFAULT 0",
        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    ],
    'gallery' => [
        "title VARCHAR(255) DEFAULT NULL",
        "category VARCHAR(100) DEFAULT NULL",
        "imageUrl VARCHAR(1000) DEFAULT NULL",
        "images LONGTEXT DEFAULT NULL",
        "imagesCaptions LONGTEXT DEFAULT NULL",
        "description TEXT DEFAULT NULL",
        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    ],
    'testimonials' => [
        "name VARCHAR(255) DEFAULT NULL",
        "role VARCHAR(255) DEFAULT NULL",
        "photo VARCHAR(255) DEFAULT NULL",
        "quote TEXT DEFAULT NULL",
    ],
    'services' => [
        "title VARCHAR(255) DEFAULT NULL",
        "subtitle VARCHAR(255) DEFAULT NULL",
        "icon VARCHAR(100) DEFAULT NULL",
        "description TEXT DEFAULT NULL",
        "imageUrl VARCHAR(1000) DEFAULT NULL",
        "images LONGTEXT DEFAULT NULL",
        "imagesCaptions LONGTEXT DEFAULT NULL",
        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    ],
];

foreach ($migrations as $table => $cols) {
    foreach ($cols as $colSql) {
        // extract column name
        $parts = preg_split('/\s+/', trim($colSql));
        $colName = $parts[0];
        if (column_exists($conn, $table, $colName)) {
            $changes[] = [ 'table' => $table, 'column' => $colName, 'status' => 'exists' ];
            continue;
        }
        $ok = add_column($conn, $table, $colSql);
        $changes[] = [ 'table' => $table, 'column' => $colName, 'status' => $ok ? 'added' : 'failed', 'error' => $ok ? null : mysqli_error($conn) ];
    }
}

header('Content-Type: application/json');
echo json_encode(['ok' => true, 'changes' => $changes], JSON_PRETTY_PRINT);

// Done

?>
