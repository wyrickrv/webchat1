var chatContainer;

// Copy code to clipboard function
function copyToClipboard(button) {
    var code = button.parentNode.querySelector('pre code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        var popup = document.createElement('span');
        popup.className = 'copied-popup show';
        popup.textContent = 'Copied!';
        button.parentNode.appendChild(popup);

        setTimeout(() => {
            popup.remove();
        }, 2000);
    });
}

// Show 'About Us' modal
function showAboutUs() {
    var aboutWindow = document.querySelector('.aboutChatWindow');
    var aboutCloser = document.querySelector('.closeAbout');
    aboutWindow.classList.add('show');  // Add the 'show' class to make it visible
    aboutCloser.focus();  // Give focus to the close button
}

// Close 'About Us' modal
function closeAboutUs() {
    var aboutWindow = document.querySelector('.aboutChatWindow');
    aboutWindow.classList.remove('show');  // Remove the 'show' class to hide it
    var userMessage = document.getElementById('userMessage'); // Assuming 'userMessage' is the ID of your input
    userMessage.focus();  // Set focus back to the message input
}


// Modify the event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', (event) => {
    //console.log("DOMContentLoaded - Current chat ID: ", chatId);
    var savedMessage = localStorage.getItem('chatDraft_' + chatId);
    if (savedMessage) {
        document.getElementById('userMessage').value = savedMessage;
        //console.log("Loaded saved message for chat ID " + chatId + ": ", savedMessage);
    } else {
        document.getElementById('userMessage').value = "";
        //console.log("No saved message found for chat ID " + chatId);
    }
});

// Modify the event listener for the userMessage input
document.getElementById('userMessage').addEventListener('input', (event) => {
    //console.log("Input event for chat ID " + chatId);
    localStorage.setItem('chatDraft_' + chatId, event.target.value);
    //console.log("Saved draft message for chat ID " + chatId + ": ", event.target.value);
});

function sanitizeString(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}


function startNewChat() {
    $.ajax({
        type: "POST",
        url: "new_chat.php",
        dataType: 'json',
        success: function(response) {

            // The response should contain the new chat's ID
            var newChatId = response.chat_id;
            // Navigate to the new chat page
            //window.location.href = "?chat_id=" + newChatId;
            window.location.href = "/"+application_path+"/" + newChatId;
        }
    });
}

function replaceNonAsciiCharacters(str) {
    str = str.replace(/[\u2018\u2019]/g, "'"); 
    str = str.replace(/[\u201C\u201D]/g, '"');
    str = str.replace(/\u2026/g, '...');
    return str;
}

function base64DecodeUnicode(str) {
    // Decode base64, then URI decode to handle Unicode characters
    return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
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

            // Reload the page to refresh the list of chats
            location.reload();
        }
    });
}

