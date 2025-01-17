# Real-Time Messaging

## Overview
The application implements real-time messaging using Socket.IO, supporting both channel messages and direct messages, with features like message threading and reactions.

## Implementation

### 1. Server-Side (`server.js`)
```javascript
// Message handling
socket.on('chat message', async (msg) => {
    try {
        const user = users.get(socket.userId);
        if (!user) return;

        const message = {
            id: Date.now().toString(),
            text: msg.text,
            user: user.username,
            time: new Date().toISOString(),
            reactions: {},
            fileUrl: msg.fileUrl,
            fileType: msg.fileType,
            parentId: msg.parentId || null,
            replies: []
        };

        // Store message
        const channelId = msg.channelId || 'general';
        if (!messages.has(channelId)) {
            messages.set(channelId, []);
        }
        const channelMessages = messages.get(channelId);
        
        // Handle threading
        if (message.parentId) {
            const parentMessage = channelMessages.find(m => m.id === message.parentId);
            if (parentMessage) {
                parentMessage.replies.push(message.id);
            }
        }

        channelMessages.push(message);
        
        // Message limit handling
        if (channelMessages.length > 50) {
            const rootMessages = channelMessages.filter(m => !m.parentId);
            if (rootMessages.length > 50) {
                const oldestRootMessage = rootMessages[0];
                const toRemove = new Set([oldestRootMessage.id, ...oldestRootMessage.replies]);
                messages.set(channelId, channelMessages.filter(m => !toRemove.has(m.id)));
            }
        }

        // Broadcast message
        io.to(channelId).emit('chat message', {
            channelId,
            message
        });

        // Thread update notification
        if (message.parentId) {
            io.to(channelId).emit('thread_updated', {
                parentId: message.parentId,
                reply: message
            });
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

// Direct message handling
socket.on('direct message', (data) => {
    const { targetUserId, text } = data;
    const dmChannelId = [socket.userId, targetUserId].sort().join('-');
    
    const message = {
        id: Date.now().toString(),
        text,
        user: user.username,
        time: new Date().toISOString()
    };

    // Store DM
    if (!messages.has(dmChannelId)) {
        messages.set(dmChannelId, []);
    }
    messages.get(dmChannelId).push(message);

    // Ensure both users are in the DM channel
    socket.join(dmChannelId);
    const targetSocket = io.sockets.sockets.get(targetUserId);
    if (targetSocket) {
        targetSocket.join(dmChannelId);
    }

    // Broadcast to DM channel
    io.to(dmChannelId).emit('chat message', {
        channelId: dmChannelId,
        message,
        isDM: true
    });
});
```

### 2. Client-Side (`public/app.js`)
```javascript
// Message sending
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

// Message display
function addMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.dataset.messageId = message.id;

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

    if (!message.parentId || message.id === currentThreadId) {
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    if (message.reactions) {
        updateMessageReactions(message.id, message.reactions);
    }
}
```

## Features

### 1. Channel Messages
- Public channel communication
- Message history preservation
- Real-time updates
- Message threading support
- Message deletion (owner only)

### 2. Direct Messages
- Private one-on-one communication
- Separate message history
- Real-time delivery
- Online status indication
- Message deletion support

### 3. Message Threading
- Reply to specific messages
- Thread view
- Reply count tracking
- Real-time thread updates
- Cascade deletion of replies

### 4. Message Display
- Username display
- Timestamp
- Reaction support
- Thread indicators
- File attachments
- Delete button (owner only)
- Hover interactions

### 5. User List
- Real-time online status
- User filtering (excludes current user)
- Guest user indication
- Click to start DM
- Status indicators (online/offline)

## Message Flow

1. **Channel Messages**
   ```
   User types message
   ↓
   Socket.emit('chat message')
   ↓
   Server processes message
   ↓
   Server stores message
   ↓
   Server broadcasts to channel
   ↓
   All channel users receive update
   ```

2. **Direct Messages**
   ```
   User selects recipient
   ↓
   Socket.emit('direct message')
   ↓
   Server creates/uses DM channel
   ↓
   Server stores message
   ↓
   Server broadcasts to both users
   ↓
   Both users receive update
   ```

3. **Message Deletion**
   ```
   User clicks delete button
   ↓
   Confirmation dialog
   ↓
   Socket.emit('delete message')
   ↓
   Server verifies ownership
   ↓
   Server deletes message and reactions
   ↓
   Server deletes thread replies (if parent)
   ↓
   Server broadcasts deletion
   ↓
   All users remove message
   ```

## Storage Management

1. **Message Storage**
   - PostgreSQL database storage
   - Channel-based organization
   - Thread preservation logic
   - Reaction storage
   - Cascade deletion support

2. **Channel Organization**
   - Public channels
   - DM channels (user1-user2 format)
   - Message threading structure
   - User presence tracking

## User Management

1. **User List**
   - Real-time user status updates
   - Automatic filtering
   - Guest user handling
   - Direct message initiation
   - Status broadcasting

2. **Status Updates**
   - Connection events
   - Disconnection handling
   - Status broadcasting
   - Online/offline indicators
   - Real-time updates

## Limitations

1. **Message Management**
   - No message editing
   - No scheduled deletion
   - No message pinning
   - No read receipts
   - No typing indicators

2. **User Features**
   - Basic status indicators
   - No user profiles
   - No user groups
   - No user roles
   - No user blocking

3. **Performance**
   - Limited message history
   - No message pagination
   - No lazy loading

## Future Improvements

1. **Message Features**
   - Message editing
   - Scheduled deletion
   - Read receipts
   - Typing indicators
   - Rich text formatting
   - Code snippet support
   - Link previews
   - Message pinning

2. **User Features**
   - Enhanced user profiles
   - User roles and permissions
   - User groups
   - User blocking
   - Status messages
   - User search
   - Last seen time

3. **Performance**
   - Message pagination
   - Lazy loading
   - Message caching
   - Optimistic updates

4. **Storage**
   - Message backup
   - Message search
   - Message analytics
   - User analytics

5. **User Experience**
   - Offline support
   - Message queuing
   - Delivery confirmation
   - Message scheduling
   - Enhanced status indicators
   - User typing preview
   - Read receipts 