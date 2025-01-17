let socket = null;
let currentChannel = null;  // Will store the channel ID
let currentChannelName = 'general';  // Store the channel name separately
let currentUser = null;
let allUsers = []; // Store all users for search
let currentThreadId = null;

// Show the selected authentication tab
function showTab(tabName) {
    document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// Handle form submissions
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        loginSuccess(data);
    } catch (error) {
        alert(error.message || 'Login failed');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        loginSuccess(data);
    } catch (error) {
        alert(error.message || 'Registration failed');
    }
});

document.getElementById('guest-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/api/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: formData.get('username')
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        loginSuccess(data);
    } catch (error) {
        alert(error.message || 'Failed to join as guest');
    }
});

function loginSuccess(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    
    // Initialize socket connection with token
    socket = io({
        auth: {
            token: data.token
        }
    });

    setupSocketListeners();
    showChatScreen();
}

function setupSocketListeners() {
    socket.on('connect_error', (err) => {
        if (err.message === 'Authentication error') {
            logout();
        }
    });

    socket.on('initialize', (data) => {
        currentUser = data.currentUser;
        allUsers = data.users || []; // Initialize allUsers with the users from server
        
        // Find the general channel and set it as current
        const generalChannel = data.channels.find(ch => ch.name === 'general');
        if (generalChannel) {
            currentChannel = generalChannel.id;
            currentChannelName = 'general';
            console.log('Set current channel:', currentChannel);
        }
        
        updateChannelsList(data.channels);
        updateUsersList(allUsers); // Update the users list in the UI
        
        // Display initial messages if any
        if (data.messages) {
            document.getElementById('messages').innerHTML = '';
            data.messages.forEach(addMessage);
        }
    });

    socket.on('previous messages', (data) => {
        if (data.channelId === currentChannel) {
            document.getElementById('messages').innerHTML = '';
            data.messages.forEach(addMessage);
        }
    });

    socket.on('chat message', (data) => {
        console.log('Received message:', data);
        if (data.channelId === currentChannel) {
            // Remove loading indicator if exists
            const loadingIndicator = document.querySelector('.loading');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            
            addMessage(data.message);
            // Scroll to bottom on new message
            const messagesDiv = document.getElementById('messages');
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    });

    socket.on('channel created', (channel) => {
        addChannel(channel);
    });

    // Add handler for new user joined
    socket.on('user joined', (user) => {
        if (!allUsers.some(u => u.id === user.id)) {
            allUsers.push(user);
            updateUsersList(allUsers);
        }
    });

    // Update user status handler
    socket.on('user status', (data) => {
        // Update user status in allUsers array
        const user = allUsers.find(u => u.id === data.userId);
        if (user) {
            user.isOnline = data.isOnline;
            updateUsersList(allUsers);
        }
    });

    socket.on('reaction_updated', (data) => {
        console.log('Reaction updated:', data);
        updateMessageReactions(data.messageId, data.reactions);
    });

    socket.on('thread_updated', (data) => {
        // Auto-open thread if it's an AI response
        if (data.reply.text.startsWith('AI Response:')) {
            openThread(data.parentId);
        }
        
        // Update thread view if open
        if (currentThreadId === data.parentId) {
            addThreadMessage(data.reply);
        }
        // Update reply count in main view
        updateThreadIndicator(data.parentId);
    });

    // Update thread message handler
    socket.on('thread messages', (data) => {
        if (data.parentId !== currentThreadId) return;

        const threadMessages = document.getElementById('thread-messages');
        threadMessages.innerHTML = ''; // Clear existing messages
        
        // Display replies
        data.messages.replies.forEach(message => {
            addThreadMessage(message);
        });
        
        threadMessages.scrollTop = threadMessages.scrollHeight;
    });

    // Add message deletion handler
    socket.on('message deleted', (data) => {
        // Remove message from main chat
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }

        // If this was a parent message and thread is open, close the thread
        if (!data.parentId && currentThreadId === data.messageId) {
            closeThread();
        }

        // If this was a reply and its thread is open, remove it from thread view
        if (data.parentId && currentThreadId === data.parentId) {
            const threadMessage = document.querySelector(`#thread-messages [data-message-id="${data.messageId}"]`);
            if (threadMessage) {
                threadMessage.remove();
            }
        }
    });
}

function updateChannelsList(channels) {
    const channelsList = document.getElementById('channels-list');
    channelsList.innerHTML = '';
    channels.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = `channel ${channel.id === currentChannel ? 'active' : ''}`;
        channelElement.dataset.channelId = channel.id;
        channelElement.onclick = () => switchChannel(channel.id, channel.name);
        channelElement.textContent = `# ${channel.name}`;
        channelsList.appendChild(channelElement);
    });
}

