<?php
#die("<h2>NHLBI Chat is down for a very brief maintenance.</h2>");
// Include the library functions and the database connection
require_once 'lib.required.php'; 
require_once 'db.php'; 
# phpinfo();

$username = $_SESSION['user_data']['name'];

$emailhelp = $config['app']['emailhelp'];

$deployments_json = array();
foreach(array_keys($models) as $m) {
    $deployments_json[$m] = $config[$m];
}

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $config['app']['app_title']; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="style.v1.03.1.css" rel="stylesheet">
    <!-- Highlight.js CSS -->
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css">

    <!-- Highlight.js Library -->
    <script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>

    <!-- Include marked.js for Markdown parsing -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

    <!-- Initialize Highlight.js -->
    <script>
        document.addEventListener('DOMContentLoaded', (event) => {
            hljs.highlightAll();
        });
    </script>

    <!-- Application-specific variables passed from PHP -->
    <script>
        var application_path = "<?php echo $application_path; ?>";
        var deployments = <?php echo json_encode($deployments_json); ?>;
        var sessionTimeout = <?php echo $sessionTimeout * 1000; ?>; // Convert seconds to milliseconds
        var deployment = "<?php echo $deployment; ?>";
        var host = "<?php echo $config[$deployment]['host'] ; ?>";
        var temperature = "<?php echo $_SESSION['temperature']; ?>";
        var chatContainer;


    </script>

</head>
<body>

<!-- Navbar for Hamburger Menu -->
<nav class="navbar navbar-dark bg-dark">
    <button class="navbar-toggler" type="button" id="toggleMenu" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
    </button>
</nav>

