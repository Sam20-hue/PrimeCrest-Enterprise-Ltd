<?php
/**
 * Primecrest Backend - PHP Configuration
 * Tru Host Deployment Ready
 */

// Start session for 2FA support
session_start();

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_USER', 'nzesuzlm_primecrest_enterprise');
define('DB_PASS', 'Samson20???');
define('DB_NAME', 'nzesuzlm_primecrest_enterprise');

// Email Configuration (cPanel/SMTP)
define('SMTP_HOST', 'mail.primecrestenterprise.com');
define('SMTP_PORT', 465);
define('SMTP_SECURE', true);
define('SMTP_USER', 'info@primecrestenterprise.com');
define('SMTP_PASS', 'Samson20???');
define('SENDER_EMAIL', 'info@primecrestenterprise.com');
define('ADMIN_EMAIL', 'info@primecrestenterprise.com');

// Application Configuration
define('NODE_ENV', 'production');
define('UPLOADS_DIR', __DIR__ . '/../uploads/');
define('PUBLIC_BASE_URL', 'https://primecrestenterprise.com'); // Update this with your actual domain

// Enable error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// Create logs directory if it doesn't exist
$logs_dir = __DIR__ . '/../logs/';
if (!is_dir($logs_dir)) {
    mkdir($logs_dir, 0755, true);
}

// Create uploads directory if it doesn't exist
if (!is_dir(UPLOADS_DIR)) {
    mkdir(UPLOADS_DIR, 0755, true);
}

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Database Connection Class
 */
class Database {
    private static $connection = null;