function addChannel(channel) {
    const channelsList = document.getElementById('channels-list');
    const channelElement = document.createElement('div');
    channelElement.className = `channel ${channel.id === currentChannel ? 'active' : ''}`;
    channelElement.onclick = () => switchChannel(channel.id);
    channelElement.textContent = `# ${channel.name}`;
    channelsList.appendChild(channelElement);
}

function updateUsersList(users) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    users
        .filter(user => user.id !== currentUser.id) // Don't show current user
        .forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.onclick = () => startDirectMessage(user);
            userElement.innerHTML = `
                <span class="user-status ${user.isOnline ? 'online' : 'offline'}"></span>
                ${user.username}${user.isGuest ? ' (Guest)' : ''}
            `;
            usersList.appendChild(userElement);
        });
}

function switchChannel(channelId, channelName) {
    clearSearchHighlights();
    currentChannel = channelId;
    currentChannelName = channelName;
    
    // Update UI
    document.querySelectorAll('.channel').forEach(ch => {
        ch.classList.toggle('active', ch.dataset.channelId === channelId);
    });
    document.getElementById('current-channel').textContent = `# ${channelName}`;
    document.getElementById('messages').innerHTML = '';
}

function startDirectMessage(user) {
    clearSearchHighlights();
    const dmChannelId = [currentUser.id, user.id].sort().join('-');
    currentChannel = dmChannelId;
    
    // Update UI
    document.getElementById('current-channel').textContent = `@ ${user.username}`;
    document.getElementById('messages').innerHTML = '';
    
    // Remove active class from all channels
    document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
    
    // Join DM channel and request previous messages
    socket.emit('join channel', dmChannelId);
}

function showCreateChannelPrompt() {
    const channelName = prompt('Enter channel name:');
    if (channelName) {
        socket.emit('create channel', channelName);
    }
}

function showChatScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    document.getElementById('user-info').textContent = `${localStorage.getItem('username')}`;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    currentChannel = null;
    currentChannelName = 'general';
    currentUser = null;
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('chat-screen').style.display = 'none';
    document.getElementById('messages').innerHTML = '';
}

// Handle sending messages
document.getElementById('message-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (message && socket && currentChannel) {
        console.log('Sending message to channel:', currentChannel);
        
        // Show loading indicator if it's an AI query
        if (message.startsWith('/askAI ')) {
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'message loading';
            loadingMessage.innerHTML = `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <span>AI is thinking...</span>
                </div>
            `;
            document.getElementById('messages').appendChild(loadingMessage);
        }
        
        socket.emit('chat message', {
            channelId: currentChannel,
            text: message
        });
        input.value = '';
    }
});

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
}

function addMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.dataset.messageId = message.id;
    
    let fileAttachment = '';
    if (message.fileUrl) {
        if (message.fileType?.startsWith('image/')) {
            fileAttachment = `
                <div class="file-attachment">
                    <img src="${message.fileUrl}" alt="Attached image" class="message-image" 
                         onclick="window.open('${message.fileUrl}', '_blank')">
                    <div class="file-info">
                        <span class="file-name">${message.fileName}</span>
                    </div>
                </div>
            `;
        } else {
            fileAttachment = `
                <div class="file-attachment">
                    <a href="${message.fileUrl}" target="_blank" class="file-link">
                        <span class="file-icon">${getFileIcon(message.fileType)}</span>
                        <span class="file-name">${message.fileName}</span>
                    </a>
                </div>
            `;
        }
    }

    // Add delete button if user owns the message
    const deleteButton = message.userId === currentUser.id ? 
        `<button class="delete-btn" onclick="deleteMessage('${message.id}')">🗑️</button>` : '';

    messageElement.innerHTML = `
        <div class="message-header">
            <span class="user">${message.username}</span>
            <span class="time">${formatTime(message.createdAt)}</span>
            ${deleteButton}
        </div>
        <div class="text">${message.text}</div>
        ${fileAttachment}
        <button class="add-reaction-btn" onclick="showEmojiPicker('${message.id}', event)">😊</button>
        <div class="message-reactions"></div>
        <div class="message-actions">
            <button class="thread-btn" onclick="openThread('${message.id}')">
                ${message.replyCount ? `${message.replyCount} ${message.replyCount === 1 ? 'reply' : 'replies'}` : 'Reply in thread'}
            </button>
        </div>
    `;
    
    // Only add to main chat if it's not a thread reply
    if (!message.parentId) {
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    if (message.reactions) {
        updateMessageReactions(message.id, message.reactions);
    }
}

