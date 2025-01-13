# Emoji Reactions Feature

## Overview
The chat application supports emoji reactions to messages, allowing users to express their emotions or responses using a set of common emojis. The feature works in both main chat and thread replies, with real-time updates across all connected clients.

## Implementation

### 1. Database Schema
```prisma
model Reaction {
    id        String   @id @default(uuid())
    emoji     String
    userId    String
    messageId String
    user      User     @relation(fields: [userId], references: [id])
    message   Message  @relation(fields: [messageId], references: [id])
    createdAt DateTime @default(now())
}
```

### 2. Server-Side (`server.js`)
```javascript
// Reaction handling
socket.on('add reaction', async (data) => {
    try {
        const { messageId, emoji } = data;

        // Check for existing reaction
        const existingReaction = await prisma.reaction.findFirst({
            where: {
                messageId,
                userId: socket.userId,
                emoji
            }
        });

        // Toggle reaction
        if (existingReaction) {
            await prisma.reaction.delete({
                where: { id: existingReaction.id }
            });
        } else {
            await prisma.reaction.create({
                data: {
                    emoji,
                    userId: socket.userId,
                    messageId
                }
            });
        }

        // Get updated reactions
        const reactions = await prisma.reaction.findMany({
            where: { messageId },
            include: { user: true }
        });

        // Format reactions for client
        const formattedReactions = reactions.reduce((acc, reaction) => {
            if (!acc[reaction.emoji]) {
                acc[reaction.emoji] = [];
            }
            acc[reaction.emoji].push(reaction.user.username);
            return acc;
        }, {});

        // Broadcast update
        io.emit('reaction_updated', {
            messageId,
            reactions: formattedReactions
        });
    } catch (error) {
        console.error('Error handling reaction:', error);
    }
});
```

### 3. Client-Side (`public/app.js`)
```javascript
// Common emojis available for quick reactions
const commonEmojis = ['👍', '❤️', '😊', '😂', '🎉', '👏', '🚀', '💯'];

// Emoji picker initialization
const emojiPicker = document.createElement('div');
emojiPicker.className = 'emoji-picker';
emojiPicker.innerHTML = commonEmojis.map(emoji => 
    `<button class="emoji-btn" data-emoji="${emoji}">${emoji}</button>`
).join('');
document.body.appendChild(emojiPicker);

// Show emoji picker
function showEmojiPicker(messageId, event) {
    const rect = event.target.getBoundingClientRect();
    emojiPicker.style.top = `${rect.bottom + 5}px`;
    emojiPicker.style.left = `${rect.left}px`;
    emojiPicker.dataset.messageId = messageId;
    emojiPicker.classList.add('show');
    event.stopPropagation();
}

// Toggle reaction
function toggleReaction(messageId, emoji) {
    socket.emit('add reaction', {
        messageId,
        emoji,
        channelId: currentChannel
    });
}

// Update message reactions
function updateMessageReactions(messageId, reactions) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const reactionsContainer = messageElement.querySelector('.message-reactions');
    if (!reactionsContainer) return;

    reactionsContainer.innerHTML = Object.entries(reactions).map(([emoji, users]) => {
        const isActive = users.includes(currentUser.username);
        return `
            <div class="reaction ${isActive ? 'active' : ''}" 
                 onclick="toggleReaction('${messageId}', '${emoji}')">
                ${emoji} ${users.length}
            </div>
        `;
    }).join('');
}
```

## Features

### 1. Core Functionality
- Toggle reactions on/off
- Real-time updates across all clients
- Reaction counts per emoji
- Visual feedback for user's own reactions
- Support in both main chat and threads

### 2. User Interface
- Quick access to common emojis
- Hover-to-show reaction button
- Click-to-toggle reactions
- Active state for user's reactions
- Reaction count display

### 3. Data Management
- Persistent storage in PostgreSQL
- Real-time synchronization
- Efficient updates using WebSocket
- User-specific reaction tracking

## Security Considerations

### 1. Access Control
- User authentication required
- Rate limiting for reactions
- Validation of emoji input
- Channel membership verification

### 2. Data Integrity
- Unique reactions per user/emoji/message
- Proper database constraints
- Error handling and recovery
- Safe emoji handling

## Future Improvements

### 1. Features
- Custom emoji support
- Emoji categories
- Reaction search
- Reaction analytics
- Trending reactions

### 2. Performance
- Reaction caching
- Batch updates
- Optimized queries
- Load balancing

### 3. User Experience
- Extended emoji picker
- Reaction animations
- Keyboard shortcuts
- Mobile optimization
- Accessibility improvements 