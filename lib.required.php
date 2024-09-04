<?php

ini_set('session.cookie_lifetime', 0); // Expires when browser is closed

// lib.required.php
require_once 'db.php';

// Determine the environment dynamically
require_once 'get_config.php';
#echo '<pre>'.print_r($config,1).'</pre>';


// Start the session, if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Handle the splash screen
if (empty($_SESSION['splash'])) $_SESSION['splash'] = '';

if ( (!empty($_SESSION['user_data']['userid']) && $_SESSION['authorized'] !== true) || empty($_SESSION['splash']) ) {
    require_once 'splash.php';
    exit;
}

// Start the PHP session to enable session variables
$sessionTimeout = $config['session']['timeout'];  // Load session timeout from config

if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $sessionTimeout)) {
    // last request was more than 30 minutes ago
    logout();
}
$_SESSION['LAST_ACTIVITY'] = time(); // update last activity time stamp

#logout();
#echo '<pre>'.print_r($_SESSION,1).'</pre>'; #die();

if (empty($_SESSION['user_data'])) $_SESSION['user_data'] = [];

$user = $_SESSION['user_data']['userid'];

$application_path = $config['app']['application_path'];

// Verify that there is a chat with this id for this user
// If a 'chat_id' parameter was passed, store its value as an integer in the session variable 'chat_id'
$chat_id = filter_input(INPUT_GET, 'chat_id', FILTER_SANITIZE_STRING);
if (!verify_user_chat($user, $chat_id)){
    echo " -- " . $user . "<br>\n";
    die("Error: there is no chat record for the specified user and chat id. If you need assistance, please contact ".$email_help);
}

$models_str = $config['azure']['deployments'];
$models_a = explode(",",$models_str);

$models = array();
foreach($models_a as $m) {
    $a = explode(":",$m);
    $models[$a[0]] = array('label'=>$a[1])+$config[$a[0]];
}

$temperatures = [];
$i=0;
# due to the way PHP evaluates floating-point numbers
# the loop will exit before reaching exactly 2.0 
while ($i<2.1) {
    $temperatures[] = round($i,1);
    $i += 0.1;

}

if (empty($_GET['chat_id'])) $_GET['chat_id'] = '';
// Check if the form has been submitted and set the session variable
if (isset($_POST['model']) && array_key_exists($_POST['model'], $models)) {
    $deployment = $_SESSION['deployment'] = $_POST['model'];
    if (!empty($_GET['chat_id'])) update_deployment($user, $chat_id, $deployment);
}

$all_chats = get_all_chats($user);
if (!empty($chat_id) && !empty($all_chats[$chat_id])) {
    $deployment = $_SESSION['deployment'] = $all_chats[$chat_id]['deployment'];  // This is the currently active chat
        $_SESSION['deployment'] = $all_chats[$chat_id]['deployment'];
        $_SESSION['temperature'] = $all_chats[$chat_id]['temperature'];
        $_SESSION['document_name'] = $all_chats[$chat_id]['document_name'];
        $_SESSION['document_text'] = $all_chats[$chat_id]['document_text'];
}

if (empty($_SESSION['deployment'])) {
    $deployment = $_SESSION['deployment'] = $config['azure']['default'];

} else {
    $deployment = $_SESSION['deployment'];
}

#echo "THIS IS THE DEPLOYMENT: {$deployment}\n";

// Check if the temperature form has been submitted and set the session variable
if (isset($_POST['temperature'])) {
    $_SESSION['temperature'] = (float)$_POST['temperature'];
    $temperature = $_SESSION['temperature'] = $_POST['temperature'];
    if (!empty($_GET['chat_id'])) update_temperature($user, $chat_id, $temperature);
}
if (!isset($_SESSION['temperature']) || (float)$_SESSION['temperature'] < 0 || (float)$_SESSION['temperature'] > 2) {
    $_SESSION['temperature'] = 0.7;

}

// confirm their authentication, redirect if false
if (isAuthenticated()) {
    session_regenerate_id(true);


} else {
    header('Location: auth_redirect.php');

    /*
    $clientId = $config['openid']['clientId'];
    $callback = $config['openid']['callback'];

    $scope = 'openid profile';  // Asking for identity and profile information
    $state = bin2hex(random_bytes(16));  // Generate a random state
    $_SESSION['oauth2state'] = $state;  // Store state in session for later validation

    $authorizationUrlBase = $config['openid']['authorization_url_base'];
    $authorizationUrl = $authorizationUrlBase . '?' . http_build_query([
        'client_id' => $clientId,
        'redirect_uri' => $callback,
        'response_type' => 'code',
        'scope' => $scope,
        'state' => $state
    ]);

    header('Location: ' . $authorizationUrl);
    */
    exit;
}

#echo "<pre>". print_r($_SESSION,1) ."</pre>";
#echo "<pre>". print_r($_SERVER,1) ."</pre>";

// This function will check if the user is authenticated
function isAuthenticated() {
    return isset($_SESSION['tokens']) && isset($_SESSION['tokens']['access_token']);
}

// Log the user out
function logout() {

    // start the session if not already started
    #session_start();

    // Unset all session variables
    $_SESSION = array();

    // If it's desired to kill the session, also delete the session cookie.
    // Note: This will destroy the session, and not just the session data!
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    // Finally, destroy the session.
    session_destroy();

}

function get_path() {
    $path = strstr($_SERVER['PHP_SELF'],'chatdev') ? 'chatdev' : 'chat';
    return $path;
}

// Get the recent messages from the database for the current chat session
function get_recent_messages($chat_id, $user) {
    if (!empty($chat_id)) {
        return get_all_exchanges($chat_id, $user);
    }
    return [];
}







