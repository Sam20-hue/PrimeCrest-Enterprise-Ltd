<?php
/**
 * One-time migration: add admin2faSecret and admin2faEnabled to settings table
 * Usage (after upload):
 *  - Backup your database first (phpMyAdmin Export)
 *  - Visit: https://your-domain.com/api/add_2fa_columns.php?confirm=apply-now
 *  - After it reports success, delete this file from the server.
 */
header('Content-Type: application/json; charset=utf-8');

if (php_sapi_name() === 'cli') {
    echo "This script is intended to run via web (browser).\n";
    exit(1);
}

if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'apply-now') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing confirm=apply-now query parameter. This prevents accidental execution.']);
    exit;
}

// load DB connection (uses existing public/api/db.php env loading)
require_once __DIR__ . '/db.php';

try {
    $result = [];

    // Ensure settings table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'settings'");
    if (!$tableCheck || $tableCheck->num_rows === 0) {
        throw new Exception('settings table not found');
    }

    // admin2faSecret
    $colCheck = $conn->query("SHOW COLUMNS FROM `settings` LIKE 'admin2faSecret'");
    if ($colCheck === false) throw new Exception($conn->error);
    if ($colCheck->num_rows === 0) {
        $sql = "ALTER TABLE `settings` ADD COLUMN `admin2faSecret` VARCHAR(255) DEFAULT NULL";
        if (!$conn->query($sql)) throw new Exception('Failed to add admin2faSecret: ' . $conn->error);
        $result[] = 'added admin2faSecret';
    } else {
        $result[] = 'admin2faSecret already exists';
    }

    // admin2faEnabled
    $colCheck2 = $conn->query("SHOW COLUMNS FROM `settings` LIKE 'admin2faEnabled'");
    if ($colCheck2 === false) throw new Exception($conn->error);
    if ($colCheck2->num_rows === 0) {
        $sql2 = "ALTER TABLE `settings` ADD COLUMN `admin2faEnabled` TINYINT(1) DEFAULT 0";
        if (!$conn->query($sql2)) throw new Exception('Failed to add admin2faEnabled: ' . $conn->error);
        $result[] = 'added admin2faEnabled';
    } else {
        $result[] = 'admin2faEnabled already exists';
    }

    echo json_encode(['ok' => true, 'detail' => $result]);
    exit;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit;
}
