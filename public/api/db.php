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
if ($conn === false || $conn->connect_error) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed: ' . ($conn?->connect_error ?? 'unknown error'),
        'db_host' => $db_host,
        'db_user' => $db_user,
        'db_name' => $db_name,
    ]);
    exit;
}

$conn->set_charset($db_charset);

function safeQuery(mysqli $conn, string $query, array $params = [], string $types = '') {
    try {
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
    } catch (Exception $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Database query error: ' . $e->getMessage()]));
    }
}

function fetch_all_assoc(mysqli $conn, string $query, array $params = [], string $types = ''): array {
    $result = safeQuery($conn, $query, $params, $types);
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

function fetch_one(mysqli $conn, string $query, array $params = [], string $types = ''): ?array {
    $result = safeQuery($conn, $query, $params, $types);

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

function addColumnIfMissing(mysqli $conn, string $table, string $columnSql): bool {
    $parts = preg_split('/\s+/', trim($columnSql));
    $columnName = $parts[0] ?? '';
    if ($columnName === '') {
        return false;
    }

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

function ensureSchema(mysqli $conn): void {
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
        footerText TEXT DEFAULT NULL,
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

