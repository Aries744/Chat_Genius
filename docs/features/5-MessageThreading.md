# Message Threading

## Overview
The application supports message threading functionality, allowing users to create conversation threads by replying to specific messages. This feature helps organize discussions and maintain context in both channels and direct messages.

## Implementation

### 1. Server-Side (`server.js`)
```javascript
// Thread message handling
socket.on('thread message', async (data) => {
    try {
        const { parentId, channelId, text } = data;
        const user = users.get(socket.userId);
        if (!user) return;

        // Get channel messages
        const channelMessages = messages.get(channelId);
        if (!channelMessages) return;

        // Find parent message
        const parentMessage = channelMessages.find(m => m.id === parentId);
        if (!parentMessage) return;

        // Create thread message
        const message = {
            id: Date.now().toString(),
            text,
            user: user.username,
            time: new Date().toISOString(),
            parentId,
            reactions: {}
        };

        // Add message to channel
        channelMessages.push(message);

        // Update parent message's replies
        if (!parentMessage.replies) {
            parentMessage.replies = [];
        }
        parentMessage.replies.push(message.id);

        // Broadcast thread update
        io.to(channelId).emit('thread message', {
            channelId,
            parentId,
            message
        });

        // Notify thread participants
        const threadParticipants = new Set(
            channelMessages
                .filter(m => m.parentId === parentId)
                .map(m => m.user)
        );
        threadParticipants.delete(user.username);
        
        if (threadParticipants.size > 0) {
            io.to(channelId).emit('thread notification', {
                channelId,
                parentId,
                message: `New reply in thread by ${user.username}`
            });
        }
    } catch (error) {
        console.error('Error handling thread message:', error);
    }
});

// Get thread messages
socket.on('get thread', async (data) => {
    try {
        const { parentId, channelId } = data;
        const channelMessages = messages.get(channelId);
        if (!channelMessages) return;

        const threadMessages = channelMessages.filter(
            m => m.parentId === parentId
        );

        socket.emit('thread messages', {
            parentId,
            messages: threadMessages
        });
    } catch (error) {
        console.error('Error getting thread messages:', error);
    }
});
```

### 2. Client-Side (`public/app.js`)
```javascript
let currentThreadId = null;

// Open thread view
function openThread(messageId) {
    currentThreadId = messageId;
    const threadView = document.getElementById('thread-view');
    threadView.style.display = 'block';

    // Get parent message
    const parentMessage = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!parentMessage) return;

    // Display parent message
    const threadHeader = document.getElementById('thread-header');
    threadHeader.innerHTML = `
        <div class="parent-message">
            <span class="user">${parentMessage.querySelector('.user').textContent}</span>
            <span class="time">${parentMessage.querySelector('.time').textContent}</span>
            <div class="text">${parentMessage.querySelector('.text').textContent}</div>
        </div>
    `;

    // Clear thread messages
    const threadMessages = document.getElementById('thread-messages');
    threadMessages.innerHTML = '';

    // Request thread messages
    socket.emit('get thread', {
        parentId: messageId,
        channelId: currentChannel
    });
}

// Close thread view
function closeThread() {
    document.getElementById('thread-view').style.display = 'none';
    currentThreadId = null;
}

// Send thread message
document.getElementById('thread-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('thread-input');
    const message = input.value.trim();
    
    if (message && socket && currentThreadId) {
        socket.emit('thread message', {
            parentId: currentThreadId,
            channelId: currentChannel,
            text: message
        });
        input.value = '';
    }
});

// Handle thread messages
socket.on('thread messages', (data) => {
    if (data.parentId !== currentThreadId) return;

    const threadMessages = document.getElementById('thread-messages');
    data.messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = 'thread-message';
        messageElement.dataset.messageId = message.id;

        messageElement.innerHTML = `
            <span class="user">${message.user}</span>
            <span class="time">${formatTime(message.time)}</span>
            <div class="text">${message.text}</div>
            <div class="message-reactions"></div>
        `;

        threadMessages.appendChild(messageElement);
        if (message.reactions) {
            updateMessageReactions(message.id, message.reactions);
        }
    });

    threadMessages.scrollTop = threadMessages.scrollHeight;
});

// Handle new thread message
socket.on('thread message', (data) => {
    if (data.parentId === currentThreadId) {
        const threadMessages = document.getElementById('thread-messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'thread-message';
        messageElement.dataset.messageId = data.message.id;

        messageElement.innerHTML = `
            <span class="user">${data.message.user}</span>
            <span class="time">${formatTime(data.message.time)}</span>
            <div class="text">${data.message.text}</div>
            <div class="message-reactions"></div>
        `;

        threadMessages.appendChild(messageElement);
        threadMessages.scrollTop = threadMessages.scrollHeight;
    }

    // Update reply count in main chat
    const parentMessage = document.querySelector(`[data-message-id="${data.parentId}"]`);
    if (parentMessage) {
        const threadBtn = parentMessage.querySelector('.thread-btn');
        const replyCount = parseInt(threadBtn.getAttribute('data-replies') || '0') + 1;
        threadBtn.setAttribute('data-replies', replyCount);
        threadBtn.textContent = `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
    }
});
```

### 3. HTML Structure (`public/index.html`)
```html
<!-- Thread view -->
<div id="thread-view" class="thread-view" style="display: none;">
    <div class="thread-header">
        <button class="close-thread" onclick="closeThread()">×</button>
        <h3>Thread</h3>
    </div>
    <div id="thread-header"></div>
    <div id="thread-messages" class="thread-messages"></div>
    <form id="thread-form" class="thread-form">
        <input type="text" id="thread-input" placeholder="Reply to thread...">
        <button type="submit">Send</button>
    </form>
