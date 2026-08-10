<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://aidhaka.aiammu.com');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = $_GET['path'] ?? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$targetUrl = 'https://aidhaka-ai-chat.onrender.com/api/' . ltrim($path, '/');

if ($_SERVER['QUERY_STRING']) {
    $targetUrl .= '?' . $_SERVER['QUERY_STRING'];
}

$ch = curl_init($targetUrl);

$method = $_SERVER['REQUEST_METHOD'];
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

$headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) !== 'host') {
        $headers[] = "$key: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if ($method === 'POST' || $method === 'PUT') {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

http_response_code($httpCode);
if ($contentType) {
    header("Content-Type: $contentType");
}
echo $response;
