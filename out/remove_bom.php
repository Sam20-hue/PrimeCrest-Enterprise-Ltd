<?php
// remove_bom.php
// Upload this to your site's DocumentRoot (public_html) and run it once via browser
// It will scan the ./api folder for PHP files and remove any leading UTF-8 BOM bytes.

$root = __DIR__;
$apiDir = $root . DIRECTORY_SEPARATOR . 'api';
if (!is_dir($apiDir)) {
    echo "api directory not found at: $apiDir";
    exit;
}

$iter = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($apiDir));
$changed = [];
foreach ($iter as $file) {
    if (!$file->isFile()) continue;
    $path = $file->getPathname();
    if (strtolower(pathinfo($path, PATHINFO_EXTENSION)) !== 'php') continue;
    $contents = file_get_contents($path);
    if ($contents === false) continue;
    // Remove any number of leading BOM sequences (0xEF 0xBB 0xBF)
    $fixed = preg_replace('/^(?:\xEF\xBB\xBF)+/','', $contents);
    if ($fixed !== $contents) {
        // backup
        @copy($path, $path . '.bak');
        file_put_contents($path, $fixed);
        $changed[] = $path;
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['scanned' => $apiDir, 'changed' => $changed], JSON_PRETTY_PRINT);
