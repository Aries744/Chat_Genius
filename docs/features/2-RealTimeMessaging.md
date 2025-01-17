# Real-Time Messaging

Chat Genius provides robust real-time messaging capabilities using Socket.IO, enabling instant communication between users. Messages are persisted in a PostgreSQL database for reliable storage and retrieval.

### Core Features

1. **Message Sending and Display**
   - Real-time message delivery
   - Message persistence in PostgreSQL
   - Support for text content and file attachments
   - Timestamps and user attribution

2. **Message Management**
   - Message deletion (owner only)
   - Message editing with edit history
   - Visual indicators for edited messages
   - Confirmation dialogs for deletions
   - Cascade deletion for threaded messages

3. **User Experience**
   - Real-time updates for all connected clients
   - Smooth transitions for edits and deletions
   - Hover interactions for message actions
   - Keyboard shortcuts (Escape to cancel edit)

4. **User Presence**
   - Real-time user list updates
   - Online/offline status tracking
   - Automatic status updates on connect/disconnect
   - Visual indicators for user status
   - User filtering in channel views

### Implementation Details

#### Server-Side (server.js)
```javascript
// User presence tracking
io.on('connection', async (socket) => {
    // Broadcast user online status
    io.emit('user status', {
        userId: socket.userId,
        isOnline: true
    });

    // Initialize with user list
    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
            isGuest: true
        }
    });

    socket.emit('initialize', {
        users,
        // ... other initialization data
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        io.emit('user status', {
            userId: socket.userId,
            isOnline: false
        });
    });
});
```

#### Client-Side (public/app.js)
```javascript
// User presence handling
socket.on('user status', (data) => {
    const user = allUsers.find(u => u.id === data.userId);
    if (user) {
        user.isOnline = data.isOnline;
        updateUsersList(allUsers);
    }
});

// Update users list UI
function updateUsersList(users) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    users
        .filter(user => user.id !== currentUser.id)
        .forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <span class="user-status ${user.isOnline ? 'online' : 'offline'}"></span>
                ${user.username}${user.isGuest ? ' (Guest)' : ''}
            `;
            usersList.appendChild(userElement);
        });
}
```

### Database Schema
```prisma
model User {
    id        String    @id @default(uuid())
    username  String    @unique
    isGuest   Boolean   @default(false)
    // ... other fields
}

model Message {
    id        String    @id @default(uuid())
    text      String
    userId    String
    channelId String
    // ... other fields
}
```

### Event Flow
1. User connects → Server broadcasts online status
2. Server sends complete user list on initialization
3. UI updates to show online/offline indicators
4. User disconnects → Server broadcasts offline status
5. All clients update their user lists accordingly 