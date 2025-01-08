let socket = null;
let currentChannel = 'general';
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
        allUsers = data.users;
        updateChannelsList(data.channels);
        updateUsersList(data.users);
    });

    socket.on('previous messages', (data) => {
        if (data.channelId === currentChannel) {
            document.getElementById('messages').innerHTML = '';
            data.messages.forEach(addMessage);
        }
    });

    socket.on('chat message', (data) => {
        if (data.channelId === currentChannel) {
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
        updateMessageReactions(data.messageId, data.reactions);
    });

    socket.on('thread_updated', (data) => {
        // Update thread view if open
        if (currentThreadId === data.parentId) {
            addThreadMessage(data.reply);
        }
        // Update reply count in main view
        updateThreadIndicator(data.parentId);
    });
}

function updateChannelsList(channels) {
    const channelsList = document.getElementById('channels-list');
    channelsList.innerHTML = '';
    channels.forEach(addChannel);
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

function switchChannel(channelId) {
    clearSearchHighlights();
    // Update UI
    document.querySelectorAll('.channel').forEach(ch => {
        ch.classList.toggle('active', ch.textContent.includes(channelId));
    });
    document.getElementById('current-channel').textContent = `# ${channelId}`;
    document.getElementById('messages').innerHTML = '';
    
    // Switch channel
    currentChannel = channelId;
    socket.emit('join channel', channelId);
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
    currentChannel = 'general';
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
    
    if (message && socket) {
        if (currentChannel.includes('-')) {
            // Direct message
            const [user1, user2] = currentChannel.split('-');
            const targetUserId = user1 === currentUser.id ? user2 : user1;
            socket.emit('direct message', {
                targetUserId,
                text: message
            });
        } else {
            // Channel message
            socket.emit('chat message', {
                channelId: currentChannel,
                text: message
            });
        }
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

    // Check if it's a file message
    if (message.text.startsWith('[FILE]')) {
        const fileName = message.text.replace('[FILE] ', '');
        const fileExtension = fileName.split('.').pop().toUpperCase();
        const fileIcon = getFileIcon(fileExtension);
        
        messageElement.innerHTML = `
            <span class="user">${message.user}</span>
            <span class="time">${formatTime(message.time)}</span>
            <div class="file-message">
                <div class="file-icon" title="${fileExtension}">${fileIcon}</div>
                <a href="${message.fileUrl}" target="_blank" download>
                    ${fileName}
                    <span class="file-size">${message.fileSize || ''}</span>
                </a>
            </div>
            <button class="add-reaction-btn" onclick="showEmojiPicker('${message.id}', event)">😊</button>
            <div class="message-reactions"></div>
            <div class="message-actions">
                <button class="thread-btn" onclick="openThread('${message.id}')">
                    ${message.replies?.length ? `${message.replies.length} replies` : 'Reply in thread'}
                </button>
            </div>
        `;
    } else {
        messageElement.innerHTML = `
            <span class="user">${message.user}</span>
            <span class="time">${formatTime(message.time)}</span>
            <div class="text">${message.text}</div>
            <button class="add-reaction-btn" onclick="showEmojiPicker('${message.id}', event)">😊</button>
            <div class="message-reactions"></div>
            <div class="message-actions">
                <button class="thread-btn" onclick="openThread('${message.id}')">
                    ${message.replies?.length ? `${message.replies.length} replies` : 'Reply in thread'}
                </button>
            </div>
        `;
    }

    // Don't append if it's a reply and we're not in a thread
    if (!message.parentId || message.id === currentThreadId) {
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Update reactions if any exist
    if (message.reactions) {
        updateMessageReactions(message.id, message.reactions);
    }
}

// Helper function to get appropriate icon for file type
function getFileIcon(extension) {
    const iconMap = {
        'PDF': '📄',
        'DOC': '📝',
        'DOCX': '📝',
        'XLS': '📊',
        'XLSX': '📊',
        'TXT': '📝',
        'JPG': '🖼️',
        'JPEG': '🖼️',
        'PNG': '🖼️',
        'GIF': '🖼️',
        'ZIP': '📦',
        'RAR': '📦',
        'MP3': '🎵',
        'MP4': '🎥',
        'AVI': '🎥',
        'MOV': '🎥'
    };
    return iconMap[extension] || '📎';
}

// Update file upload handler
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        e.target.value = '';
        return;
    }

    // Create FormData and append file
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        
        // Format file size
        const fileSize = formatFileSize(file.size);
        
        // Send file message
        if (currentChannel.includes('-')) {
            // Direct message
            const [user1, user2] = currentChannel.split('-');
            const targetUserId = user1 === currentUser.id ? user2 : user1;
            socket.emit('direct message', {
                targetUserId,
                text: `[FILE] ${file.name}`,
                fileUrl: data.url,
                fileType: data.type,
                fileSize: fileSize
            });
        } else {
            // Channel message
            socket.emit('chat message', {
                channelId: currentChannel,
                text: `[FILE] ${file.name}`,
                fileUrl: data.url,
                fileType: data.type,
                fileSize: fileSize
            });
        }
    } catch (error) {
        alert('Failed to upload file');
    }

    // Clear the input
    e.target.value = '';
});

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
        socket.emit('add_reaction', {
            messageId,
            reaction: emoji,
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
        const isActive = users.includes(currentUser.id);
        return `
            <div class="reaction ${isActive ? 'active' : ''}" 
                 onclick="toggleReaction('${messageId}', '${emoji}')">
                ${emoji} ${users.length}
            </div>
        `;
    }).join('');
}

function toggleReaction(messageId, emoji) {
    socket.emit('add_reaction', {
        messageId,
        reaction: emoji,
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
    const parentMessage = document.querySelector(`[data-message-id="${messageId}"]`).cloneNode(true);
    
    // Clear previous thread messages
    document.getElementById('thread-messages').innerHTML = '';
    
    // Set current thread ID
    currentThreadId = messageId;
    
    // Show thread view
    threadView.style.display = 'flex';
    
    // Display parent message
    document.getElementById('parent-message').innerHTML = parentMessage.innerHTML;
    
    // Get thread messages
    const channelMessages = Array.from(document.querySelectorAll('.message'));
    const threadMessages = channelMessages.filter(msg => 
        msg.dataset.parentId === messageId
    );
    
    // Display thread messages
    threadMessages.forEach(msg => {
        addThreadMessage(JSON.parse(msg.dataset.messageData));
    });
}

function closeThread() {
    document.getElementById('thread-view').style.display = 'none';
    currentThreadId = null;
}

function addThreadMessage(message) {
    const threadMessages = document.getElementById('thread-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.dataset.messageId = message.id;
    
    messageElement.innerHTML = `
        <span class="user">${message.user}</span>
        <span class="time">${formatTime(message.time)}</span>
        <div class="text">${message.text}</div>
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