<div class="container-fluid"> <!-- start the Container-fluid -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    

    <div class="row header d-flex align-items-center"> <!-- Header Row -->
        <div class="col d-flex justify-content-start">
            <img src="images/<?php echo $config['app']['app_logo']; ?>" class="logo" alt="<?php echo $config['app']['app_logo_alt']; ?>">
        </div>
        <div class="col d-flex justify-content-center">
            <h1><?php echo $config['app']['app_title']; ?></h1>
        </div>
        <div class="col d-flex justify-content-end">
            <p id="username"><span class="greeting">Hello </span><span class="user-name"><?php echo $username; ?></span> <a title="Log out of the chat interface" href="logout.php" class="logout-link" style="display:inline-block;">Logout</a></p>
        </div>
    </div> <!-- End Header Row -->



    <div class="row flex-grow-1"> <!-- Begin the Content Row -->

        <nav class="col-12 col-md-2 d-flex align-items-start flex-column menu">

            <!-- Menu content here -->
            <div class="p-2 ">
            <!-- Start Menu top content -->
                <p class="aboutChat"><a title="About text" href="javascript:void(0);" onclick="showAboutUs()">About NHLBI Chat</a></p>
                <p class="newchat"><a title="Create new chat" href="javascript:void(0);" onclick="startNewChat()">+&nbsp;&nbsp;New Chat</a></p>
                <?php
                $path = get_path();
                $chatTitle = '';
                foreach ($all_chats as $chat) {
                    $class= '';
                    if (!empty($chat_id) && $chat['id'] == $chat_id) {
                        $class = 'current-chat';  // This is the currently active chat
                        $chatTitle = htmlspecialchars($chat['title']);
                    }
                    echo '<div class="chat-item '.$class.'" id="chat-' . htmlspecialchars($chat['id']) . '">';

                    echo '<a class="chat-link chat-title" title="'.htmlspecialchars($chat['title']).'" href="/'.$application_path.'/' . htmlspecialchars($chat['id']) . '">' . htmlspecialchars($chat['title']) . '</a>';
                    echo '<img class="chat-icon edit-icon" src="images/chat_edit.png" alt="Edit this chat" title="Edit this chat">';
                    echo '<img class="chat-icon delete-icon" src="images/chat_delete.png" alt="Delete this chat" title="Delete this chat">';
                    echo '</div>';
                }
                ?>

            </div> <!-- End Menu top content -->

            <div class="mt-auto p-2"><!-- Start Menu bottom content -->

                <!-- Session Info Display (for development) -->
                <p id="session-info" style="color: #FFD700; margin-top: 10px; display: none;">
                    <!-- Session information will be displayed here -->
                </p>
    

                <!-- Adding the feedback link -->
                <p class="feedback "><?php echo $config['app']['feedback_text']; ?>
                </br>
                </br>
                <a title="Open a link to the Teams interface" href="<?php echo $config['app']['teams_link']; ?>" target="_blank">Connect in Teams</a></p>
                <p class=""><a title="Open a new window to submit feedback" href="<?php echo $config['app']['feedback_link']; ?>" target="_blank">Submit Feedback</a></p>
                <p class=""><a title="Open the training video in a new window" href="<?php echo $config['app']['video_link']; ?>" target="_blank">Training Video</a></p>
                <p><a title="Open the disclosure information in a new window" href="<?php echo $config['app']['disclosure_link']; ?>" target="_Blank">Vulnerability Disclosure</a></p>
            </div><!-- End Menu bottom content -->


        </nav> <!-- End the menu column -->

        <main id="main-content" class="col-12 col-md-10 d-flex align-items-start flex-column main-content">

            <div class="aboutChatWindow">
                <button class="closeAbout" onclick="closeAboutUs()" aria-label="Close About Us">X</button>
                <h4>About NHLBI Chat</h4>

                    <p class="newchat" style="text-align: center; margin-top: 20px;">
                        <?php echo $config['app']['help_text1']; ?>
                        <span style="display: flex; justify-content: space-between; width: 90%; margin: 20px auto;">
                            <a title="Open a link to the Teams interface" href="<?php echo $config['app']['teams_link']; ?>" target="_blank">Connect in Teams</a>
                            <a title="Open a link to the NHLBI Intranet interface" href="<?php echo $config['app']['intranet_link']; ?>" target="_blank">Overview and Instructions</a>
                            <a title="Open the training video in a new window" href="<?php echo $config['app']['video_link']; ?>" target="_blank">Training Video</a>
                            <a title="Open a new window to submit feedback" href="<?php echo $config['app']['feedback_link']; ?>" target="_blank">Submit Feedback</a>
                        </span>
                    </p>



                <?php echo $config['app']['disclaimer_text']; ?>
            </div>

            <h1 class="print-title"><?php echo $chatTitle;?></h1>

            <!-- Main content here -->
            <div id="messageList" class="p-2 maincolumn maincol-top chat-container" aria-live="polite"><!-- Flex item chat body top -->
                    <!-- Chat messages will be added here -->
           </div><!-- End Flex item chat body top -->

            <div class="maincolumn maincol-bottom"><!-- Chat body bottom -->

                <!-- Original messageForm -->
                <form id="messageForm" class="chat-input-form">
                    <div class="input-container">
                        <textarea class="form-control" id="userMessage" aria-label="Main chat textarea" placeholder="Type your message..." rows="4" required></textarea>
                        <button type="submit" class="submit-button" aria-label="Send message">
                            <!-- Icon (paper plane) -->
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="send-icon">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                </form>


                <form onsubmit="saveMessage()" id="model_select" action="" method="post" style="display: inline-block; margin-left: 20px; margin-right: 10px; margin-top: 15px; border-top: 1px solid white; ">
                    <label for="model" title="">Select Model</label>: <select title="Choose between available chat models" name="model" onchange="document.getElementById('model_select').submit();">
                        <?php
                        foreach ($models as $m => $modelconfig) {
                            #echo '<pre>'.print_r($modelconfig,1).'</pre>';
                            if (empty($modelconfig['enabled'])) continue;
                            $label = $modelconfig['label'];
                            $tooltip = $modelconfig['tooltip'];
                            $sel = ($m == $_SESSION['deployment']) ? 'selected="selected"' : '';
                            echo '<option value="'.$m.'"'.$sel.' title="'.$tooltip.'">'.$label.'</option>'."\n";
                        }
                        ?>
                    </select>
                </form>
                <form onsubmit="saveMessage()" id="temperature_select" action="" method="post" style="display: inline-block; margin-left: 20px; margin-right: 10px; margin-top: 15px; border-top: 1px solid white; ">
                    <label for="temperature">Temperature</label>: <select title="Choose a temperature setting between 0 and 2. A temperature of 0 means the responses will be very deterministic (meaning you almost always get the same response to a given prompt). A temperature of 2 means the responses can vary substantially." name="temperature" onchange="document.getElementById('temperature_select').submit();">
                        <?php
                        foreach ($temperatures as $t) {
                            $sel = ($t == $_SESSION['temperature']) ? 'selected="selected"' : '';
                            echo '<option value="'.$t.'"'.$sel.'>'.$t.'</option>'."\n";
                        }
                        ?>
                    </select>
                </form>

                <!-- File Upload Form -->
                <form onSubmit="saveMessage();" method="post" action="upload.php" id="document-uploader" enctype="multipart/form-data" style="display: inline-block; margin-top: 15px; margin-left: 30px;">
                    <!-- Hidden input for chat_id -->
                    <input type="hidden" name="chat_id" aria-label="Hidden field with Chat ID" value="<?php echo htmlspecialchars($_GET['chat_id']); ?>">

                <?php if (!empty($_SESSION['document_name'])): ?>
                    <p style="white-space: nowrap;">Uploaded file: <span style="white-space: nowrap;color: salmon;"><?php echo htmlspecialchars($_SESSION['document_name']); ?></span>
                        <a href="upload.php?remove=1&chat_id=<?php echo htmlspecialchars($_GET['chat_id']); ?>" style="color: blue">Remove</a>
                    <?php if (!empty($_SESSION['document_type']) && strpos($_SESSION['document_type'], 'image/') === 0): ?>
                        <!-- Display thumbnail for image -->
                        <img src="<?php echo $_SESSION['document_text']; ?>" alt="Uploaded Image Thumbnail" style="max-width: 60px; max-height: 60px;margin-top: -10px;" />
                    <?php endif; ?>
                    </p>

                <?php else: ?>
                    <input title="Document types accepted include PDF, XML, JSON, Word, PowerPoint, Text, Markdown, and Image files (PNG, JPEG)." 
                           type="file" name="uploadDocument" aria-label="File upload button" 
                           accept=".pdf,.docx,.pptx,.txt,.md,.json,.xml,.png,.jpg,.jpeg,.gif" 
                           style="width:15em;" required onchange="this.form.submit()" />
                <?php endif; ?>

                </form>

