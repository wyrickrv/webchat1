<?php
require_once 'get_config.php';
session_start();

header('Content-Type: application/json');

$sessionTimeout = $config['session']['timeout'];  // Load session timeout from config

if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] < $sessionTimeout)) {
    $timeLeft = $sessionTimeout - (time() - $_SESSION['LAST_ACTIVITY']);
    echo json_encode(['session_active' => true, 'remaining_time' => $timeLeft]);
} else {
    echo json_encode(['session_active' => false]);
}

