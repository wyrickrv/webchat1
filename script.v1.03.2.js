var chatContainer;
var printChatTitle;
var searchingIndicator;
var chatTitlesContainer;
var popup;

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

// Run on window resize
window.addEventListener('resize', adjustChatTitlesHeight);

document.addEventListener('DOMContentLoaded', (event) => {

    /*
    const openSearchButton = document.getElementById('open-search');
    const cancelSearchButton = document.getElementById('cancel-search');
    const searchInput = document.getElementById('search-input');

    // Handle click on the search icon button
    openSearchButton.addEventListener('click', function() {
        searchInput.classList.add('open');
        cancelSearchButton.style.display = 'inline-block';
        openSearchButton.style.display = 'none';
        searchInput.focus();
    });

    // Handle click on the cancel button
    cancelSearchButton.addEventListener('click', function() {
        searchInput.classList.remove('open');
        cancelSearchButton.style.display = 'none';
        openSearchButton.style.display = 'inline-block';
        searchInput.value = '';
        search_term = '';
        fetchAndUpdateChatTitles();
    });

    // Handle Enter key to trigger immediate search
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchString = searchInput.value.trim();
            fetchAndUpdateChatTitles(searchString);
        }
    });
    */

    // Load saved chat draft
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

function fetchAndUpdateChatTitles(searchString = '') {

    // Check if searchingIndicator exists
    if (!searchingIndicator) {
        console.error('Error: searchingIndicator element not found in the DOM.');
        return;
    }

    if (search_term !== '') {
        console.log(search_term)
        const openSearchButton = document.getElementById('open-search');
        const cancelSearchButton = document.getElementById('cancel-search');
        const searchInput = document.getElementById('search-input');

        // Handle click on the search icon button
        searchInput.classList.add('open');
        cancelSearchButton.style.display = 'inline-block';
        openSearchButton.style.display = 'none';
        searchInput.focus();
    }


    // Show the searching indicator
    searchingIndicator.style.display = 'block';
    chatTitlesContainer.style.opacity = '0.5'; // Dim the container while loading

    $.ajax({
        url: 'get_chat_titles.php',
        type: 'GET',
        dataType: 'json',
        data: { search: searchString }, // Pass the search string here
        success: function(response) {
            // Hide the searching indicator
            searchingIndicator.style.display = 'none';
            chatTitlesContainer.style.opacity = '1'; // Restore opacity

            // Clear the current chat titles
            $('.chat-titles-container').empty();

            if (searchString.trim() !== '') {
                // Handle the case where no results are found
                if (Object.keys(response).length === 0) {
                    $('.chat-titles-container').append(`
                        <div class="no-results">
                            <p>No results found for "${searchString}".</p>
                        </div>
                    `);
                } else {
                    $('.chat-titles-container').append(`
                        <div class="no-results">
                            <p>Chats including: "${searchString}"</p>
                        </div>
                    `);
                }
            }

            // Remove any existing popup to prevent duplicate event listeners
            $('#popup').remove();

            // Create new popup with initial hidden state and opacity
            $('body').append(`
                <div id="popup" class="popup" style="display: none; opacity: 0; transition: opacity 0.3s ease-out;">
                    <div class="popup-toolbar">
                        <button class="popup-icon copy-title-button" title="Copy Title">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                        </button>
                        <button class="popup-icon edit-icon" title="Edit this chat">
                            <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="17px" height="17px" viewBox="0 0 32 32" enable-background="new 0 0 32 32" xml:space="preserve">
                                <path fill="#FFFFFF" d="M0,31.479c0,0.276,0.224,0.5,0.5,0.5h31.111c0.067,0,0.132-0.013,0.193-0.039
                                    c0.061-0.026,0.116-0.063,0.162-0.109c0.001-0.001,0.002-0.001,0.003-0.002c0.003-0.003,0.003-0.009,0.007-0.012
                                    c0.051-0.055,0.084-0.122,0.107-0.195c0.007-0.023,0.01-0.045,0.014-0.069c0.004-0.025,0.015-0.047,0.015-0.073
                                    c0-0.04-0.014-0.075-0.023-0.112c-0.003-0.014,0.003-0.028-0.002-0.042l-3.16-9.715c-0.024-0.075-0.066-0.144-0.122-0.199
                                    L11.688,4.294c-0.018-0.028-0.031-0.058-0.055-0.083L7.894,0.472c-0.607-0.607-1.595-0.607-2.203,0L0.456,5.707
                                    C0.162,6.001,0,6.392,0,6.808s0.162,0.808,0.456,1.102l3.656,3.656c0.018,0.027,0.03,0.058,0.054,0.082l17.09,17.205
                                    c0.059,0.06,0.131,0.103,0.212,0.127l6.713,2H0.5C0.224,30.979,0,31.203,0,31.479z M6.362,10.161l15.687,15.486l-0.577,2.002
                                    L5.227,11.296L6.362,10.161z M22.816,25L7.068,9.455l2.437-2.437l15.607,15.648V25H22.816z M25.735,21.875L10.212,6.311
                                    l1.039-1.039l16.211,16.211L25.735,21.875z M22.988,26h2.624c0.276,0,0.5-0.224,0.5-0.5v-2.685l2.007-0.456l2.723,8.37L22.354,28.2
                                    L22.988,26z M1,6.808C1,6.659,1.058,6.52,1.163,6.414l5.235-5.235c0.217-0.217,0.57-0.218,0.789,0l3.372,3.372l-6.023,6.023
                                    L1.164,7.202C1.058,7.097,1,6.957,1,6.808z" stroke="#f2f2f2" stroke-width="1"/>
                            </svg>
                        </button>
                        <button class="popup-icon delete-icon" title="Delete this chat">
                            <svg fill="#ffffff" height="18px" width="18px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 60.167 60.167" xml:space="preserve">
                            <path d="M54.5,11.667H39.88V3.91c0-2.156-1.754-3.91-3.91-3.91H24.196c-2.156,0-3.91,1.754-3.91,3.91v7.756H5.667
                                c-0.552,0-1,0.448-1,1s0.448,1,1,1h2.042v40.5c0,3.309,2.691,6,6,6h32.75c3.309,0,6-2.691,6-6v-40.5H54.5c0.552,0,1-0.448,1-1
                                S55.052,11.667,54.5,11.667z M22.286,3.91c0-1.053,0.857-1.91,1.91-1.91H35.97c1.053,0,1.91,0.857,1.91,1.91v7.756H22.286V3.91z
                                 M50.458,54.167c0,2.206-1.794,4-4,4h-32.75c-2.206,0-4-1.794-4-4v-40.5h40.75V54.167z M38.255,46.153V22.847c0-0.552,0.448-1,1-1
                                s1,0.448,1,1v23.306c0,0.552-0.448,1-1,1S38.255,46.706,38.255,46.153z M29.083,46.153V22.847c0-0.552,0.448-1,1-1s1,0.448,1,1
                                v23.306c0,0.552-0.448,1-1,1S29.083,46.706,29.083,46.153z M19.911,46.153V22.847c0-0.552,0.448-1,1-1s1,0.448,1,1v23.306
                                c0,0.552-0.448,1-1,1S19.911,46.706,19.911,46.153z" stroke="#ffffff" stroke-width="1"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `);

            popup = $('#popup');
            let hideTimer = null;
            let autoCloseTimer = null;

            // Function to handle showing popup
            function showPopup(e, chatId, chatTitle) {
                if (hideTimer) {
                    clearTimeout(hideTimer);
                }
                
                // Clear any existing auto-close timer
                if (autoCloseTimer) {
                    clearTimeout(autoCloseTimer);
                }
                
                // Close any existing edit forms when popup is triggered
                $('.chat-item').each(function() {
                    const $existingEditInput = $(this).find('.edit-field');
                    if ($existingEditInput.length > 0) {
                        const existingChatId = $existingEditInput.attr('id').replace('edit-input-', '');
                        revertEditForm(existingChatId);
                    }
                });

                // Set new auto-close timer
                autoCloseTimer = setTimeout(() => {
                    // Fade out the popup
                    popup.css('opacity', '0');
                    
                    // Hide the popup after fade-out completes
                    setTimeout(() => {
                        popup.hide();
                    }, 150); // Match the transition duration
                }, 2000);
                
                popup.data('currentChatId', chatId);
                popup.data('currentChatTitle', chatTitle);
                
                const ellipsisRect = e.target.getBoundingClientRect();
                popup.css({
                    top: ellipsisRect.top + 'px',
                    display: 'block',
                    opacity: '1' // Ensure fully visible when shown
                });
            }

            // Add popup event listeners
            popup.on('mouseenter', () => {
                if (hideTimer) {
                    clearTimeout(hideTimer);
                }
                // Clear the auto-close timer when user hovers
                if (autoCloseTimer) {
                    clearTimeout(autoCloseTimer);
                }
                
                // Ensure popup is fully visible
                popup.css('opacity', '1');
            }).on('mouseleave', startHideTimer);

            // Add click handlers for popup buttons
            popup.on('click', '.edit-icon', function() {
                const chatId = popup.data('currentChatId');
                popup.hide();
                editChat(chatId, showPopup);
            });

            popup.on('click', '.delete-icon', function() {
                const chatId = popup.data('currentChatId');
                const chatTitle = popup.data('currentChatTitle');
                popup.hide();
                deleteChat(chatId, chatTitle);
            });

            popup.on('click', '.copy-title-button', function() {
                const chatId = popup.data('currentChatId');
                const chatTitle = popup.data('currentChatTitle');
                copyTitleToClipboard(chatId, chatTitle);
            });

            // Convert the response object to an array and iterate over it
            Object.values(response).forEach(function(chat, index) {
                const isCurrentChat = chat.id === window.location.pathname.split('/')[2];
                const chatItemClass = isCurrentChat ? 'chat-item current-chat' : 'chat-item';

                const chatItem = $('<div>', {
                    class: chatItemClass,
                    id: `chat-${chat.id}`
                });

                const chatLink = $('<a>', {
                    class: 'chat-link chat-title',
                    title: chat.title,
                    href: `/${application_path}/${chat.id}`, // Use the application_path variable here
                    text: chat.title,
                    'data-chat-id': chat.id,
                    'data-chat-title': chat.title
                });

                // Create ellipsis link for popup trigger
                const ellipsisLink = $('<a>', {
                    href: '#',
                    class: 'chat-ellipsis',
                    html: '&#8230;', // HTML entity for ellipsis
                    'data-chat-id': chat.id,
                    'data-chat-title': chat.title
                });

                // Add hover events to the entire chat item
                chatItem.on('mouseenter', function() {
                    $(this).addClass('current-chat');
                }).on('mouseleave', function() {
                    // Only remove 'current-chat' if it's not the actual current chat
                    if (!$(this).hasClass('initial-current-chat')) {
                        $(this).removeClass('current-chat');
                    }
                });

                // Add click event to ellipsis link
                ellipsisLink.on('click', function(e) {
                    e.preventDefault();
                    showPopup(e, chat.id, chat.title);
                });

                // Mark the initial current chat with a special class
                if (isCurrentChat) {
                    chatItem.addClass('initial-current-chat');
                    printChatTitle = chat.title;
                    //console.log("This is the printChatTitle: "+printChatTitle);
                    // write the current chat title to the print-title element
                    document.getElementById('print-title').innerHTML = printChatTitle;
                }

                chatItem.append(chatLink, ellipsisLink);

                $('.chat-titles-container').append(chatItem);
            });
        },
        error: function(xhr, status, error) {
            searchingIndicator.style.display = 'none';
            chatTitlesContainer.style.opacity = '1'; // Restore opacity
            console.error('Error fetching chat titles:', error);
        }

    });
}


            // Function to handle hiding popup
            function startHideTimer() {
                hideTimer = setTimeout(() => {
                    // Fade out the popup
                    popup.css('opacity', '0');
                    
                    // Hide the popup after fade-out completes
                    setTimeout(() => {
                        popup.hide();
                    }, 150); // Match the transition duration
                }, 250);
            }

            function revertEditForm(existingChatId) {
                var originalLink = $('<div>').html($("#chat-" + existingChatId).find('[data-chat-title]').data('chat-title')).text();
                
                $("#edit-input-" + existingChatId).replaceWith(`
                    <a class="chat-link chat-title" 
                       title="${originalLink}" 
                       href="/${application_path}/${existingChatId}" 
                       data-chat-id="${existingChatId}" 
                       data-chat-title="${originalLink}">
                        ${originalLink}
                    </a>
                `);
                
                $("#edit-confirm-" + existingChatId).remove();
                $("#edit-cancel-" + existingChatId).remove();
                
                var $restoredLink = $("#chat-" + existingChatId + " .chat-link");
                $restoredLink.on('mouseenter', function(e) {
                    const chatId = $(this).data('chat-id');
                    const chatTitle = $(this).data('chat-title');
                    showPopup(e, chatId, chatTitle);
                }).on('mouseleave', startHideTimer);
            }

function copyTitleToClipboard(chatId, title) {
    const tempInput = document.createElement("input");
    tempInput.style.position = "absolute";
    tempInput.style.left = "-9999px";
    tempInput.value = title;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    // Show a non-intrusive "Copied!" message
    var chatItem = $("#chat-" + chatId);
    var popup = document.createElement('span');
    popup.className = 'copied-popup show';
    popup.textContent = 'Copied!';
    chatItem.append(popup);

    setTimeout(() => {
        popup.remove();
    }, 2000);

    // Close the popup menu
    closePopupMenu(chatItem);
}

// Function to close the popup menu
function closePopupMenu(chatItem) {
    chatItem.removeClass('hover');
}


function deleteChat(chatId, chatTitle) {
    if(confirm(`Delete "${chatTitle}"?\nAre you sure you want to delete this chat?`)) {
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

function editChat(chatId, showPopup) {
    // Close any existing edit forms when popup is triggered
    $('.chat-item').each(function() {
        const $existingEditInput = $(this).find('.edit-field');
        if ($existingEditInput.length > 0) {
            const existingChatId = $existingEditInput.attr('id').replace('edit-input-', '');
            revertEditForm(existingChatId);
        }
    });

    var chatItem = $("#chat-" + chatId);
    var chatLink = chatItem.find(".chat-link");
    var originalChatLinkHTML = chatLink.prop('outerHTML');

    const checkicon = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.9647 14.9617L17.4693 7.44735L18.5307 8.50732L9.96538 17.0837L5.46967 12.588L6.53033 11.5273L9.9647 14.9617Z" fill="#FFFFFF"/></svg>`;
    const cancelicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="20px" height="20px"><path d="M 25 2 C 12.309534 2 2 12.309534 2 25 C 2 37.690466 12.309534 48 25 48 C 37.690466 48 48 37.690466 48 25 C 48 12.309534 37.690466 2 25 2 z M 25 4 C 36.609534 4 46 13.390466 46 25 C 46 36.609534 36.609534 46 25 46 C 13.390466 46 4 36.609534 4 25 C 4 13.390466 13.390466 4 25 4 z M 32.990234 15.986328 A 1.0001 1.0001 0 0 0 32.292969 16.292969 L 25 23.585938 L 17.707031 16.292969 A 1.0001 1.0001 0 0 0 16.990234 15.990234 A 1.0001 1.0001 0 0 0 16.292969 17.707031 L 23.585938 25 L 16.292969 32.292969 A 1.0001 1.0001 0 1 0 17.707031 33.707031 L 25 26.414062 L 32.292969 33.707031 A 1.0001 1.0001 0 1 0 33.707031 32.292969 L 26.414062 25 L 33.707031 17.707031 A 1.0001 1.0001 0 0 0 32.990234 15.986328 z" fill="#FFFFFF"/></svg>`;
    
    chatLink.replaceWith(`
        <input class="edit-field" id="edit-input-${chatId}" type="text" aria-label="Chat title edit link" value="${chatLink.text()}">
        <span class="edit-confirm-icon" id="edit-confirm-${chatId}">${checkicon}</span>
        <span class="edit-cancel-icon" id="edit-cancel-${chatId}" style="width: 26px; height: 24px; margin-left: 5px;">${cancelicon}</span>
    `);
    
    var $editInput = $("#edit-input-" + chatId);
    $editInput.focus();

    $editInput.on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitEdit(chatId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });

    $("#edit-confirm-" + chatId).click(function() {
        submitEdit(chatId);
    });

    $("#edit-cancel-" + chatId + ", #edit-cancel-icon").click(function() {
        cancelEdit();
    });

    function cancelEdit() {
        revertEditForm(chatId);
    }

}

function submitEdit(chatId) {
    // Get the input field and its value
    var inputField = $("#edit-input-" + chatId);
    var newTitle = inputField.val().trim();

    // Validate the title (optional, but recommended)
    if (!newTitle) {
        alert('Chat title cannot be empty');
        inputField.focus();
        return;
    }

    // Send an AJAX request to update the chat title
    $.ajax({
        type: "POST",
        url: "edit_chat.php",
        data: {
            chat_id: chatId,
            title: newTitle
        },
        success: function(response) {
            // Find the chat link and update its text and attributes
            var chatLink = $("#chat-" + chatId + " .chat-link");
            chatLink.text(newTitle);
            chatLink.attr('title', newTitle);
            chatLink.data('chat-title', newTitle);

            // Replace the input and icons with the original link
            var originalLink = $('<a>', {
                class: 'chat-link chat-title',
                title: newTitle,
                href: `/${application_path}/${chatId}`, // Use the application_path variable here
                text: newTitle,
                'data-chat-id': chatId,
                'data-chat-title': newTitle
            });

            // Remove the input and icons
            inputField.replaceWith(originalLink);
            $(".edit-confirm-icon").remove();
            $(".edit-cancel-icon").remove();

            // Restore hover events
            originalLink.on('mouseenter', function(e) {
                showPopup(e, chatId, newTitle);
            }).on('mouseleave');

            // Optional: Update the page title if this is the current chat
            if (window.location.pathname.includes(`/${application_path}/${chatId}`)) {
                document.title = newTitle;
            }
        },
        error: function(xhr, status, error) {
            console.error('Error updating chat title:', error);
            alert('Failed to update chat title. Please try again.');
        }
    });
}

function adjustChatTitlesHeight() {
    // Select the chat-titles-container and the menu bottom content
    const chatTitlesContainer = document.querySelector('.chat-titles-container');
    const menuBottomContent = document.querySelector('.mt-auto.p-2');

    // Calculate available height
    const viewportHeight = window.innerHeight - 120;
    const menuBottomHeight = menuBottomContent.offsetHeight + 60;

    //console.log(viewportHeight)
    //console.log(menuBottomHeight)

    // Adjust for any padding/margin as needed
    const paddingOffset = 20; // Adjust this as necessary

    // Set the height dynamically with a minimum of 200px
    const newHeight = Math.max(viewportHeight - menuBottomHeight - paddingOffset, 360);
    chatTitlesContainer.style.height = `${newHeight}px`;
}

// Remove the DOMContentLoaded event listener from the top of the file
$(document).ready(function() {

    searchingIndicator = document.getElementById('searching-indicator');
    chatTitlesContainer = document.querySelector('.chat-titles-container');

    // Run on page load
    adjustChatTitlesHeight();

    // Display all the chat titles
    fetchAndUpdateChatTitles(search_term);

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

    $(document).on('click', '.edit-confirm-icon', function () {
        var chatId = $(this).parent().prev().attr('id').split('-')[2];
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

        // Display the user message (prompt) immediately after submission
        if (sanitizedMessageContent !== "") {
            var userMessageDecoded = base64DecodeUnicode(messageContent);
            var sanitizedPrompt = sanitizeString(userMessageDecoded).replace(/\n/g, '<br>');

            var userMessageElement = $('<div class="message user-message"></div>').html(sanitizedPrompt);
            userMessageElement.prepend('<img src="images/user.png" class="user-icon" alt="User icon">');
            chatContainer.append(userMessageElement);

            // Display the image only if document_type is an image MIME type
            if (document_text && document_type) { // Ensure both document_text and document_type are present
                // Check if document_type starts with 'image/'
                if (typeof document_type === 'string' && document_type.toLowerCase().startsWith('image/')) {
                    // Create an image element with the appropriate MIME type
                    // Assuming document_text contains a Base64-encoded string without the data URL prefix
                    //var imgSrc = `data:${document_type};base64,${document_text}`;
                    var imgSrc = document_text;


                    var imgElement = $('<img>')
                        .attr('src', imgSrc)
                        .attr('alt', 'Uploaded Image')
                        .on('error', function() {
                            console.error('Failed to load image.');
                        });

                    // Optionally, wrap the image in a div with a class for styling
                    var imageContainer = $('<div class="message image-message"></div>').append(imgElement);

                    // Append the image to the chat container
                    chatContainer.append(imageContainer);
                }
                // If document_type is not an image MIME type, do not display anything
            }

            // Scroll to the bottom of the chat container
            chatContainer.scrollTop(chatContainer.prop("scrollHeight"));

            // Clear the textarea and localStorage right after form submission
            userMessage.val("");
            localStorage.removeItem('chatDraft_' + chatId);
        }

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

                    fetchAndUpdateChatTitles();
                    var jsonResponse = JSON.parse(response);
                    var gpt_response = jsonResponse['gpt_response'];

                    // Store the raw response
                    var raw_gpt_response = gpt_response;

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

            // Check if document_name and document_text are not empty
            if (message.document_name && message.document_text) {
                // Create an image element with the base64 data
                var imgElement = $('<img>').attr('src', message.document_text);

                // Optionally, wrap the image in a div with a class for styling
                var imageContainer = $('<div class="message image-message"></div>').append(imgElement);

                // Append the image to the chat container
                chatContainer.append(imageContainer);
            }

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

