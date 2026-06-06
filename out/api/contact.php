<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const SMTP_HOST = 'mail.primecrestenterprise.com';
const SMTP_PORT = 587;
const SMTP_USER = 'info@primecrestenterprise.com';
const SMTP_PASS = 'Primecrest321!';
const SMTP_SECURE = 'false';
const SENDER_EMAIL = 'info@primecrestenterprise.com';
const CONTACT_RECIPIENT = 'info@primecrestenterprise.com';
const SUPPORT_PHONE = '+254 72 157 9821';

function respond($code, $payload) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function getContactsStoragePath() {
    return __DIR__ . '/contacts.json';
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

function appendContactToFile($messageData) {
    $path = getContactsStoragePath();
    $contacts = loadContactsFromFile();
    $contacts[] = $messageData;
    file_put_contents($path, json_encode($contacts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function smtpRecv($fp) {
    $response = '';
    while ($line = fgets($fp, 515)) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return $response;
}

function smtpCommand($fp, $command, $expectedCodes) {
    if ($command !== null) {
        fwrite($fp, $command . "\r\n");
    }

    $response = smtpRecv($fp);
    $code = intval(substr($response, 0, 3));

    return in_array($code, (array) $expectedCodes, true) ? $response : false;
}

function sendSmtpMail($to, $subject, $html, $from, $replyTo, &$error = null) {
    $error = null;
    $fp = fsockopen(SMTP_HOST, SMTP_PORT, $errno, $errstr, 30);
    if (!$fp) {
        $error = "SMTP connection failed: $errstr ($errno)";
        return false;
    }

    stream_set_timeout($fp, 30);

    if (!smtpCommand($fp, null, 220)) {
        $error = 'SMTP server did not respond correctly.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, 'EHLO ' . gethostname(), 250)) {
        $error = 'SMTP EHLO failed.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, 'STARTTLS', 220)) {
        $error = 'SMTP STARTTLS failed.';
        fclose($fp);
        return false;
    }

    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        $error = 'Unable to enable TLS on SMTP connection.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, 'EHLO ' . gethostname(), 250)) {
        $error = 'SMTP EHLO after STARTTLS failed.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, 'AUTH LOGIN', 334)) {
        $error = 'SMTP authentication handshake failed.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, base64_encode(SMTP_USER), 334)) {
        $error = 'SMTP username rejected.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, base64_encode(SMTP_PASS), 235)) {
        $error = 'SMTP password rejected.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, 'MAIL FROM:<' . $from . '>', 250)) {
        $error = 'MAIL FROM rejected by SMTP server.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, 'RCPT TO:<' . $to . '>', [250, 251])) {
        $error = 'RCPT TO rejected by SMTP server.';
        fclose($fp);
        return false;
    }

    if (!smtpCommand($fp, 'DATA', 354)) {
        $error = 'SMTP DATA command rejected.';
        fclose($fp);
        return false;
    }

    $headers = [];
    $headers[] = 'From: ' . $from;
    $headers[] = 'Reply-To: ' . $replyTo;
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-type: text/html; charset=utf-8';
    $headers[] = 'Subject: ' . $subject;
    $headers[] = 'To: ' . $to;
    $headers[] = 'Date: ' . date('r');
    $headers[] = 'X-Mailer: PHP/' . phpversion();

    $body = implode("\r\n", $headers) . "\r\n\r\n" . $html . "\r\n.";

    if (!smtpCommand($fp, $body, 250)) {
        $error = 'SMTP message body rejected.';
        fclose($fp);
        return false;
    }

    smtpCommand($fp, 'QUIT', 221);
    fclose($fp);
    return true;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(200, ['status' => 'ok', 'message' => 'Contact API is available. Use POST to submit the form.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Method not allowed.']);
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    respond(400, ['error' => 'Invalid request payload.']);
}

$name = trim($payload['name'] ?? '');
$email = trim($payload['email'] ?? '');
$phone = trim($payload['phone'] ?? '');
$service = trim($payload['service'] ?? '');
$message = trim($payload['message'] ?? '');

if ($name === '' || $email === '' || $message === '') {
    respond(400, ['error' => 'Name, email, and message are required.']);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(400, ['error' => 'Invalid email address.']);
}

$messageData = [
    'id' => time() . '-' . bin2hex(random_bytes(4)),
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'service' => $service,
    'message' => $message,
    'created_at' => date('Y-m-d H:i:s'),
];

appendContactToFile($messageData);

$subject = 'New message from ' . $name . ' via Primecrest website';
$htmlMessage = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>' .
    'body{margin:0;padding:0;background:#f4f6f8;color:#334155;font-family:Arial,Helvetica,sans-serif;}' .
    '.wrapper{width:100%;background:#f4f6f8;padding:40px 0;}' .
    '.container{max-width:720px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.12);}' .
    '.header{background:linear-gradient(135deg,#f97316,#fb923c);padding:32px 40px;color:#ffffff;text-align:center;}' .
    '.header h1{margin:0;font-size:28px;line-height:1.1;letter-spacing:0.01em;}' .
    '.header p{margin:14px 0 0;font-size:15px;opacity:0.88;}' .
    '.content{padding:32px 40px;}' .
    '.section{margin-bottom:28px;}' .
    '.section-title{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#f97316;margin-bottom:16px;}' .
    '.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:24px;margin-bottom:20px;}' .
    '.card strong{display:block;font-size:13px;color:#0f172a;margin-bottom:10px;}' .
    '.card span{display:block;font-size:16px;line-height:1.8;color:#334155;}' .
    '.message-box{background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:22px;line-height:1.8;color:#334155;white-space:pre-wrap;}' .
    '.footer{padding:28px 40px 36px;color:#64748b;font-size:13px;text-align:center;background:#f8fafc;}' .
    '.footer a{color:#f97316;text-decoration:none;}' .
    '</style></head><body><div class="wrapper"><div class="container"><div class="header"><h1>New Contact Request</h1><p>You have received a new inquiry from your website contact form.</p></div><div class="content">' .
    '<div class="section"><span class="section-title">Submission Details</span><div class="card"><strong>Name</strong><span>' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</span></div>' .
    '<div class="card"><strong>Email</strong><span>' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</span></div>' .
    ($phone !== '' ? '<div class="card"><strong>Phone</strong><span>' . htmlspecialchars($phone, ENT_QUOTES, 'UTF-8') . '</span></div>' : '') .
    ($service !== '' ? '<div class="card"><strong>Service</strong><span>' . htmlspecialchars($service, ENT_QUOTES, 'UTF-8') . '</span></div>' : '') .
    '</div>' .
    '<div class="section"><span class="section-title">Message</span><div class="message-box">' . nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8')) . '</div></div>' .
    '<div class="section"><span class="section-title">Summary</span><div class="card"><strong>Received</strong><span>' . date('F j, Y \a\t g:i A') . '</span></div></div>' .
    '</div><div class="footer">' .
    '<p>This message was generated automatically by the Primecrest Enterprise contact form.</p>' .
    '<p><a href="mailto:' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '">Reply to ' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</a></p>' .
    '</div></div></div></body></html>';

$sender = SENDER_EMAIL;
$replyTo = $email;

$adminSent = sendSmtpMail(CONTACT_RECIPIENT, $subject, $htmlMessage, $sender, $replyTo, $error);
if (!$adminSent) {
    // If SMTP fails, try the built-in mail() function as a fallback.
    $headers = [];
    $headers[] = 'From: ' . $sender;
    $headers[] = 'Reply-To: ' . $replyTo;
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-type: text/html; charset=utf-8';

    $adminSent = mail(CONTACT_RECIPIENT, $subject, $htmlMessage, implode("\r\n", $headers));
    if (!$adminSent) {
        respond(500, ['error' => 'Unable to send email from this server. SMTP error: ' . ($error ?: 'unknown')]);
    }
}

$confirmationSubject = 'We received your message — Primecrest Enterprise';
$confirmationHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>' .
    'body{margin:0;padding:0;background:#f4f6f8;color:#334155;font-family:Arial,Helvetica,sans-serif;}' .
    '.wrapper{width:100%;background:#f4f6f8;padding:40px 0;}' .
    '.container{max-width:720px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.12);}' .
    '.header{background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;color:#ffffff;text-align:center;}' .
    '.header h1{margin:0;font-size:28px;line-height:1.1;letter-spacing:0.01em;}' .
    '.header p{margin:14px 0 0;font-size:15px;opacity:0.88;}' .
    '.content{padding:32px 40px;}' .
    '.section{margin-bottom:28px;}' .
    '.section-title{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#fb923c;margin-bottom:16px;}' .
    '.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:24px;margin-bottom:20px;}' .
    '.card strong{display:block;font-size:13px;color:#0f172a;margin-bottom:10px;}' .
    '.card span{display:block;font-size:16px;line-height:1.8;color:#334155;}' .
    '.message-box{background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:22px;line-height:1.8;color:#334155;white-space:pre-wrap;}' .
    '.button{display:inline-flex;align-items:center;justify-content:center;padding:14px 26px;background:#fb923c;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;margin-top:12px;}' .
    '.footer{padding:28px 40px 36px;color:#64748b;font-size:13px;text-align:center;background:#f8fafc;}' .
    '.footer a{color:#0f172a;text-decoration:none;}' .
    '</style></head><body><div class="wrapper"><div class="container"><div class="header"><h1>Message Received</h1><p>Thanks for contacting Primecrest Enterprise. We have received your request and will respond shortly.</p></div><div class="content">' .
    '<div class="section"><span class="section-title">Your Submission</span><div class="card"><strong>Name</strong><span>' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</span></div>' .
    '<div class="card"><strong>Email</strong><span>' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</span></div>' .
    ($service !== '' ? '<div class="card"><strong>Service</strong><span>' . htmlspecialchars($service, ENT_QUOTES, 'UTF-8') . '</span></div>' : '') .
    '</div>' .
    '<div class="section"><span class="section-title">Message</span><div class="message-box">' . nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8')) . '</div></div>' .
    '<div class="section"><span class="section-title">What Happens Next</span><div class="card"><strong>Response Time</strong><span>Our team typically replies within 24-48 hours.</span></div>' .
    '<div class="card"><strong>Need faster support?</strong><span>Reply to this email or call our emergency line at ' . SUPPORT_PHONE . '.</span></div></div>' .
    '<div class="section"><a href="mailto:' . CONTACT_RECIPIENT . '" class="button">Contact Primecrest Support</a></div>' .
    '</div><div class="footer"><p>Primecrest Enterprise LTD</p><p>Professional Security & Technology Solutions</p></div></div></div></body></html>';

$confirmationSent = sendSmtpMail($email, $confirmationSubject, $confirmationHtml, $sender, CONTACT_RECIPIENT, $confirmationError);
if (!$confirmationSent) {
    $confirmationHeaders = [];
    $confirmationHeaders[] = 'From: ' . $sender;
    $confirmationHeaders[] = 'Reply-To: ' . CONTACT_RECIPIENT;
    $confirmationHeaders[] = 'MIME-Version: 1.0';
    $confirmationHeaders[] = 'Content-type: text/html; charset=utf-8';
    mail($email, $confirmationSubject, $confirmationHtml, implode("\r\n", $confirmationHeaders));
}

respond(200, ['success' => true, 'message' => 'Your message was sent successfully.']);