// Load configuration
function load_configuration($deployment) {
    global $config;
    return [
        'api_key' => trim($config[$deployment]['api_key'], '"'),
        'host' => $config[$deployment]['host'],
        'base_url' => $config[$deployment]['url'],
        'deployment_name' => $config[$deployment]['deployment_name'],
        'api_version' => $config[$deployment]['api_version'],
        'max_tokens' => (int)$config[$deployment]['max_tokens'],
        'context_limit' => (int)($config[$deployment]['context_limit']*1.5),
    ];
}

// Execute API Call
function execute_api_call($url, $payload, $headers) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        error_log('Curl error: ' . curl_error($ch));
    }

    curl_close($ch);
    return $response;
}

// Process API Response
function process_api_response($response, $deployment, $chat_id, $message) {
    $response_data = json_decode($response, true);
    if (isset($response_data['error'])) {
        error_log('API error: ' . $response_data['error']['message']);
        return [
            'deployment' => $deployment,
            'error' => true,
            'message' => $response_data['error']['message']
        ];
    } else {
        $response_text = $response_data['response'] ?? $response_data['choices'][0]['message']['content'];
        create_exchange($chat_id, $message, $response_text);
        return [
            'deployment' => $deployment,
            'error' => false,
            'message' => $response_text
        ];
    }
}

// Call Mocha API
function call_mocha_api($base_url, $msg) {
    #$payload = $msg;
    $payload = [
        'messages' => $msg,
        "max_tokens" => $config['max_tokens'],
        "temperature" => (float)$_SESSION['temperature'],
        "frequency_penalty" => 0,
        "presence_penalty" => 0,
        "top_p" => 0.95,
        "stop" => ""
    ];
    $headers = ['Content-Type: application/json'];
    $response = execute_api_call($base_url, $payload, $headers);
    return $response;
}

// Call Azure OpenAI API
function call_azure_api($config, $msg) {
    $url = $config['base_url'] . "/openai/deployments/" . $config['deployment_name'] . "/chat/completions?api-version=".$config['api_version'];
    $payload = [
        'messages' => $msg,
        "max_tokens" => $config['max_tokens'],
        "temperature" => (float)$_SESSION['temperature'],
        "frequency_penalty" => 0,
        "presence_penalty" => 0,
        "top_p" => 0.95,
        "stop" => ""
    ];
    $headers = [
        'Content-Type: application/json',
        'api-key: ' . $config['api_key']
    ];
    $response = execute_api_call($url, $payload, $headers);
    return $response;
}

function get_gpt_response($message, $chat_id, $user) {
    $config = load_configuration($GLOBALS['deployment']);
    $msg = get_chat_thread($message, $chat_id, $user);

    if ($config['host'] == "Mocha") {
        $response = call_mocha_api($config['base_url'], $msg);
    } else {
        $response = call_azure_api($config, $msg);
    }

    return process_api_response($response, $GLOBALS['deployment'], $chat_id, $message);
}

function substringWords($text, $numWords) {
    // Split the text into words
    $words = explode(' ', $text);
    
    // Select a subset of words based on the specified number
    $selectedWords = array_slice($words, 0, $numWords);
    
    // Join the selected words back together into a string
    $subString = implode(' ', $selectedWords);
    
    return $subString;
}

function get_chat_thread($message, $chat_id, $user)
{
    global $config,$deployment;

    $context_limit = (int)$config[$deployment]['context_limit'];
    #echo "context limit: " . $context_limit;

    if (!empty($_SESSION['document_text'])) {
        $messages = [
            [
                'role' => 'system',
                'content' => $_SESSION['document_text']
            ],
            [
                'role' => 'user',
                'content' => $message
            ]
        ];
        return $messages;
    }

    // Set up the chat messages array to send to the OpenAI API
    $messages = [
        /*[
            'role' => 'system',
            'content' => 'Prior exchanges were for context; please respond only to the user\'s next message.'
        ],
        */
        [
            'role' => 'user',
            'content' => $message
        ]
    ];


    // Add the last 5 exchanges from the recent chat history to the messages array
    $recent_messages = get_recent_messages($chat_id, $user);
    #print_r($recent_messages);
    $tokenLimit = $context_limit ; // Set your token limit here
    #$currentTokens = str_word_count($message);
	$currentTokens = approximateTokenCountByChars($message);


    if (!empty($recent_messages)) {
        $formatted_messages = [];
        foreach (array_reverse($recent_messages) as $message) {
            $message['prompt'] = substringWords($message['prompt'],400);
            $message['reply'] = substringWords($message['reply'],300);

            #print_r($message);
            $messageContent = $message['prompt'] . $message['reply'];
			$tokens = approximateTokenCountByChars($messageContent);
            #$tokens = str_word_count($str) + 2; // +2 for role and content keys // old version
            if ($currentTokens + $tokens <= $tokenLimit) {
                $formatted_messages[] = [
                    'role' => 'assistant', 
                    'content' => $message['reply']
                ];
                $formatted_messages[] = [
                    'role' => 'user', 
                    'content' => $message['prompt']
                ];
                $currentTokens += $tokens;
            } else {
                break;
            }
            #echo $tokenLimit . " - " . $currentTokens . " - STARTING HERE =----- " . print_r($formatted_messages,1) . " - THIS IS THE CURRENT TOKENS: {$currentTokens}\n";
        }
        $messages = array_merge(array_reverse($formatted_messages), $messages);
    }

    #print_r($messages);
    return $messages;
}

function approximateTokenCountByChars($text) {
    $charCount = strlen($text);
    return ceil($charCount / 4); // Rough approximation: 4 characters per token
}

