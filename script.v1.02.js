
var chatContainer;

function resetSessionTimer(remainingTime = sessionTimeout) {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(logoutUser, remainingTime);
}

function checkSessionStatus() {
    $.ajax({
        url: 'session_status.php',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (!response.session_active) {
                logoutUser();
            } else {
                resetSessionTimer(response.remaining_time * 1000); // Adjust timer based on server's response
            }
        },
        error: function() {
            console.error('Failed to check session status.');
        }
    });
}

function logoutUser() {
    alert("Your session has expired. Please log in again.");
    window.location.href = "index.php";
}

function showAboutUs() {
    var aboutWindow = document.querySelector('.aboutChatWindow');
    var aboutCloser = document.querySelector('.closeAbout');
    aboutWindow.classList.add('show');  // Add the 'show' class to make it visible
    aboutCloser.focus();  // Give focus to the close button
}

function closeAboutUs() {
    var aboutWindow = document.querySelector('.aboutChatWindow');
    aboutWindow.classList.remove('show');  // Remove the 'show' class to hide it
    var userMessage = document.getElementById('userMessage'); // Assuming 'userMessage' is the ID of your input
    userMessage.focus();  // Set focus back to the message input
}


// Modify the event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOMContentLoaded - Current chat ID: ", chatId);
    var savedMessage = localStorage.getItem('chatDraft_' + chatId);
    if (savedMessage) {
        document.getElementById('userMessage').value = savedMessage;
        console.log("Loaded saved message for chat ID " + chatId + ": ", savedMessage);
    } else {
        document.getElementById('userMessage').value = "";
        console.log("No saved message found for chat ID " + chatId);
    }
});

// Modify the event listener for the userMessage input
document.getElementById('userMessage').addEventListener('input', (event) => {
    console.log("Input event for chat ID " + chatId);
    localStorage.setItem('chatDraft_' + chatId, event.target.value);
    console.log("Saved draft message for chat ID " + chatId + ": ", event.target.value);
});

function sanitizeString(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function startNewChat() {
    $.ajax({
        type: "POST",
        url: "new_chat.php",
        dataType: 'json',
        success: function(response) {
            // Reset the session timer on every successful AJAX call
            resetSessionTimer();

            // The response should contain the new chat's ID
            var newChatId = response.chat_id;
            // Navigate to the new chat page
            //window.location.href = "?chat_id=" + newChatId;
            window.location.href = "/"+application_path+"/" + newChatId;
        }
    });
}

function replaceNonAsciiCharacters(str) {
    // Replace certain non-ASCII characters with their ASCII equivalents
    str = str.replace(/[\u2018\u2019]/g, "'"); // Replace curly single quotes
    str = str.replace(/[\u201C\u201D]/g, '"'); // Replace curly double quotes
    str = str.replace(/\u2026/g, '...');      // Replace ellipsis
    // Add more replacements as needed
    
    // Remove any remaining non-ASCII characters
    //str = str.replace(/[^\x00-\x7F]/g, "");
    
    return str;
}

function base64EncodeUnicode(str) {
    // Firstly, escape the string using encodeURIComponent to get the UTF-8 encoding of the character
    // Secondly, we convert the percent encodings into raw bytes, and finally to base64
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode('0x' + p1);
    }));
}


function scrollToBottom() {
    const messageList = document.getElementById('messageList');
    messageList.scrollTop = messageList.scrollHeight;
}

function showIcons(chatItem) {
    $(chatItem).find('.chat-icon').css('visibility', 'visible');
}

function hideIcons(chatItem) {
    $(chatItem).find('.chat-icon').css('visibility', 'hidden');
}

function deleteChat(chatId) {
    if(confirm("Are you sure you want to delete this chat?")) {
        // Send an AJAX request to a PHP script to delete the chat
        $.ajax({
            type: "POST",
            url: "delete_chat.php",  // PHP script to delete the chat
            data: {
                chat_id: chatId
            },
            success: function() {
                // Reset the session timer on every successful AJAX call
                resetSessionTimer();

                // Extract the base URL and current chat ID from the current URL
                var baseUrl = window.location.origin + window.location.pathname;
                var currentChatId = baseUrl.split('/').pop();

                // Determine the appropriate redirect
                if (chatId === currentChatId || currentChatId === application_path || currentChatId === 'index.php') {
                    // If deleting the current chat or there's no specific chat ID,
                    // redirect to the base chat page
                    window.location.href = baseUrl.replace(/\/[^\/]*$/, '') + "/";
                } else {
                    // Otherwise, redirect back to the same chat
                    window.location.href = baseUrl;
                }
            }
        });
    }
}

