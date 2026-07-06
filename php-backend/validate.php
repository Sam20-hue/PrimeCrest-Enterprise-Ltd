#!/usr/bin/env php
<?php
/**
 * PHP Backend Validation Script
 * Run this on Tru Host to validate the installation
 */

echo "\n=== Primecrest PHP Backend Validation ===\n\n";

// Check PHP version
echo "✓ PHP Version: " . phpversion() . "\n";

// Check required extensions
$extensions = ['mysqli', 'json', 'mbstring'];
echo "\nRequired Extensions:\n";
foreach ($extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "  ✓ $ext\n";
    } else {
        echo "  ✗ $ext (MISSING)\n";
    }
}

// Check file structure
echo "\nFile Structure:\n";
$files = [
    'api/config.php',
    'api/index.php',
    'api/.htaccess',
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "  ✓ $file\n";
    } else {
        echo "  ✗ $file (MISSING)\n";
    }
}

// Check directory permissions
echo "\nDirectory Permissions:\n";
$dirs = [
    'uploads',
    'logs',
];

foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    if (is_writable($dir)) {
        echo "  ✓ $dir (writable)\n";
    } else {
        echo "  ✗ $dir (NOT writable)\n";
    }
}

// Try database connection
echo "\nDatabase Connection:\n";
require_once 'api/config.php';

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    if ($conn->connect_error) {
        echo "  ✗ Connection failed: " . $conn->connect_error . "\n";
    } else {
        echo "  ✓ Connected to " . DB_NAME . "\n";
        $conn->close();
    }
} catch (Exception $e) {
    echo "  ✗ " . $e->getMessage() . "\n";
}

echo "\n=== Validation Complete ===\n";
echo "\nTo test the API:\n";
echo "  1. Visit: http://yourdomain.com/api/health\n";
echo "  2. Should return: {\"status\":\"ok\",\"ping\":{\"ping\":1}}\n";
echo "\nConfiguration:\n";
echo "  - Edit api/config.php with your database credentials\n";
echo "  - Set PUBLIC_BASE_URL to your domain\n";
echo "  - Update SMTP settings if you want email support\n\n";