<?php 
                    if(!empty($_SESSION['error'])) {
                        echo "<script>alert('Error: ".$_SESSION['error']."');</script>";
                        $_SESSION['error']="";
                        unset($_SESSION['error']);
        
                    }
?>

                <form style="display: inline-block; float: right; margin-top: 15px; margin-right: 30px;">
                    <button title="Print the existing chat session" aria-label="Print button" onClick="printChat()" id="printButton">Print</button>
                </form>
            </div><!-- End Chat body bottom -->
        </main> <!-- End the main-content column -->

    </div> <!-- end the Content Row -->
</div> <!-- end the Container-fluid -->
    <div class="waiting-indicator" style="display: none;">
        <img src="images/Ripple-1s-59px.gif" alt="Loading...">
    </div>

<!-- Include Bootstrap JS and its dependencies-->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.min.js"></script>
    <script>
        document.getElementById('toggleMenu').addEventListener('click', function() {
            document.querySelector('.menu').classList.toggle('active');
        });
        var chatId = <?php echo json_encode(isset($_GET['chat_id']) ? $_GET['chat_id'] : null); ?>;
        var user = <?php echo json_encode(isset($user) ? $user : null); ?>;
        var tmr = document.getElementById('username');
</script>

    <!-- Include Session Handler JS -->
    <script src="session_handler.js"></script>

<script src="script.v1.03.1.js"></script>
<script>
    function printChat() {
        window.print();
    }
</script>

</body>
</html>