function editChat(chatId) {
    // Get the chat item and chat link elements
    var chatItem = $("#chat-" + chatId);
    var chatLink = chatItem.find(".chat-link");

    // Replace the chat link with an input field and a submit button
    chatLink.replaceWith('<input class="edit-field" id="edit-input-' + chatId + '" type="text" aria-label="Chat title edit link" value="' + chatLink.text() + '"><img class="edit-confirm-icon" src="images/chat_check.png" alt="Check mark to confirm chat name edit">');

    // Add event listener for 'Enter' key on the input
    $("#edit-input-" + chatId).keypress(function(e) {
        if (e.which == 13) { // Check if the key pressed is 'Enter'
            e.preventDefault(); // Prevent default action (submission)
            submitEdit(chatId); // Trigger the submitEdit function
        }
    });
}

function submitEdit(chatId) {
    // Get the input field and its value
    var inputField = $("#edit-input-" + chatId);
    var newTitle = inputField.val();

    // Send an AJAX request to a PHP script to update the chat title
    $.ajax({
        type: "POST",
        url: "edit_chat.php",  // PHP script to edit the chat
        data: {
            chat_id: chatId,
            title: newTitle
        },
        success: function() {
            // Reset the session timer on every successful AJAX call
            resetSessionTimer();

            // Reload the page to refresh the list of chats
            location.reload();
        }
    });
}

