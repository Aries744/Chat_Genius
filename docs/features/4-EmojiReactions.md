# Emoji Reactions

## Overview
The application supports emoji reactions to messages, allowing users to express their emotions or responses to messages using emojis. The feature is available for both channel messages and direct messages.

## Implementation

### 1. Server-Side (`server.js`)
```javascript
// Reaction handling
socket.on('add reaction', async (data) => {
    try {
        const { messageId, channelId, emoji } = data;
        const user = users.get(socket.userId);
        if (!user) return;

        // Get channel messages
        const channelMessages = messages.get(channelId);
        if (!channelMessages) return;

        // Find message and update reactions
        const message = channelMessages.find(m => m.id === messageId);
        if (!message) return;

        // Initialize reactions object if needed
        if (!message.reactions) {
            message.reactions = {};
        }
        if (!message.reactions[emoji]) {
            message.reactions[emoji] = new Set();
        }

        // Toggle user's reaction
        const userReactions = message.reactions[emoji];
        if (userReactions.has(user.username)) {
            userReactions.delete(user.username);
            if (userReactions.size === 0) {
                delete message.reactions[emoji];
            }
        } else {
            userReactions.add(user.username);
        }

        // Broadcast reaction update
        io.to(channelId).emit('reaction updated', {
            messageId,
            reactions: Object.fromEntries(
                Object.entries(message.reactions).map(([emoji, users]) => [
                    emoji,
                    Array.from(users)
                ])
            )
        });
    } catch (error) {
        console.error('Error handling reaction:', error);
    }
});
```

### 2. Client-Side (`public/app.js`)
```javascript
// Emoji picker initialization
const emojiPicker = new EmojiPicker({
    onSelect: (emoji) => {
        if (currentMessageId) {
            addReaction(currentMessageId, emoji);
        }
        hideEmojiPicker();
    }
});

// Show emoji picker
function showEmojiPicker(messageId, event) {
    currentMessageId = messageId;
    const picker = document.getElementById('emoji-picker');
    picker.style.display = 'block';
    picker.style.left = `${event.clientX}px`;
    picker.style.top = `${event.clientY}px`;
}

// Hide emoji picker
function hideEmojiPicker() {
    document.getElementById('emoji-picker').style.display = 'none';
    currentMessageId = null;
}

// Add reaction
function addReaction(messageId, emoji) {
    if (socket) {
        socket.emit('add reaction', {
            messageId,
            channelId: currentChannel,
            emoji
        });
    }
}

// Update message reactions
function updateMessageReactions(messageId, reactions) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const reactionsDiv = messageElement.querySelector('.message-reactions');
    reactionsDiv.innerHTML = '';

    Object.entries(reactions).forEach(([emoji, users]) => {
        const reactionElement = document.createElement('span');
        reactionElement.className = 'reaction';
        reactionElement.innerHTML = `
            ${emoji} <span class="reaction-count">${users.length}</span>
        `;
        reactionElement.title = users.join(', ');
        reactionElement.onclick = () => addReaction(messageId, emoji);
        reactionsDiv.appendChild(reactionElement);
    });
}

// Listen for reaction updates
socket.on('reaction updated', (data) => {
    updateMessageReactions(data.messageId, data.reactions);
});
```

### 3. HTML Structure (`public/index.html`)
```html
<!-- Emoji picker container -->
<div id="emoji-picker" class="emoji-picker" style="display: none;">
    <!-- Emoji categories -->
    <div class="emoji-categories">
        <button onclick="showCategory('smileys')">😊</button>
        <button onclick="showCategory('people')">👋</button>
        <button onclick="showCategory('nature')">🌺</button>
        <button onclick="showCategory('food')">🍔</button>
        <button onclick="showCategory('activities')">⚽</button>
        <button onclick="showCategory('travel')">🚗</button>
        <button onclick="showCategory('objects')">💡</button>
        <button onclick="showCategory('symbols')">❤️</button>
        <button onclick="showCategory('flags')">🏁</button>
    </div>
    <!-- Emoji grid -->
    <div class="emoji-grid"></div>
</div>

<!-- Message reaction button -->
<button class="add-reaction-btn" onclick="showEmojiPicker('${message.id}', event)">
    😊
</button>
```

## Features

### 1. Emoji Selection
- Multiple emoji categories
- Frequently used emojis
- Emoji search
- Custom emoji support
- Emoji picker UI

### 2. Reaction Display
- Reaction counts
- User lists on hover
- Animated reactions
- Reaction grouping
- Real-time updates

### 3. User Interaction
- Toggle reactions
- Multiple reactions per message
- Reaction removal
- Quick reaction options
- Reaction history

### 4. Management
- Reaction limits
- Abuse prevention
- Performance optimization
- Data consistency

## Reaction Flow

1. **Adding Reaction**
   ```
   User clicks reaction button
   ↓
   Emoji picker shown
   ↓
   User selects emoji
   ↓
   Client sends reaction
   ↓
   Server processes reaction
   ↓
   Server updates message
   ↓
   Server broadcasts update
   ↓
   All users see new reaction
   ```

2. **Removing Reaction**
   ```
   User clicks existing reaction
   ↓
   Client sends removal
   ↓
   Server removes reaction
   ↓
   Server updates message
   ↓
   Server broadcasts update
   ↓
   All users see removal
   ```

## Storage Management

1. **Reaction Storage**
   - In-memory storage
   - User-based tracking
   - Efficient updates
   - Data consistency

2. **Performance**
   - Optimized updates
   - Batched broadcasts
   - Memory management
   - Cache utilization

## Limitations

1. **Storage**
   - In-memory only
   - No persistence
   - Limited history
   - No analytics

2. **Features**
   - Limited emoji set
   - No custom emojis
   - No reaction search
   - No reaction trends

3. **Performance**
   - Single server
   - No caching
   - Limited scaling
   - Memory constraints

## Future Improvements

1. **Features**
   - Custom emoji support
   - Reaction analytics
   - Trending reactions
   - Reaction search
   - Reaction suggestions
   - Reaction animations

2. **Performance**
   - Reaction caching
   - Optimized storage
   - Batch processing
   - Load balancing
   - Memory optimization

3. **User Experience**
   - Better emoji picker
   - Keyboard shortcuts
   - Reaction categories
   - Quick reactions
   - Reaction history

4. **Analytics**
   - Usage tracking
   - Popular reactions
   - User preferences
   - Trend analysis
   - Performance metrics 