    public static function connect() {
        if (self::$connection === null) {
            try {
                self::$connection = new mysqli(
                    DB_HOST,
                    DB_USER,
                    DB_PASS,
                    DB_NAME,
                    DB_PORT
                );

                if (self::$connection->connect_error) {
                    throw new Exception('Connection failed: ' . self::$connection->connect_error);
                }

                self::$connection->set_charset('utf8mb4');
                self::ensureTables();
            } catch (Exception $e) {
                error_log($e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed']);
                exit;
            }
        }
        return self::$connection;
    }

    private static function ensureTables() {
        $conn = self::$connection;

        // Settings table
        $conn->query('CREATE TABLE IF NOT EXISTS settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            siteName VARCHAR(255),
            logo VARCHAR(500),
            phone VARCHAR(100),
            email VARCHAR(255),
            address TEXT,
            footerText TEXT,
            aboutText TEXT,
            heroTitle VARCHAR(255),
            heroSubtitle VARCHAR(255),
            heroImage VARCHAR(500),
            adminEmail VARCHAR(255),
            adminPassword VARCHAR(255),
            admin2faSecret VARCHAR(255),
            admin2faEnabled TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        // Add missing columns if they don't exist
        $conn->query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS adminEmail VARCHAR(255)');
        $conn->query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS adminPassword VARCHAR(255)');
        $conn->query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin2faSecret VARCHAR(255)');
        $conn->query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin2faEnabled TINYINT(1) DEFAULT 0');
        $conn->query('CREATE TABLE IF NOT EXISTS services (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            description TEXT,
            icon VARCHAR(255),
            price VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        // Gallery table
        $conn->query('CREATE TABLE IF NOT EXISTS gallery (
            id INT AUTO_INCREMENT PRIMARY KEY,
            imageUrl VARCHAR(500),
            title VARCHAR(255),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        // Blog table
        $conn->query('CREATE TABLE IF NOT EXISTS blog (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255),
            excerpt TEXT,
            content TEXT,
            category VARCHAR(255),
            imageUrl VARCHAR(500),
            author VARCHAR(255),
            authorId VARCHAR(255),
            published TINYINT(1) DEFAULT 0,
            date DATE,
            published_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        // Contacts table
        $conn->query('CREATE TABLE IF NOT EXISTS contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(100),
            service VARCHAR(255),
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        // Authors table
        $conn->query('CREATE TABLE IF NOT EXISTS authors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            imageUrl VARCHAR(500),
            bio TEXT,
            subtitle VARCHAR(255),
            joinDate VARCHAR(100),
            lastActive VARCHAR(100),
            linkedIn VARCHAR(500),
            upwork VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        // Subscribers table
        $conn->query('CREATE TABLE IF NOT EXISTS subscribers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        // Team table
        $conn->query('CREATE TABLE IF NOT EXISTS team (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            role VARCHAR(255),
            imageUrl VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        // Testimonials table
        $conn->query('CREATE TABLE IF NOT EXISTS testimonials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            text TEXT,
            author VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    }

    public static function query($sql, $params = []) {
        $conn = self::connect();
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Query error: ' . $conn->error);
        }
        if ($params) {
            $types = '';
            foreach ($params as $param) {
                if (is_int($param)) $types .= 'i';
                elseif (is_float($param)) $types .= 'd';
                else $types .= 's';
            }
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        return $stmt;
    }

    public static function fetch($stmt) {
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public static function fetchAll($stmt) {
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }
}

/**
 * Helper Functions
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function errorResponse($message, $statusCode = 400) {
    jsonResponse(['error' => $message], $statusCode);
}

function successResponse($data = [], $message = 'Success') {
    jsonResponse(array_merge(['success' => true, 'message' => $message], $data), 200);
}

function getRoute() {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = str_replace('/api/', '', $path);
    $path = trim($path, '/');
    return $path;
}

function getMethod() {
    return strtoupper($_SERVER['REQUEST_METHOD']);
}

function getInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Generate a TOTP secret (base32 encoded random string)
 */
function secureRandomInt($min, $max) {
    if (function_exists('random_int')) {
        return random_int($min, $max);
    }
    if (function_exists('openssl_random_pseudo_bytes')) {
        $range = $max - $min;
        if ($range <= 0) {
            return $min;
        }
        $bytes = openssl_random_pseudo_bytes(4);
        $value = unpack('N', $bytes)[1];
        return $min + ($value % ($range + 1));
    }
    return mt_rand($min, $max);
}

function generateTotpSecret() {
    // Base32 alphabet
    $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = '';
    
    // Generate 16 random characters
    for ($i = 0; $i < 16; $i++) {
        $secret .= $base32Chars[secureRandomInt(0, 31)];
    }
    
    return $secret;
}

/**
 * Decode base32 string to binary
 */
function base32Decode($input) {
    $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $output = '';
    $v = 0;
    $vbits = 0;
    
    $input = strtoupper($input);
    
    for ($i = 0; $i < strlen($input); $i++) {
        $digit = strpos($base32Chars, $input[$i]);
        if ($digit === false) {
            throw new Exception('Invalid character in base32 string');
        }
        
        $v = ($v << 5) | $digit;
        $vbits += 5;
        
        if ($vbits >= 8) {
            $vbits -= 8;
            $output .= chr(($v >> $vbits) & 0xFF);
            $v &= (1 << $vbits) - 1;
        }
    }
    
    return $output;
}

/**
 * Calculate TOTP value for a given secret and time
 */
function calculateTotp($secret, $time = null) {
    if ($time === null) {
        $time = floor(time() / 30);
    } else {
        $time = floor($time / 30);
    }
    
    try {
        $secretBinary = base32Decode($secret);
    } catch (Exception $e) {
        return null;
    }
    
    // Create time counter in big-endian format
    $timeCounter = '';
    for ($i = 7; $i >= 0; $i--) {
        $timeCounter .= chr(($time >> ($i * 8)) & 0xFF);
    }
    
    // Calculate HMAC-SHA1
    $hmac = hash_hmac('SHA1', $timeCounter, $secretBinary, true);
    
    // Get the last byte as offset
    $offset = ord($hmac[strlen($hmac) - 1]) & 0x0F;
    
    // Extract 4 bytes from HMAC at offset
    $code = ((ord($hmac[$offset]) & 0x7F) << 24) |
            ((ord($hmac[$offset + 1]) & 0xFF) << 16) |
            ((ord($hmac[$offset + 2]) & 0xFF) << 8) |
            (ord($hmac[$offset + 3]) & 0xFF);
    
    // Get 6-digit code
    return str_pad($code % 1000000, 6, '0', STR_PAD_LEFT);
}

/**
 * Verify TOTP token (with time window tolerance)
 */
function verifyTotpToken($secret, $token, $timeWindow = 1) {
    $currentTime = floor(time() / 30);
    
    // Check current and adjacent time windows
    for ($i = -$timeWindow; $i <= $timeWindow; $i++) {
        $expectedToken = calculateTotp($secret, ($currentTime + $i) * 30);
        if ($expectedToken === $token) {
            return true;
        }
    }
    
    return false;
}