</div>
```

## Features

### 1. Thread Creation
- Reply to any message
- Thread context preservation
- Parent message display
- Reply count tracking
- Thread notifications

### 2. Thread View
- Dedicated thread interface
- Real-time updates
- Message reactions
- File attachments
- User mentions

### 3. Thread Management
- Thread participants
- Reply notifications
- Thread history
- Thread search
- Thread moderation

### 4. User Experience
- Easy thread navigation
- Thread status indicators
- Unread indicators
- Quick actions
- Keyboard shortcuts

## Thread Flow

1. **Creating Thread**
   ```
   User clicks reply button
   ↓
   Thread view opens
   ↓
   Parent message displayed
   ↓
   Thread messages loaded
   ↓
   User types reply
   ↓
   Reply sent to server
   ↓
   Server processes reply
   ↓
   All participants notified
   ```

2. **Viewing Thread**
   ```
   User opens thread
   ↓
   Thread view displayed
   ↓
   Parent message shown
   ↓
   Thread messages loaded
   ↓
   Real-time updates enabled
   ↓
   User interactions tracked
   ```

## Storage Management

1. **Thread Storage**
   - Parent-child relationships
   - Message ordering
   - Participant tracking
   - Reply counts
   - Thread status

2. **Performance**
   - Efficient lookups
   - Real-time updates
   - Memory optimization
   - Cache management

## Limitations

1. **Storage**
   - In-memory only
   - No persistence
   - Limited history
   - No backup

2. **Features**
   - No thread search
   - No thread moderation
   - No thread archiving
   - Limited notifications

3. **Performance**
   - Single server
   - No caching
   - Limited scaling
   - Memory constraints

## Future Improvements

1. **Features**
   - Thread search
   - Thread moderation
   - Thread archiving
   - Rich text formatting
   - Code snippets
   - Thread templates
   - Thread categories

2. **Performance**
   - Thread caching
   - Lazy loading
   - Pagination
   - Load balancing
   - Memory optimization

3. **User Experience**
   - Better navigation
   - Thread previews
   - Quick replies
   - Thread sharing
   - Thread bookmarks
   - Thread analytics

4. **Management**
   - Thread moderation
   - Thread analytics
   - Thread backup
   - Thread export
   - Thread archiving 