$(document).ready(function() {
    chatContainer = $(".chat-container");
    var userMessage = $("#userMessage");

    // Set focus on the message input
    userMessage.focus();

    //console.log(chatId);

    // Initially load messages
    loadMessages();

    // Event listener for the Enter key press
    userMessage.on("keydown", function (e) {
        if (e.keyCode === 13 && !e.shiftKey) {
            e.preventDefault();
            $('#messageForm').submit();
        }
    });

    // Event delegation for chat-item mouseover/out and other buttons
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

    $(document).on('click', '.edit-confirm-icon', function () {
        var chatId = $(this).prev().attr('id').split('-')[2];
        submitEdit(chatId);
    });

    // Event listener for form submission
    $('#messageForm').submit(function(e) {
        e.preventDefault();
        //console.log("Form submission for chat ID " + chatId);

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
        //console.log("Form submitted and message cleared for chat ID " + chatId);

        if (messageContent !== "") {
            $.ajax({
                type: "POST",
                url: "ajax_handler.php",
                data: {
                    message: messageContent,
                    chat_id: chatId,
                    user: user
                },

                beforeSend: function() {
                    $('.waiting-indicator').show();
                },
                error: function() {
                    $('.waiting-indicator').hide();
                },

                success: function(response) {
                    $('.waiting-indicator').hide();

                    var jsonResponse = JSON.parse(response);
                    var gpt_response = jsonResponse['gpt_response'];

                    // Store the raw response
                    var raw_gpt_response = gpt_response;
                    //console.log("testing")
                    //console.log(raw_gpt_response)
                    //console.log("happy")

                    var deployment = jsonResponse['deployment'];
                    var error = jsonResponse['error'];

                    // Handle errors in the response
                    if (error) {
                        console.log("FOUND AN ERROR IN THE RESPONSE");
                        alert('Error: ' + gpt_response);
                        return;
                    }

                    // Check if gpt_response is null or undefined
                    if (!gpt_response) {
                        gpt_response = "The message could not be processed.";
                    }

                    // Process code blocks in gpt_response
                    gpt_response = formatCodeBlocks(gpt_response);

                    if (jsonResponse.new_chat_id) {
                        window.location.href = "/" + application_path + "/" + jsonResponse.new_chat_id;
                    }

                    var userMessageDecoded = base64DecodeUnicode(messageContent);
                    var sanitizedPrompt = sanitizeString(userMessageDecoded).replace(/\n/g, '<br>');

                    // Display the user message (prompt)
                    var userMessageElement = $('<div class="message user-message"></div>').html(sanitizedPrompt);
                    userMessageElement.prepend('<img src="images/user.png" class="user-icon" alt="User icon">');
                    chatContainer.append(userMessageElement);

                    // Check if the deployment configuration exists
                    if (deployments[deployment]) {
                        var imgSrc = 'images/' + deployments[deployment].image;
                        var imgAlt = deployments[deployment].image_alt;

                        // Create the assistant message element
                        var assistantMessageElement = $('<div class="message assistant-message" style="margin-bottom: 30px;"></div>');

                        // Add the assistant's icon
                        assistantMessageElement.prepend('<img src="' + imgSrc + '" alt="' + imgAlt + '" class="openai-icon">');

                        assistantMessageElement.append('<span>' + gpt_response + '</span>');

                        // Append the assistant message to the chat container
                        chatContainer.append(assistantMessageElement);

                        // Add the copy button
                        addCopyButton(assistantMessageElement, raw_gpt_response);

                    }

                    // Scroll to the bottom of the chat container
                    chatContainer.scrollTop(chatContainer.prop("scrollHeight"));

                    // Re-run Highlight.js on the newly added content
                    hljs.highlightAll();

                }

            });
        }
    });


// Function to add the copy button
function addCopyButton(messageElement, rawMessageContent) {
    // Create the copy button without the onclick attribute
    var copyButton = $(`
        <button class="copy-chat-button" title="Copy Raw Reply" aria-label="Copy the current reply to clipboard">
            <span style="font-size:12px;">Copy Raw Reply</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>
            </svg>
        </button>
    `);

    // Append the copy button to the message element
    messageElement.append(copyButton);

    // Set the position of the message element to relative
    messageElement.css('position', 'relative');

    // Initially hide the button
    copyButton.hide();

    // Show the button on mouse over
    messageElement.on('mouseover', function() {
        copyButton.show();
    });

    // Hide the button on mouse out
    messageElement.on('mouseout', function() {
        copyButton.hide();
    });

    // Copy the raw content to clipboard on click
    copyButton.on('click', function() {
        // Use the rawMessageContent directly
        navigator.clipboard.writeText(rawMessageContent).then(function() {
            // Create a subtle popup message
            var popup = $('<span class="copied-chat-popup show">Copied!</span>');
            
            // Style the popup (adjust positioning as needed)
            popup.css({
                position: 'absolute',
                top: copyButton.position().top + 4, // Adjust this value as needed
                left: copyButton.position().left + 150,
            });

            // Append the popup to the message element
            messageElement.append(popup);

            // Remove the popup after 2 seconds
            setTimeout(function() {
                popup.remove();
            }, 2000);
        }, function(err) {
            console.error('Could not copy text: ', err);
        });
    });
}


    function loadMessages() {
        $.ajax({
            url: "get_messages.php",
            data: { chat_id: chatId, user: user },
            dataType: 'json',
            success: function(chatMessages) {
                displayMessages(chatMessages);
                scrollToBottom();
            }
        });
    }

    function displayMessages(chatMessages) {
        chatMessages.forEach(function(message) {
            var sanitizedPrompt = sanitizeString(message.prompt).replace(/\n/g, '<br>');

            // Format the reply to include code blocks
            var sanitizedReply = formatCodeBlocks(message.reply);

            var userMessageElement = $('<div class="message user-message"></div>').html(sanitizedPrompt);
            userMessageElement.prepend('<img src="images/user.png" class="user-icon">');
            chatContainer.append(userMessageElement);

            if (deployments[message.deployment]) {
                var imgSrc = 'images/' + deployments[message.deployment].image;
                var imgAlt = deployments[message.deployment].image_alt;


                var assistantMessageElement = $('<div class="message assistant-message"></div>').html(sanitizedReply);

                // Add the assistant's icon
                assistantMessageElement.prepend('<img src="' + imgSrc + '" alt="' + imgAlt + '" class="openai-icon">');

                // Append the assistant message to the chat container
                chatContainer.append(assistantMessageElement);

                // Add the copy button
                addCopyButton(assistantMessageElement, message.reply);
            }

            // Re-run Highlight.js on new content
            hljs.highlightAll();
        });
    }

// Function to identify and format code blocks
function formatCodeBlocks(reply) {
    // Array to hold code blocks temporarily
    let codeBlocks = [];

    // Extract and replace code blocks with placeholders
    reply = reply.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
        // If language is specified, use it; otherwise default to plaintext
        var languageClass = lang ? `language-${lang}` : 'plaintext';

        // Escape the code content before inserting it
        const sanitizedCode = sanitizeString(code);

        // Save the code block in an array
        codeBlocks.push(`
            <div class="code-block">
                <div class="language-label">${lang || 'code'}</div>
                <button class="copy-button" title="Copy Code" aria-label="Copy code to clipboard" onclick="copyToClipboard(this)">
                    <span style="font-size:12px;">Copy Code</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>
                    </svg>
                </button>
                <pre><code class="${languageClass}">${sanitizedCode}</code></pre>
            </div>`);

        // Return a placeholder to be replaced later
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Use marked.parse to handle markdown parsing on the rest of the content
    reply = marked.parse(reply);

    // Replace placeholders with the original code block HTML
    codeBlocks.forEach((block, index) => {
        reply = reply.replace(`<strong>CODE_BLOCK_${index}</strong>`, block);
    });

    return reply;
}


});