// Helper function to get appropriate icon for file type
function getFileIcon(mimeType) {
    const iconMap = {
        'application/pdf': '📄',
        'application/msword': '📝',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
        'text/plain': '📝',
        'image/jpeg': '🖼️',
        'image/png': '🖼️',
        'image/gif': '🖼️'
    };
    return iconMap[mimeType] || '📎';
}

// File upload handling
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        e.target.value = '';
        return;
    }

    // Show loading indicator
    const messageInput = document.getElementById('message-input');
    const originalPlaceholder = messageInput.placeholder;
    messageInput.placeholder = 'Uploading file...';
    messageInput.disabled = true;

    try {
        // Create FormData and append file
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || 'Upload failed');
        }
        
        const data = await response.json();
        console.log('File uploaded successfully:', data);
        
        // Send file message
        socket.emit('chat message', {
            channelId: currentChannel,
            text: `Shared a file: ${file.name}`,
            fileUrl: data.url,
            fileType: data.type,
            fileName: data.name,
            parentId: currentThreadId || null // Support for thread replies
        });

        // Clear the input
        e.target.value = '';
    } catch (error) {
        console.error('File upload error:', error);
        alert(error.message || 'Failed to upload file');
    } finally {
        // Restore input state
        messageInput.placeholder = originalPlaceholder;
        messageInput.disabled = false;
    }
});

// Check if user is already logged in
const token = localStorage.getItem('token');
if (token) {
    loginSuccess({
        token,
        username: localStorage.getItem('username')
    });
} else {
    showTab('login');
}

// Add new search functions
function searchUsers(event) {
    const searchTerm = event.target.value.toLowerCase();
    const searchResults = document.getElementById('search-results');
    
    if (!searchTerm) {
        searchResults.style.display = 'none';
        return;
    }

    const filteredUsers = allUsers.filter(user => 
        user.id !== currentUser.id && // Don't show current user
        user.username.toLowerCase().includes(searchTerm)
    );

    if (filteredUsers.length > 0) {
        searchResults.innerHTML = filteredUsers
            .map(user => `
                <div class="search-result-item" onclick="startDirectMessage(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                    ${user.username}
                </div>
            `).join('');
        searchResults.style.display = 'block';
    } else {
        searchResults.innerHTML = '<div class="search-result-item">No users found</div>';
        searchResults.style.display = 'block';
    }
}

// Close search results when clicking outside
document.addEventListener('click', (event) => {
    const searchResults = document.getElementById('search-results');
    const userSearch = document.getElementById('user-search');
    
    if (!searchResults.contains(event.target) && event.target !== userSearch) {
        searchResults.style.display = 'none';
    }
});

