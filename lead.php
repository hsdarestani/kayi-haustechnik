<?php

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, max-age=0');

function respond($status, $success, $message) {
    http_response_code((int)$status);
    echo json_encode(array('success' => (bool)$success, 'message' => (string)$message), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, false, 'Nur POST-Anfragen sind erlaubt.');
}

$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength <= 0 || $contentLength > 25000) {
    respond(413, false, 'Die Anfrage ist zu groß oder leer.');
}

$host = strtolower(isset($_SERVER['HTTP_HOST']) ? (string)$_SERVER['HTTP_HOST'] : '');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? (string)$_SERVER['HTTP_ORIGIN'] : '';
$referer = isset($_SERVER['HTTP_REFERER']) ? (string)$_SERVER['HTTP_REFERER'] : '';
foreach (array($origin, $referer) as $source) {
    if ($source === '') continue;
    $sourceHost = strtolower((string)parse_url($source, PHP_URL_HOST));
    if ($sourceHost !== '' && $host !== '' && $sourceHost !== $host && $sourceHost !== 'www.' . $host && 'www.' . $sourceHost !== $host) {
        respond(403, false, 'Ungültige Herkunft der Anfrage.');
    }
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ? $raw : '', true);
if (!is_array($data)) {
    respond(400, false, 'Ungültige Formulardaten.');
}

if (!empty($data['website'])) {
    respond(200, true, 'Anfrage verarbeitet.');
}

$startedAt = isset($data['startedAt']) ? (int)$data['startedAt'] : 0;
$elapsed = (int)(microtime(true) * 1000) - $startedAt;
if ($startedAt <= 0 || $elapsed < 1500 || $elapsed > 86400000) {
    respond(400, false, 'Bitte öffnen Sie den Projektassistenten erneut.');
}

$ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : 'unknown';
$rateFile = sys_get_temp_dir() . '/kayi_lead_' . hash('sha256', $ip) . '.json';
$now = time();
$attempts = array();
if (is_file($rateFile)) {
    $stored = json_decode((string)@file_get_contents($rateFile), true);
    if (is_array($stored)) $attempts = $stored;
}
$attempts = array_values(array_filter($attempts, function ($timestamp) use ($now) {
    return is_int($timestamp) && $timestamp > $now - 600;
}));
if (count($attempts) >= 5) {
    respond(429, false, 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.');
}
$attempts[] = $now;
@file_put_contents($rateFile, json_encode($attempts), LOCK_EX);

function cleanText($value, $maxLength) {
    $text = trim((string)$value);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);
    if ($text === null) $text = '';
    return function_exists('mb_substr') ? mb_substr($text, 0, $maxLength, 'UTF-8') : substr($text, 0, $maxLength);
}

$service = cleanText(isset($data['service']) ? $data['service'] : '', 160);
$timing = cleanText(isset($data['timing']) ? $data['timing'] : '', 120);
$property = cleanText(isset($data['property']) ? $data['property'] : '', 120);
$postcode = cleanText(isset($data['postcode']) ? $data['postcode'] : '', 120);
$details = cleanText(isset($data['details']) ? $data['details'] : '', 2000);
$name = cleanText(isset($data['name']) ? $data['name'] : '', 120);
$phone = cleanText(isset($data['phone']) ? $data['phone'] : '', 60);
$email = cleanText(isset($data['email']) ? $data['email'] : '', 180);
$page = cleanText(isset($data['page']) ? $data['page'] : '', 300);

if ($service === '' || $timing === '' || $property === '' || $postcode === '' || $details === '' || $name === '') {
    respond(422, false, 'Bitte füllen Sie alle Pflichtfelder aus.');
}
if ($phone === '' && $email === '') {
    respond(422, false, 'Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse an.');
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, false, 'Die E-Mail-Adresse ist ungültig.');
}
if ($phone !== '' && !preg_match('/^[0-9+()\-\/ .]{6,60}$/', $phone)) {
    respond(422, false, 'Die Telefonnummer ist ungültig.');
}

$escape = function ($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
};
$submittedAt = (new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin')))->format('d.m.Y H:i:s');
$subjectText = 'Neue Website-Anfrage: ' . $service . ' – ' . $name;
$subject = function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader($subjectText, 'UTF-8') : $subjectText;

$rows = array(
    'Name' => $name,
    'Telefon' => $phone !== '' ? $phone : 'Nicht angegeben',
    'E-Mail' => $email !== '' ? $email : 'Nicht angegeben',
    'Projekt' => $service,
    'Gewünschter Zeitraum' => $timing,
    'Objektart' => $property,
    'PLZ / Ort' => $postcode,
    'Beschreibung' => nl2br($escape($details)),
    'Eingegangen am' => $submittedAt,
    'Quelle' => $page !== '' ? $page : 'kayi-haustechnik.de'
);

$tableRows = '';
foreach ($rows as $label => $value) {
    $safeValue = $label === 'Beschreibung' ? $value : $escape($value);
    $tableRows .= '<tr><td style="padding:10px 12px;border-bottom:1px solid #dfe8e6;color:#536970;font-weight:700;vertical-align:top;width:190px">' . $escape($label) . '</td><td style="padding:10px 12px;border-bottom:1px solid #dfe8e6;color:#071521">' . $safeValue . '</td></tr>';
}

$html = '<!doctype html><html lang="de"><body style="margin:0;background:#eef3f2;font-family:Arial,sans-serif;color:#071521">'
    . '<div style="max-width:720px;margin:24px auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #dfe8e6">'
    . '<div style="background:#071521;color:#fff;padding:24px 28px"><div style="color:#54dfd1;font-size:12px;letter-spacing:2px;font-weight:700">KAYI HAUSTECHNIK</div><h1 style="margin:8px 0 0;font-size:26px">Neue Projektanfrage</h1></div>'
    . '<div style="padding:18px 20px"><p style="margin:0 0 16px">Über den digitalen Projektassistenten wurde eine neue Anfrage übermittelt.</p><table style="width:100%;border-collapse:collapse">' . $tableRows . '</table>'
    . '<p style="margin:20px 0 0;color:#65777e;font-size:12px">Diese Nachricht wurde automatisch über kayi-haustechnik.de versendet.</p></div></div></body></html>';

$headers = array(
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: KAYI Website <info@kayi-haustechnik.de>',
    'Reply-To: ' . ($email !== '' ? $email : 'info@kayi-haustechnik.de'),
    'X-Mailer: KAYI Website Lead Form'
);

$sent = @mail('info@kayi-haustechnik.de', $subject, $html, implode("\r\n", $headers));
if (!$sent) {
    respond(500, false, 'Die E-Mail konnte momentan nicht versendet werden.');
}

respond(200, true, 'Ihre Anfrage wurde erfolgreich per E-Mail versendet.');
