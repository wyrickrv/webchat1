<?php
header('Content-Type: application/json');

// Enable error reporting for debugging (disable in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    require_once 'lib.required.php';
    require_once 'db.php';

    if (!isset($_SESSION['user_data']['userid'])) {
        throw new Exception("User not authenticated.");
    }
    $user = $_SESSION['user_data']['userid'];

    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    if ($search !== '') {
        $_SESSION['search_term'] = $search; // Update session with new search term
    } else {
        unset($_SESSION['search_term']); // Clear search term from session
    }

    // Use the session search term if no search string is passed
    if ($search === '' && isset($_SESSION['search_term'])) {
        $search = $_SESSION['search_term'];
    }

    $chats = get_all_chats($user, $search);

    echo json_encode($chats);
} catch (Exception $e) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => $e->getMessage()]);
}
?>