// Add message search function
function searchMessages(event) {
    const searchTerm = event.target.value.toLowerCase();
    const messages = document.querySelectorAll('.message');
    
    messages.forEach(message => {
        const messageText = message.querySelector('.text').textContent.toLowerCase();
        const messageUser = message.querySelector('.user').textContent.toLowerCase();
        const isMatch = messageText.includes(searchTerm) || messageUser.includes(searchTerm);
        
        message.classList.toggle('highlighted', isMatch && searchTerm !== '');
        
        // Scroll to first match
        if (isMatch && searchTerm !== '') {
            const firstMatch = document.querySelector('.message.highlighted');
            if (firstMatch === message) {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
}

// Clear search highlights when switching channels
function clearSearchHighlights() {
    document.querySelectorAll('.message.highlighted').forEach(message => {
        message.classList.remove('highlighted');
    });
    const searchInput = document.getElementById('message-search');
    if (searchInput) {
        searchInput.value = '';
    }
}

// Add common emojis
const commonEmojis = ['👍', '❤️', '😊', '😂', '🎉', '👏', '🚀', '💯'];

// Add emoji picker to document body
const emojiPicker = document.createElement('div');
emojiPicker.className = 'emoji-picker';
emojiPicker.innerHTML = commonEmojis.map(emoji => 
    `<button class="emoji-btn" data-emoji="${emoji}">${emoji}</button>`
).join('');
document.body.appendChild(emojiPicker);

// Handle emoji button clicks
emojiPicker.addEventListener('click', (e) => {
    const emojiBtn = e.target.closest('.emoji-btn');
    if (!emojiBtn) return;

    const emoji = emojiBtn.dataset.emoji;
    const messageId = emojiPicker.dataset.messageId;
    
    if (messageId && emoji) {
        socket.emit('add reaction', {
            messageId,
            emoji,
            channelId: currentChannel
        });
    }
    
    emojiPicker.classList.remove('show');
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-picker') && !e.target.closest('.add-reaction-btn')) {
        emojiPicker.classList.remove('show');
    }
});

function updateMessageReactions(messageId, reactions) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const reactionsContainer = messageElement.querySelector('.message-reactions');
    if (!reactionsContainer) return;

    reactionsContainer.innerHTML = Object.entries(reactions).map(([emoji, users]) => {
        // Check if the current user's username is in the users array
        const isActive = users.includes(currentUser.username);
        return `
            <div class="reaction ${isActive ? 'active' : ''}" 
                 onclick="toggleReaction('${messageId}', '${emoji}')">
                ${emoji} ${users.length}
            </div>
        `;
    }).join('');
}

function toggleReaction(messageId, emoji) {
    socket.emit('add reaction', {
        messageId,
        emoji,
        channelId: currentChannel
    });
}

function showEmojiPicker(messageId, event) {
    const rect = event.target.getBoundingClientRect();
    emojiPicker.style.top = `${rect.bottom + 5}px`;
    emojiPicker.style.left = `${rect.left}px`;
    emojiPicker.dataset.messageId = messageId;
    emojiPicker.classList.add('show');
    event.stopPropagation();
}

function openThread(messageId) {
    const threadView = document.getElementById('thread-view');
    const parentMessage = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!parentMessage) return;
    
    // Clear previous thread messages
    document.getElementById('thread-messages').innerHTML = '';
    
    // Set current thread ID
    currentThreadId = messageId;
    
    // Show thread view
    threadView.style.display = 'flex';
    
    // Display parent message
    const parentMessageDiv = document.getElementById('parent-message');
    parentMessageDiv.innerHTML = '';
    parentMessageDiv.className = 'message parent-message';
    parentMessageDiv.innerHTML = `
        <span class="user">${parentMessage.querySelector('.user').textContent}</span>
        <span class="time">${parentMessage.querySelector('.time').textContent}</span>
        <div class="text">${parentMessage.querySelector('.text').textContent}</div>
        <div class="message-reactions">${parentMessage.querySelector('.message-reactions').innerHTML}</div>
    `;
    
    // Get thread messages
    socket.emit('get thread', {
        parentId: messageId,
        channelId: currentChannel
    });
}

function closeThread() {
    document.getElementById('thread-view').style.display = 'none';
    currentThreadId = null;
}

function addThreadMessage(message) {
    const threadMessages = document.getElementById('thread-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message thread-reply';
    messageElement.dataset.messageId = message.id;
    
    let fileAttachment = '';
    if (message.fileUrl) {
        if (message.fileType?.startsWith('image/')) {
            fileAttachment = `
                <div class="file-attachment">
                    <img src="${message.fileUrl}" alt="Attached image" class="message-image" 
                         onclick="window.open('${message.fileUrl}', '_blank')">
                    <div class="file-info">
                        <span class="file-name">${message.fileName}</span>
                    </div>
                </div>
            `;
        } else {
            fileAttachment = `
                <div class="file-attachment">
                    <a href="${message.fileUrl}" target="_blank" class="file-link">
                        <span class="file-icon">${getFileIcon(message.fileType)}</span>
                        <span class="file-name">${message.fileName}</span>
                    </a>
                </div>
            `;
        }
    }
    
    // Add delete button if user owns the message
    const deleteButton = message.userId === currentUser.id ? 
        `<button class="delete-btn" onclick="deleteMessage('${message.id}')">🗑️</button>` : '';
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="user">${message.username}</span>
            <span class="time">${formatTime(message.createdAt)}</span>
            ${deleteButton}
        </div>
        <div class="text">${message.text}</div>
        ${fileAttachment}
        <button class="add-reaction-btn" onclick="showEmojiPicker('${message.id}', event)">😊</button>
        <div class="message-reactions"></div>
    `;
    
    threadMessages.appendChild(messageElement);
    threadMessages.scrollTop = threadMessages.scrollHeight;
    
    if (message.reactions) {
        updateMessageReactions(message.id, message.reactions);
    }
}

// Add thread message form handler
document.getElementById('thread-message-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('thread-message-input');
    const message = input.value.trim();
    
    if (message && socket && currentThreadId) {
        socket.emit('chat message', {
            channelId: currentChannel,
            text: message,
            parentId: currentThreadId
        });
        input.value = '';
    }
});

function updateThreadIndicator(messageId) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!message) return;
    
    const threadBtn = message.querySelector('.thread-btn');
    if (!threadBtn) return;
    
    const channelMessages = Array.from(document.querySelectorAll('.message'));
    const replyCount = channelMessages.filter(msg => 
        msg.dataset.parentId === messageId
    ).length;
    
    threadBtn.textContent = replyCount ? `${replyCount} replies` : 'Reply in thread';
}

// Add delete message function
function deleteMessage(messageId) {
    if (confirm('Are you sure you want to delete this message?')) {
        socket.emit('delete message', { messageId });
    }
} 