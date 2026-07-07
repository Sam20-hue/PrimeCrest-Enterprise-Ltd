<?php
/**
 * deploy_fix.php
 * One-click helper to backup files, add missing 2FA columns, and remove BOMs.
 * Usage: upload to your site root (public_html) and visit:
 *   https://your-domain.com/deploy_fix.php?confirm=apply-now
 * After running and verifying, delete this file.
 */

header('Content-Type: application/json; charset=utf-8');

if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'apply-now') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing confirm=apply-now query parameter.']);
    exit;
}

$root = __DIR__;
$apiDir = $root . '/api';
$uploadsDirs = [$root . '/uploads', $apiDir . '/uploads', $root . '/php-backend/uploads'];
$backupsDir = $root . '/backups';
if (!is_dir($backupsDir)) mkdir($backupsDir, 0755, true);
$report = ['backups' => [], 'migration' => null, 'bom' => null];

// Helper to zip a directory
function zipDir($source, $destination) {
    if (!is_dir($source) && !is_file($source)) return false;
    $zip = new ZipArchive();
    if ($zip->open($destination, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) return false;
    $source = str_replace('\\', '/', realpath($source));
    if (is_dir($source)) {
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($source), RecursiveIteratorIterator::LEAVES_ONLY);
        foreach ($files as $name => $file) {
            if (!$file->isFile()) continue;
            $filePath = $file->getRealPath();
            $relativePath = substr($filePath, strlen($source) + 1);
            $zip->addFile($filePath, $relativePath);
        }
    } else {
        $zip->addFile($source, basename($source));
    }
    $zip->close();
    return file_exists($destination);
}

// 1) Backups
try {
    if (is_dir($apiDir)) {
        $dest = $backupsDir . '/api_backup_' . time() . '.zip';
        if (zipDir($apiDir, $dest)) $report['backups'][] = $dest;
    }
    foreach ($uploadsDirs as $d) {
        if (is_dir($d)) {
            $dest = $backupsDir . '/' . basename($d) . '_backup_' . time() . '.zip';
            if (zipDir($d, $dest)) $report['backups'][] = $dest;
        }
    }
    // backup contacts.json if exists
    $contacts = $apiDir . '/contacts.json';
    if (is_file($contacts)) {
        $dest = $backupsDir . '/contacts_json_' . time() . '.json';
        copy($contacts, $dest);
        $report['backups'][] = $dest;
    }
} catch (Throwable $e) {
    $report['backups_error'] = $e->getMessage();
}

// 2) DB Migration - attempt to require api/db.php for connection
try {
    if (is_file($apiDir . '/db.php')) {
        require_once $apiDir . '/db.php';
        if (!isset($conn) || !$conn instanceof mysqli) {
            $report['migration'] = 'db connection not available (check .env)';
        } else {
            $res = [];
            $tableCheck = $conn->query("SHOW TABLES LIKE 'settings'");
            if ($tableCheck && $tableCheck->num_rows > 0) {
                $colCheck = $conn->query("SHOW COLUMNS FROM `settings` LIKE 'admin2faSecret'");
                if ($colCheck && $colCheck->num_rows === 0) {
                    $ok = $conn->query("ALTER TABLE `settings` ADD COLUMN `admin2faSecret` VARCHAR(255) DEFAULT NULL");
                    $res[] = $ok ? 'added admin2faSecret' : 'failed admin2faSecret: ' . $conn->error;
                } else $res[] = 'admin2faSecret exists';

                $colCheck2 = $conn->query("SHOW COLUMNS FROM `settings` LIKE 'admin2faEnabled'");
                if ($colCheck2 && $colCheck2->num_rows === 0) {
                    $ok2 = $conn->query("ALTER TABLE `settings` ADD COLUMN `admin2faEnabled` TINYINT(1) DEFAULT 0");
                    $res[] = $ok2 ? 'added admin2faEnabled' : 'failed admin2faEnabled: ' . $conn->error;
                } else $res[] = 'admin2faEnabled exists';

                $report['migration'] = $res;
            } else {
                $report['migration'] = 'settings table not found';
            }
        }
    } else {
        $report['migration'] = 'api/db.php not found';
    }
} catch (Throwable $e) {
    $report['migration'] = 'error: ' . $e->getMessage();
}

// 3) Remove BOMs from PHP files in api
try {
    $changed = [];
    if (is_dir($apiDir)) {
        $iter = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($apiDir));
        foreach ($iter as $file) {
            if (!$file->isFile()) continue;
            $path = $file->getPathname();
            if (strtolower(pathinfo($path, PATHINFO_EXTENSION)) !== 'php') continue;
            $contents = file_get_contents($path);
            if ($contents === false) continue;
            $fixed = preg_replace('/^(?:\xEF\xBB\xBF)+/','', $contents);
            if ($fixed !== $contents) {
                @copy($path, $path . '.bak');
                file_put_contents($path, $fixed);
                $changed[] = $path;
            }
        }
    }
    $report['bom'] = $changed;
} catch (Throwable $e) {
    $report['bom_error'] = $e->getMessage();
}

// Return report
echo json_encode(['ok' => true, 'report' => $report], JSON_PRETTY_PRINT);

exit;
