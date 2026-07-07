<?php
/**
 * Database Configuration & Connection
 * Shared hosting connection to Truhost MySQL database
 */

function loadDotEnv(string $path): void {
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $equalsPos = strpos($line, '=');
        if ($equalsPos === false) {
            continue;
        }

        $name = trim(substr($line, 0, $equalsPos));
        $value = trim(substr($line, $equalsPos + 1), "\"' ");
        if ($name === '') {
            continue;
        }

        putenv("$name=$value");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

loadDotEnv(__DIR__ . '/.env');
loadDotEnv(__DIR__ . '/../.env');
loadDotEnv(__DIR__ . '/../../.env');

$db_host = getenv('DB_HOST') ?: getenv('MYSQL_HOST') ?: 'localhost';
$db_user = getenv('DB_USER') ?: getenv('MYSQL_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: getenv('MYSQL_PASSWORD') ?: '';
$db_name = getenv('DB_NAME') ?: getenv('MYSQL_DATABASE') ?: getenv('MYSQL_DB') ?: 'primecrest_enterprise';
$db_port = getenv('DB_PORT') ?: getenv('MYSQL_PORT') ?: 3306;
$db_charset = getenv('DB_CHARSET') ?: 'utf8mb4';

mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name, (int)$db_port);
// If DB connection fails, switch to a file-based fallback so the API
// remains usable (contacts, settings, gallery) even when MySQL is down.
$useFileFallback = false;
if ($conn === false || $conn->connect_error) {
    error_log('DB connection failed: ' . ($conn?->connect_error ?? 'unknown'));
    // Do not exit; enable file fallback mode.
    $useFileFallback = true;
    $conn = null;
} else {
    $conn->set_charset($db_charset);
}

function safeQuery(?mysqli $conn, string $query, array $params = [], string $types = '') {
    global $useFileFallback;
    try {
        if (empty($useFileFallback) && $conn instanceof mysqli) {
            if (empty($params)) {
                $result = $conn->query($query);
                if ($result === false) {
                    throw new Exception($conn->error);
                }
                return $result;
            }

            $stmt = $conn->prepare($query);
            if ($stmt === false) {
                throw new Exception($conn->error);
            }

            if ($types !== '') {
                $stmt->bind_param($types, ...$params);
            }

            if (!$stmt->execute()) {
                throw new Exception($stmt->error);
            }

            $result = $stmt->get_result();
            return $result !== false ? $result : $stmt;
        }

        // File-based fallback (basic support for common tables)
        $dbDir = __DIR__;
        $tablesDir = $dbDir . '/data';
        if (!is_dir($tablesDir)) {
            mkdir($tablesDir, 0755, true);
        }

        $queryUpper = strtoupper(trim($query));
        // Handle simple SELECT * FROM <table>
        if (str_starts_with($queryUpper, 'SELECT')) {
            if (preg_match('/FROM\s+`?(\w+)`?/i', $query, $m)) {
                $table = $m[1];
                $file = $tablesDir . '/' . $table . '.json';
                if (!is_file($file)) return [];
                $json = file_get_contents($file);
                return json_decode($json, true) ?: [];
            }
            return [];
        }

        // Handle simple INSERT INTO <table> (...) VALUES (...) by appending to JSON
        if (str_starts_with($queryUpper, 'INSERT')) {
            if (preg_match('/INTO\s+`?(\w+)`?/i', $query, $m)) {
                $table = $m[1];
                $file = $tablesDir . '/' . $table . '.json';
                $rows = is_file($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
                // Build an object from params if provided, else try to parse columns from query
                $record = [];
                if (!empty($params)) {
                    // Attempt to guess columns from query
                    if (preg_match('/\(([^)]+)\)\s*VALUES/i', $query, $colsMatch)) {
                        $cols = array_map(fn($c) => trim(trim($c), '`"\' ), explode(',', $colsMatch[1]));
                        foreach ($cols as $i => $col) {
                            $record[$col] = $params[$i] ?? null;
                        }
                    } else {
                        // Generic param mapping
                        foreach ($params as $i => $p) $record['col' . $i] = $p;
                    }
                }
                // Assign an id
                $maxId = 0; foreach ($rows as $r) { if (isset($r['id']) && is_numeric($r['id']) && $r['id'] > $maxId) $maxId = (int)$r['id']; }
                $record['id'] = $maxId + 1;
                $record['created_at'] = date('Y-m-d H:i:s');
                $rows[] = $record;
                file_put_contents($file, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                return (object)['insert_id' => $record['id']];
            }
        }

        // For UPDATE/DELETE, perform simple operations if possible
        if (str_starts_with($queryUpper, 'UPDATE') || str_starts_with($queryUpper, 'DELETE')) {
            if (preg_match('/(UPDATE|DELETE)\s+`?(\w+)`?/i', $query, $m)) {
                $table = $m[2];
                $file = $tablesDir . '/' . $table . '.json';
                $rows = is_file($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
                // Very basic handling: if ID present in params or WHERE id = ?, remove/update that id
                $id = null;
                if (!empty($params)) {
                    foreach ($params as $p) {
                        if (is_numeric($p)) { $id = (int)$p; break; }
                    }
                }
                if ($id === null) {
                    // fallback: rewrite file unchanged
                    file_put_contents($file, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                    return true;
                }
                $newRows = [];
                $updated = false;
                foreach ($rows as $r) {
                    if (isset($r['id']) && (int)$r['id'] === $id) {
                        if (str_starts_with($queryUpper, 'DELETE')) {
                            $updated = true; continue; // skip (delete)
                        }
                        // For update: merge provided params (best-effort)
                        // Not attempting to parse SET clause here; leave as-is
                        $updated = true;
                        $newRows[] = $r;
                    } else {
                        $newRows[] = $r;
                    }
                }
                file_put_contents($file, json_encode($newRows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                return true;
            }
        }

        return true;
    } catch (Exception $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Database query error: ' . $e->getMessage()]));
    }
}

function fetch_all_assoc(?mysqli $conn, string $query, array $params = [], string $types = ''): array {
    $result = safeQuery($conn, $query, $params, $types);
    if (is_array($result)) {
        return $result;
    }
    $rows = [];

    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        return $rows;
    }

    if ($result instanceof mysqli_stmt) {
        $meta = $result->result_metadata();
        if ($meta === false) {
            return [];
        }

        $fields = [];
        $row = [];
        $bindParams = [];
        while ($field = $meta->fetch_field()) {
            $fields[] = $field->name;
            $row[$field->name] = null;
            $bindParams[] = &$row[$field->name];
        }
        $result->bind_result(...$bindParams);

        while ($result->fetch()) {
            $rows[] = array_map(fn($value) => $value, $row);
        }
        return $rows;
    }

    return [];
}

function fetch_one(?mysqli $conn, string $query, array $params = [], string $types = ''): ?array {
    $result = safeQuery($conn, $query, $params, $types);
    if (is_array($result)) {
        return $result[0] ?? null;
    }

    if ($result instanceof mysqli_result) {
        return $result->fetch_assoc() ?: null;
    }

    if ($result instanceof mysqli_stmt) {
        $meta = $result->result_metadata();
        if ($meta === false) {
            return null;
        }

        $fields = [];
        $row = [];
        $bindParams = [];
        while ($field = $meta->fetch_field()) {
            $fields[] = $field->name;
            $row[$field->name] = null;
            $bindParams[] = &$row[$field->name];
        }
        $result->bind_result(...$bindParams);

        if ($result->fetch()) {
            return array_map(fn($value) => $value, $row);
        }
        return null;
    }

    return null;
}

function addColumnIfMissing(?mysqli $conn, string $table, string $columnSql): bool {
    $parts = preg_split('/\s+/', trim($columnSql));
    $columnName = $parts[0] ?? '';
    if ($columnName === '') {
        return false;
    }

    // If no DB connection, assume columns are handled by file fallback
    if ($conn === null) return true;

    $stmt = $conn->prepare('SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    if ($stmt === false) {
        return false;
    }

    $stmt->bind_param('ss', $table, $columnName);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    if (intval($result['c'] ?? 0) > 0) {
        return true;
    }

    return $conn->query("ALTER TABLE `$table` ADD COLUMN $columnSql") !== false;
}

function ensureSchema(?mysqli $conn): void {
    // If DB connection is not available, create file-based data store
    if ($conn === null) {
        $dataDir = __DIR__ . '/data';
        if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);
        $defaults = [
            'settings' => [],
            'services' => [],
            'gallery' => [],
            'blog' => [],
            'products' => [],
            'testimonials' => [],
            'team' => [],
            'authors' => [],
            'contacts' => [],
            'subscribers' => [],
        ];
        foreach ($defaults as $name => $val) {
            $file = $dataDir . '/' . $name . '.json';
            if (!is_file($file)) file_put_contents($file, json_encode($val, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        return;
    }

    $conn->query("CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        siteName VARCHAR(255) DEFAULT NULL,
        logo VARCHAR(500) DEFAULT NULL,
        logoUrl VARCHAR(500) DEFAULT NULL,
        logoWidth INT DEFAULT 0,
        logoHeight INT DEFAULT 0,
        logoAltText VARCHAR(255) DEFAULT NULL,
        logoDisplayMode VARCHAR(20) DEFAULT NULL,
        logoContrast INT DEFAULT 0,
        logoSharpness INT DEFAULT 0,
        logoBorderRadius INT DEFAULT 0,
        companyName VARCHAR(255) DEFAULT NULL,
        tagline VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(100) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        address TEXT DEFAULT NULL,
        aboutText TEXT DEFAULT NULL,
        briefExplanation TEXT DEFAULT NULL,
        privacyPolicy TEXT DEFAULT NULL,
        termsOfService TEXT DEFAULT NULL,
        adminPassword VARCHAR(255) DEFAULT NULL,
        adminEmail VARCHAR(255) DEFAULT NULL,
        heroTitle VARCHAR(255) DEFAULT NULL,
        heroSubtitle VARCHAR(255) DEFAULT NULL,
        heroImage VARCHAR(500) DEFAULT NULL,
        footerText VARCHAR(255) DEFAULT NULL,
        mysqlApiUrl VARCHAR(500) DEFAULT NULL,
        admin2faSecret VARCHAR(255) DEFAULT NULL,
        admin2faEnabled TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) DEFAULT NULL,
        subtitle VARCHAR(255) DEFAULT NULL,
        icon VARCHAR(100) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        imageUrl VARCHAR(1000) DEFAULT NULL,
        images LONGTEXT DEFAULT NULL,
        imagesCaptions LONGTEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS gallery (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) DEFAULT NULL,
        category VARCHAR(255) DEFAULT NULL,
        imageUrl VARCHAR(1000) DEFAULT NULL,
        images LONGTEXT DEFAULT NULL,
        imagesCaptions LONGTEXT DEFAULT NULL,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS blog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) DEFAULT NULL,
        excerpt TEXT DEFAULT NULL,
        content LONGTEXT DEFAULT NULL,
        category VARCHAR(255) DEFAULT NULL,
        imageUrl VARCHAR(1000) DEFAULT NULL,
        images LONGTEXT DEFAULT NULL,
        imagesCaptions LONGTEXT DEFAULT NULL,
        author VARCHAR(255) DEFAULT NULL,
        authorId VARCHAR(255) DEFAULT NULL,
        published TINYINT(1) DEFAULT 0,
        published_at DATETIME DEFAULT NULL,
        date VARCHAR(100) DEFAULT NULL,
        newsletterSent TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        price DECIMAL(12,2) DEFAULT NULL,
        image VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) DEFAULT NULL,
        role VARCHAR(255) DEFAULT NULL,
        photo VARCHAR(500) DEFAULT NULL,
        quote TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS team (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) DEFAULT NULL,
        role VARCHAR(255) DEFAULT NULL,
        imageUrl VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS authors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) DEFAULT NULL,
        imageUrl VARCHAR(500) DEFAULT NULL,
        bio TEXT DEFAULT NULL,
        subtitle VARCHAR(255) DEFAULT NULL,
        joinDate VARCHAR(100) DEFAULT NULL,
        lastActive VARCHAR(100) DEFAULT NULL,
        linkedIn VARCHAR(255) DEFAULT NULL,
        upwork VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(100) DEFAULT NULL,
        service VARCHAR(255) DEFAULT NULL,
        message TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    foreach ([
        ['services', 'imageUrl VARCHAR(1000) DEFAULT NULL'],
        ['services', 'images LONGTEXT DEFAULT NULL'],
        ['services', 'imagesCaptions LONGTEXT DEFAULT NULL'],
        ['services', 'subtitle VARCHAR(255) DEFAULT NULL'],
        ['services', 'icon VARCHAR(100) DEFAULT NULL'],
        ['services', 'description TEXT DEFAULT NULL'],
        ['services', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
        ['gallery', 'imageUrl VARCHAR(1000) DEFAULT NULL'],
        ['gallery', 'images LONGTEXT DEFAULT NULL'],
        ['gallery', 'imagesCaptions LONGTEXT DEFAULT NULL'],
        ['gallery', 'description TEXT DEFAULT NULL'],
        ['gallery', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
        ['blog', 'imageUrl VARCHAR(1000) DEFAULT NULL'],
        ['blog', 'images LONGTEXT DEFAULT NULL'],
        ['blog', 'imagesCaptions LONGTEXT DEFAULT NULL'],
        ['blog', 'author VARCHAR(255) DEFAULT NULL'],
        ['blog', 'authorId VARCHAR(255) DEFAULT NULL'],
        ['blog', 'published TINYINT(1) DEFAULT 0'],
        ['blog', 'published_at DATETIME DEFAULT NULL'],
        ['blog', 'date VARCHAR(100) DEFAULT NULL'],
        ['blog', 'newsletterSent TINYINT(1) DEFAULT 0'],
        ['blog', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
        ['testimonials', 'name VARCHAR(255) DEFAULT NULL'],
        ['testimonials', 'role VARCHAR(255) DEFAULT NULL'],
        ['testimonials', 'photo VARCHAR(500) DEFAULT NULL'],
        ['testimonials', 'quote TEXT DEFAULT NULL'],
        ['team', 'imageUrl VARCHAR(500) DEFAULT NULL'],
        ['authors', 'imageUrl VARCHAR(500) DEFAULT NULL'],
        ['authors', 'bio TEXT DEFAULT NULL'],
        ['authors', 'subtitle VARCHAR(255) DEFAULT NULL'],
        ['authors', 'joinDate VARCHAR(100) DEFAULT NULL'],
        ['authors', 'lastActive VARCHAR(100) DEFAULT NULL'],
        ['authors', 'linkedIn VARCHAR(255) DEFAULT NULL'],
        ['authors', 'upwork VARCHAR(255) DEFAULT NULL'],
    ] as [$table, $columnSql]) {
        addColumnIfMissing($conn, $table, $columnSql);
    }
}

ensureSchema($conn);

