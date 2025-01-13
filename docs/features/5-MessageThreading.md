# Message Threading Feature

## Overview
Message threading in Chat Genius allows users to create conversation threads from any message, enabling organized discussions and focused responses. The feature supports text messages, file attachments, and emoji reactions within threads.

## Implementation

### Database Schema
```prisma
model Message {
    id        String    @id @default(uuid())
    text      String
    userId    String
    channelId String
    parentId  String?   @map("parent_id")
    fileUrl   String?   @map("file_url")
    fileType  String?   @map("file_type")
    fileName  String?   @map("file_name")
    user      User      @relation(fields: [userId], references: [id])
    channel   Channel   @relation(fields: [channelId], references: [id])
    parent    Message?  @relation("ThreadReplies", fields: [parentId], references: [id])
    replies   Message[] @relation("ThreadReplies")
    reactions Reaction[]
    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
}
```

### Server-Side Implementation

#### Thread Message Creation
```javascript
socket.on('chat message', async (msg) => {
    try {
        const message = await prisma.message.create({
            data: {
                text: msg.text,
                userId: socket.userId,
                channelId: msg.channelId,
                parentId: msg.parentId || null,
                fileUrl: msg.fileUrl,
                fileType: msg.fileType,
                fileName: msg.fileName
            },
            include: {
                user: true,
                reactions: true,
                replies: true
            }
        });

        // Broadcast to channel
        io.to(msg.channelId).emit('chat message', message);

        // If it's a thread reply, emit thread update
        if (msg.parentId) {
            const threadMessages = await prisma.message.findUnique({
                where: { id: msg.parentId },
                include: {
                    user: true,
                    reactions: true,
                    replies: {
                        include: {
                            user: true,
                            reactions: true
                        }
                    }
                }
            });
            io.to(msg.channelId).emit('thread updated', threadMessages);
        }
    } catch (error) {
        console.error('Error creating message:', error);
        socket.emit('error', { message: 'Failed to create message' });
    }
});
```

### Client-Side Implementation

#### Thread UI Components
```html
<div id="thread-view" class="thread-sidebar">
    <div class="thread-header">
        <h3>Thread</h3>
        <button class="close-thread-btn" onclick="closeThread()">×</button>
    </div>
    <div class="thread-content">
        <div id="parent-message"></div>
        <div id="thread-messages"></div>
    </div>
    <form id="thread-message-form">
        <input type="text" id="thread-message-input" placeholder="Reply in thread...">
        <input type="file" id="thread-file-input" style="display: none">
        <button type="button" onclick="document.getElementById('thread-file-input').click()">📎</button>
        <button type="submit">Send</button>
    </form>
</div>
```

#### Thread Management
```javascript
let currentThreadId = null;

function openThread(messageId) {
    currentThreadId = messageId;
    const threadView = document.getElementById('thread-view');
    threadView.style.display = 'flex';
    document.body.classList.add('thread-open');
    
    // Load thread messages
    socket.emit('get thread', {
        messageId: messageId,
        channelId: currentChannel
    });
}

function closeThread() {
    currentThreadId = null;
    const threadView = document.getElementById('thread-view');
    threadView.style.display = 'none';
    document.body.classList.remove('thread-open');
}

// Handle thread messages
socket.on('thread messages', (data) => {
    const parentMessage = data.parent;
    const replies = data.replies;
    
    // Display parent message
    document.getElementById('parent-message').innerHTML = renderMessage(parentMessage);
    
    // Display replies
    const threadMessages = document.getElementById('thread-messages');
    threadMessages.innerHTML = '';
    replies.forEach(reply => {
        threadMessages.appendChild(renderMessage(reply));
    });
    
    threadMessages.scrollTop = threadMessages.scrollHeight;
});

// Send thread reply
document.getElementById('thread-message-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('thread-message-input');
    const message = input.value.trim();
    
    if (message && currentThreadId) {
        socket.emit('chat message', {
            channelId: currentChannel,
            text: message,
            parentId: currentThreadId
        });
        input.value = '';
    }
});
```

## Styling

### Thread Sidebar
```css
.thread-sidebar {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 300px;
    background: #fff;
    border-left: 1px solid #e1e1e1;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
}

.thread-header {
    padding: 15px;
    border-bottom: 1px solid #e1e1e1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
}

.thread-content {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.parent-message {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 15px;
    border-left: 3px solid #007bff;
}

.thread-reply {
    padding: 8px 12px;
    margin-left: 15px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #e1e1e1;
}
```

## Features

### Core Functionality
1. Thread Creation
   - Create thread from any message
   - Support for text and files
   - Emoji reactions in threads
   - Real-time updates

2. Thread View
   - Dedicated sidebar panel
   - Parent message display
   - Chronological replies
   - File attachment support

3. Thread Management
   - Open/close threads
   - Reply count tracking
   - Real-time updates
   - Thread notifications

### User Experience
1. Visual Feedback
   - Thread indicators
   - Reply counts
   - Loading states
   - Error handling

2. Interactions
   - Click to open thread
   - Easy thread navigation
   - File attachments
   - Emoji reactions

## Security Considerations

1. Access Control
   - Thread access verification
   - Channel membership checks
   - User authentication
   - Rate limiting

2. Data Protection
   - Input sanitization
   - XSS prevention
   - SQL injection protection
   - File upload security

## Limitations
- No thread search
- No thread pinning
- No thread archiving
- Basic notification system
- No thread moderation tools

## Future Improvements
1. Enhanced Features
   - Thread search
   - Thread pinning
   - Thread archiving
   - Rich text formatting
   - Thread bookmarks

2. User Experience
   - Thread previews
   - Improved notifications
   - Thread sorting options
   - Thread categories

3. Management Tools
   - Thread moderation
   - Thread analytics
   - Bulk actions
   - Thread templates 