$(document).ready(function(){
    var chatContainer = $(".chat-container");
    var userMessage = $("#userMessage");

    // Set focus on the message input
    userMessage.focus();

    console.log(chatId);

    // Initially load messages
    loadMessages();

    // Event listener for the Enter key press
    userMessage.on("keydown", function (e) {
        if (e.keyCode === 13 && !e.shiftKey) {
            e.preventDefault();
            $('#messageForm').submit();
        }
    });

    // Event delegation
    $(document).on('mouseover', '.chat-item', function () {
        showIcons(this);
    });

    $(document).on('mouseout', '.chat-item', function () {
        hideIcons(this);
    });

    $(document).on('click', '.edit-icon', function () {
        var chatId = $(this).parent().attr('id').split('-')[1];
        editChat(chatId);
    });

    $(document).on('click', '.delete-icon', function () {
        var chatId = $(this).parent().attr('id').split('-')[1];
        deleteChat(chatId);
    });

    function loadMessages() {
        $.ajax({
            url: "get_messages.php",
            data: { chat_id: chatId, user: user },
            dataType: 'json',
            success: function(chatMessages) {
                resetSessionTimer(); // Reset the session timer on every successful AJAX call
                displayMessages(chatMessages);
                scrollToBottom(); // Scroll to bottom after displaying messages
            }
        });
    }

    function displayMessages(chatMessages) {
        chatMessages.forEach(function (message) {
            console.log(deployments)
            console.log(message)
            var sanitizedPrompt = sanitizeString(message.prompt).replace(/\n/g, '<br>');
            var sanitizedReply = sanitizeString(message.reply).replace(/\n/g, '<br>');

            var userMessageElement = $('<div class="message user-message"></div>').html(sanitizedPrompt);
            userMessageElement.prepend('<img src="images/user.png" class="user-icon">');
            chatContainer.append(userMessageElement);

            if (deployments[message.deployment]) {
                var imgSrc = 'images/' + deployments[message.deployment].image;
                var imgAlt = deployments[message.deployment].image_alt;
                var assistantMessageElement = $('<div class="message assistant-message"></div>').html(sanitizedReply);
                assistantMessageElement.prepend('<img src="' + imgSrc + '" alt="' + imgAlt + '" class="openai-icon">');
                chatContainer.append(assistantMessageElement);
            }
        });
    }
    $(document).on('click', '.edit-confirm-icon', function () {
        var chatId = $(this).prev().attr('id').split('-')[2];
        submitEdit(chatId);
    });

    // Event listener for form submission
    $('#messageForm').submit(function(e) {
        e.preventDefault();
        console.log("Form submission for chat ID " + chatId);

        var rawMessageContent = userMessage.val().trim();
        var sanitizedMessageContent = replaceNonAsciiCharacters(rawMessageContent);

        // Optionally, show a warning if the message was modified
        if (sanitizedMessageContent !== rawMessageContent) {
            if (!confirm("Your message contains some special characters that might cause issues. Click OK to send the modified message or Cancel to edit your message.")) {
                return;
            }
        }

        var messageContent = base64EncodeUnicode(sanitizedMessageContent); // Encode in Base64 UTF-8

        // Clear the textarea and localStorage right after form submission
        userMessage.val("");
        localStorage.removeItem('chatDraft_' + chatId);
        console.log("Form submitted and message cleared for chat ID " + chatId);

        if (messageContent !== "") {
            //userMessage.val("");
            $.ajax({
                type: "POST",
                url: "ajax_handler.php",
                data: {
                    message: messageContent,
                    chat_id: chatId, // Assuming chatId is defined and holds the correct value
                    user: user // Assuming user is defined and holds the correct value
                },

                beforeSend: function() {
                    $('.waiting-indicator').show();
                },
                error: function() {
                    $('.waiting-indicator').hide();
                },
                success: function (response) {
                    // Hide the waiting indicator
                    $('.waiting-indicator').hide();

                    console.log("This is the response - ");
                    //console.log(response);

                    var jsonResponse = JSON.parse(response);
                    var gpt_response = jsonResponse['gpt_response'];
                    var deployment = jsonResponse['deployment'];
                    var error = jsonResponse['error'];
                    //console.log(error)
                    console.log(deployment)
                    //console.log(gpt_response)


                    // Check if gpt_response is a JSON string, and if so, parse it
                    if (error == true) {
                        console.log("FOUND AN ERROR IN THE RESPONSE");
                        alert('Error: ' + gpt_response);
                        return;
                    }
                    
                    if(gpt_response === null ||gpt_response === undefined ) {
                        gpt_response = "The message could not be processed.";
                    } 

                    if (gpt_response.startsWith('```') && gpt_response.endsWith('```')) {
                        gpt_response = gpt_response.slice(3, -3); // remove ```
                        var highlightedCode = hljs.highlightAuto(gpt_response);
                        gpt_response = '<pre><code>' + highlightedCode.value + '</code></pre>';
                    } else {
                        gpt_response = gpt_response.replace(/\n/g, '<br>');
                    }

                    if (jsonResponse.new_chat_id) {
                        window.location.href = "/" + application_path + "/" + jsonResponse.new_chat_id;
                    }

                    var userMessageDecoded = atob(messageContent);
                    //console.log("this is the user message ")
                    //console.log(userMessageDecoded)
                    var sanitizedPrompt = sanitizeString(userMessageDecoded).replace(/\n/g, '<br>');
                    //console.log("this is the NOW SANITIZED user message ")
                    //console.log(sanitizedPrompt) 

                    // Display the user message (prompt)
                    var userMessageElement = $('<div class="message user-message"></div>').html(sanitizedPrompt);
                    userMessageElement.prepend('<img src="images/user.png" class="user-icon" alt="User icon">'); // Add user icon
                    chatContainer.append(userMessageElement);

                    // Check if the deployment configuration exists
                    if (deployments[deployment]) {
                        var imgSrc = 'images/' + deployments[deployment].image;
                        var imgAlt = deployments[deployment].image_alt;

                        // Display the assistant message (reply)
                        var assistantMessageElement = $('<div class="message assistant-message"></div>');
                        assistantMessageElement.prepend('<img src="' + imgSrc + '" alt="' + imgAlt + '" class="openai-icon">');
                        //chatContainer.append(assistantMessageElement);
                    }

                    // Create a span element to hold the formatted response
                    const responseTextNode = $('<span></span>').html(gpt_response);
                    assistantMessageElement.append(responseTextNode);

                    // Append the assistant message element to the chat container
                    chatContainer.append(assistantMessageElement);

                    // Scroll to the bottom of the chat container
                    chatContainer.scrollTop(chatContainer.prop("scrollHeight"));
                }
            });
        }
    });
});

