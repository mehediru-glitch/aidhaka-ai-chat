<?php
require_once __DIR__ . '/includes/functions.php';

$_SESSION = [];
if (ini_get("session.use_cookies")) {
    setcookie(session_name(), '', time() - 3600, '/', '', true, true);
}
session_destroy();
redirect('/login.php');
