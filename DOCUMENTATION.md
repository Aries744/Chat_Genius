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
  - Prisma (Database ORM)
- **Key Features**:
  - User authentication
  - Real-time messaging
  - File upload handling
  - Channel management
  - Message threading
  - Thread notifications
  - Emoji reactions

### Message Threading Implementation
#### Server-Side
- **Thread Creation**:
  ```javascript
  // Message creation with thread support
  const message = await prisma.message.create({
      data: {
          text: msg.text,
          userId: socket.userId,
          channelId: msg.channelId,
          parentId: msg.parentId || null,
          fileUrl: msg.fileUrl,
          fileType: msg.fileType
      },
      include: {
          user: true,
          reactions: true,
          replies: true
      }
  });
  ```

- **Thread Retrieval**:
  ```javascript
  // Get thread messages
  const threadMessages = await prisma.message.findUnique({
      where: { id: parentId },
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
  ```

#### Client-Side
- **Thread UI**:
  ```javascript
  // Thread panel structure
  <div id="thread-view" class="thread-sidebar">
      <div class="thread-header">
          <h3>Thread</h3>
          <button class="close-thread-btn">×</button>
      </div>
      <div class="thread-content">
          <div id="parent-message"></div>
          <div id="thread-messages"></div>
      </div>
      <form id="thread-message-form">
          <input type="text" id="thread-message-input">
          <button type="submit">Reply</button>
      </form>
  </div>
  ```

- **Thread Events**:
  ```javascript
  // Open thread
  socket.emit('get thread', {
      parentId: messageId,
      channelId: currentChannel
  });

  // Send thread reply
  socket.emit('chat message', {
      channelId: currentChannel,
      text: message,
      parentId: currentThreadId
  });
  ```

#### Database Schema
```prisma
model Message {
    id        String     @id @default(uuid())
    text      String
    userId    String
    channelId String
    parentId  String?    // For thread replies
    fileUrl   String?
    fileType  String?
    createdAt DateTime   @default(now())
    parent    Message?   @relation("ThreadReplies", fields: [parentId], references: [id])
    replies   Message[]  @relation("ThreadReplies")
    user      User       @relation(fields: [userId], references: [id])
    reactions Reaction[]
}
```

### Thread Features
1. **Thread Creation**
   - Reply to any message
   - Support for text and files
   - Real-time notifications

2. **Thread View**
   - Dedicated thread panel
   - Parent message display
   - Chronological replies
   - Real-time updates

3. **Thread Interactions**
   - Emoji reactions
   - File attachments
   - Reply count tracking
   - Participant notifications

4. **Thread Management**
   - Thread history preservation
   - Real-time synchronization
   - Thread participant tracking
   - Thread status indicators

### Security Considerations
1. **Access Control**
   - Thread access verification
   - Channel membership checks
   - User authentication
   - File upload restrictions

2. **Data Protection**
   - SQL injection prevention
   - XSS protection
   - File type validation
   - Rate limiting

### Performance Optimization
1. **Database Queries**
   - Efficient thread loading
   - Pagination support
   - Relation preloading
   - Query optimization

2. **Real-time Updates**
   - Targeted event emission
   - Connection pooling
   - Memory management
   - Cache utilization

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

## Deployment

### AWS EC2 Deployment
The application is deployed on AWS EC2 with the following setup:

1. **Server**:
   - EC2 Instance running Amazon Linux 2023
   - Node.js v18.x
   - PostgreSQL 15
   - PM2 Process Manager

2. **Process Management**:
   - Using PM2 for application management
   - Auto-restart on crashes
   - Auto-start on system reboot

3. **Database**:
   - PostgreSQL running on the same instance
   - Database name: chatapp
   - User: chatapp

4. **Environment Variables**:
```env
PORT=3000
JWT_SECRET=your-production-secret
DATABASE_URL="postgresql://chatapp:chatapp2024@localhost:5432/chatapp?schema=public"
```

### Deployment Steps
1. **Initial Setup**:
```bash
# Connect to EC2
ssh -i deploy2.pem ec2-user@YOUR_IP

# Install dependencies
sudo dnf update -y
sudo dnf install -y nodejs postgresql15-server git

# Setup PostgreSQL
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Clone repository
git clone https://github.com/Aries744/Chat_Genius.git
cd Chat_Genius

# Install application dependencies
npm install

# Install and setup PM2
sudo npm install -g pm2
pm2 start server.js --name chat-app
pm2 startup
pm2 save
```

2. **Updating Application**:
```bash
# Connect to EC2
ssh -i deploy2.pem ec2-user@YOUR_IP

# Pull latest changes
cd Chat_Genius
git pull

# Install any new dependencies
npm install

# Restart application
pm2 restart chat-app
```

### Security Considerations
1. **Firewall Rules**:
   - Port 22 (SSH)
   - Port 3000 (Application)
   - Port 5432 (PostgreSQL) - internal only

2. **SSL/HTTPS**:
   - Currently using HTTP
   - Consider adding SSL certificate for HTTPS

3. **Database**:
   - Regular backups recommended
   - Monitor disk space
   - Implement cleanup policies
``` 

## Deployment Infrastructure

### AWS EC2 Setup
- **Instance Type**: t2.micro (or larger based on load)
- **Operating System**: Amazon Linux 2
- **Security Groups**:
  - HTTP (80) - For web traffic
  - HTTPS (443) - For secure web traffic
  - SSH (22) - For server access
  - Custom TCP (3000) - For application port

### Process Management
- **PM2**:
  - Manages application lifecycle
  - Handles crashes and restarts
  - Provides monitoring and logs
  - Ensures application starts on system reboot

### Database
- **PostgreSQL**:
  - Running on EC2 instance
  - Port: 5432
  - Configured with environment variables
  - Regular backups recommended

### Environment Configuration
```env
PORT=3000
JWT_SECRET=your-production-secret-key
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/chatapp?schema=public"
NODE_ENV=production
```

### Backup Strategy
1. **Database Backups**
```bash
# Create backup
pg_dump -U postgres chatapp > backup.sql

# Restore from backup
psql -U postgres chatapp < backup.sql
```

2. **Application Data**
- Regular backups of `/public/uploads`
- Environment variable backup
- PM2 configuration backup

### Monitoring
1. **Application Monitoring**
```bash
# View application status
pm2 status

# Monitor CPU/Memory
pm2 monit

# View logs
pm2 logs chat-app
```

2. **System Monitoring**
```bash
# View system resources
top
htop  # if installed

# View disk space
df -h

# View memory usage
free -m
```

### Security Considerations
1. **Firewall Rules**
   - Restrict SSH access to known IPs
   - Use security groups effectively
   - Keep ports minimal and necessary

2. **SSL/TLS**
   - Configure SSL certificate
   - Force HTTPS redirects
   - Secure WebSocket connections

3. **Database Security**
   - Regular security updates
   - Strong passwords
   - Restricted network access

4. **File Permissions**
   - Secure upload directory
   - Proper file ownership
   - Limited execution permissions
``` 
</rewritten_file>