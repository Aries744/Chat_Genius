# Chat Application Documentation

## Project Structure
```
project/
├── docs/                # Documentation files
├── lib/                 # Library code
├── prisma/             # Prisma schema and migrations
│   └── schema.prisma   # Database schema
├── public/             # Public assets and client-side code
│   ├── uploads/        # File upload storage
│   ├── app.js         # Client-side JavaScript
│   ├── index.html     # Main HTML file
│   └── style.css      # CSS styles
├── server.js           # Main server file
├── package.json        # Project dependencies
├── .env               # Environment variables
└── .gitignore         # Git ignore rules
```

## Core Components

### 1. Server (`server.js`)
- **Purpose**: Main application server
- **Technologies**:
  - Express.js (Web server)
  - Socket.IO (Real-time communication)
  - JWT (Authentication)
  - Multer (File uploads)
- **Key Features**:
  - User authentication
  - Real-time messaging
  - File upload handling
  - Channel management
  - Message threading
  - Emoji reactions

### 2. Client-Side (`public/`)

#### 2.1 HTML (`public/index.html`)
- **Purpose**: Main user interface
- **Components**:
  - Authentication forms (Login/Register/Guest)
  - Chat interface
  - Channel list
  - User list
  - Message input
  - File upload
  - Thread view
  - Emoji picker

#### 2.2 JavaScript (`public/app.js`)
- **Purpose**: Client-side functionality
- **Key Features**:
  - Socket.IO client
  - Authentication handling
  - Message sending/receiving
  - File upload handling
  - Channel switching
  - User search
  - Message threading
  - Emoji reactions
  - Real-time updates

#### 2.3 CSS (`public/style.css`)
- **Purpose**: Application styling
- **Key Components**:
  - Layout structure
  - Chat interface
  - Message styling
  - Channel list
  - User list
  - Thread view
  - Responsive design
  - Animations

#### 2.4 Uploads (`public/uploads/`)
- **Purpose**: Store uploaded files
- **Features**:
  - File storage
  - Gitignored except for .gitkeep

## Data Storage

### PostgreSQL Database
- **Purpose**: Persistent data storage for the application
- **Location**: Local PostgreSQL server
- **Connection**: Configured via `.env` file with connection string
- **Schema**: Managed by Prisma ORM

### Database Management
```bash
# Reset database (clear all data but keep structure)
npx prisma migrate reset --force

# View database contents
npx prisma studio

# Update database schema
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Data Models

#### User Model
```prisma
model User {
    id        String   @id @default(uuid())
    username  String   @unique
    password  String
    isGuest   Boolean  @default(false)
    messages  Message[]
    reactions Reaction[]
}
```

#### Message Model
```prisma
model Message {
    id        String   @id @default(uuid())
    text      String
    userId    String
    user      User     @relation(fields: [userId], references: [id])
    channelId String
    channel   Channel  @relation(fields: [channelId], references: [id])
    createdAt DateTime @default(now())
    fileUrl   String?
    fileType  String?
    parentId  String?  // For thread messages
    reactions Reaction[]
}
```

#### Channel Model
```prisma
model Channel {
    id       String   @id @default(uuid())
    name     String   @unique
    type     String   // 'channel' or 'dm'
    messages Message[]
    users    ChannelUser[]
}
```

### Storage Considerations
1. **Database Size**
   - Messages and files accumulate over time
   - Regular maintenance may be needed
   - Consider implementing data retention policies

2. **File Storage**
   - Uploaded files stored in `public/uploads/`
   - Files persist on local disk
   - Consider implementing cleanup for unused files

3. **Backup**
   - Regular database backups recommended
   - File system backups for uploaded content
   - Consider implementing automated backup solutions

### Maintenance Tasks
1. **Database Cleanup**
   - Use `npx prisma migrate reset` to clear all data
   - Implement data archiving for old messages
   - Regular performance optimization

2. **File Management**
   - Monitor disk space usage
   - Implement file cleanup policies
   - Consider cloud storage solutions for scalability

## Environment Variables
```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp?schema=public"
```

## Dependencies
```json
{
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "latest",
    "dotenv": "^16.4.7"
}
```

## Features

### 1. Authentication
- JWT-based authentication
- Three access types:
  - Register
  - Login
  - Guest access

### 2. Real-time Messaging
- Instant message delivery
- Message history
- Channel & direct messages
- Message threading

### 3. File Sharing
- Support for multiple file types
- 5MB size limit
- Automatic file type detection
- File preview in chat

### 4. User Management
- Online/offline status
- User search
- Guest user support
- User list

### 5. Channels
- Public channels
- Direct messages
- Channel creation
- Channel switching

### 6. Message Features
- Emoji reactions
- Message threading
- File attachments
- Message search

## Security Features
- JWT authentication
- File upload restrictions
- Input sanitization
- Secure websocket connections

## Limitations
- Basic error handling
- No message encryption
- No user profiles
- No message editing/deletion
- No rate limiting

## Future Improvements
1. Implement message encryption
2. Add user profiles
3. Add message editing/deletion
4. Implement rate limiting
5. Add file type validation
6. Add backup system
7. Add user roles and permissions 