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

### Implementation Details

#### Server-Side (server.js)
```javascript
// Message event handlers
socket.on('chat message', async (data) => {
    // Handle new message creation
});

socket.on('edit message', async (data) => {
    // Verify message ownership
    // Store edit history
    // Update message content
    // Broadcast to all clients
});

socket.on('delete message', async (data) => {
    // Verify message ownership
    // Handle cascade deletion for threads
    // Remove message and associated data
    // Notify all clients
});
```

#### Client-Side (public/app.js)
```javascript
// Message display and interaction
socket.on('message updated', (message) => {
    // Update message in UI
    // Show edit indicator
    // Update reactions if changed
});

socket.on('message deleted', (data) => {
    // Remove message from UI
    // Handle thread cleanup if needed
});
```

### Database Schema
```prisma
model Message {
    id          String       @id @default(uuid())
    text        String
    userId      String
    channelId   String
    editedAt    DateTime?
    editHistory MessageEdit[]
    // ... other fields
}

model MessageEdit {
    id        String   @id @default(uuid())
    messageId String
    oldText   String
    newText   String
    editedAt  DateTime @default(now())
    editedBy  String
    // ... relations
}
```

### Security Considerations
- Message ownership verification for edits and deletions
- Edit history tracking for accountability
- Proper error handling and user feedback
- Real-time validation of user permissions

### Limitations
- Only message owners can edit or delete messages
- Edit history is permanent and cannot be modified
- Deleted messages cannot be recovered
- Thread messages are deleted when parent is deleted 