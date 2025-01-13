# Chat Genius Documentation

## Architecture Overview

Chat Genius is a real-time chat application built with Node.js and Express, using Socket.IO for real-time communication and PostgreSQL for data persistence. The application is deployed on AWS EC2 and uses PM2 for process management.

### Core Components

1. **Server (server.js)**
   - Express.js web server
   - Socket.IO server for real-time events
   - JWT authentication middleware
   - File upload handling with Multer
   - API endpoints for user management and file uploads

2. **Database (PostgreSQL + Prisma)**
   - User management
   - Channel management
   - Message storage
   - Thread relationships
   - Reactions storage
   - File metadata storage

3. **Client (public/)**
   - Vanilla JavaScript implementation
   - Socket.IO client for real-time updates
   - Responsive CSS design
   - File upload handling
   - Thread management UI

## Data Storage

### Database Schema

```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  isGuest   Boolean  @default(false)
  messages  Message[]
  channels  ChannelUser[]
  reactions Reaction[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Channel {
  id        String   @id @default(uuid())
  name      String
  type      String   @default("channel")
  messages  Message[]
  users     ChannelUser[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Message {
  id        String   @id @default(uuid())
  text      String
  userId    String
  channelId String
  parentId  String?  @map("parent_id")
  fileUrl   String?  @map("file_url")
  fileType  String?  @map("file_type")
  fileName  String?  @map("file_name")
  user      User     @relation(fields: [userId], references: [id])
  channel   Channel  @relation(fields: [channelId], references: [id])
  parent    Message? @relation("ThreadReplies", fields: [parentId], references: [id])
  replies   Message[] @relation("ThreadReplies")
  reactions Reaction[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ChannelUser {
  id        String   @id @default(uuid())
  userId    String
  channelId String
  user      User     @relation(fields: [userId], references: [id])
  channel   Channel  @relation(fields: [channelId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, channelId])
}

model Reaction {
  id        String   @id @default(uuid())
  emoji     String
  userId    String
  messageId String
  user      User     @relation(fields: [userId], references: [id])
  message   Message  @relation(fields: [messageId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, messageId, emoji])
}
```

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chatgenius?schema=public"

# Authentication
JWT_SECRET=your-secure-secret-key

# File Upload
MAX_FILE_SIZE=5242880 # 5MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

## API Endpoints

### Authentication
- POST `/api/register` - Register new user
- POST `/api/login` - User login
- POST `/api/guest` - Guest access

### File Management
- POST `/upload` - Upload file
- GET `/uploads/:filename` - Retrieve uploaded file

## WebSocket Events

### Server Events
- `connection` - New client connection
- `disconnect` - Client disconnection
- `chat message` - New message
- `thread message` - New thread reply
- `reaction` - Message reaction
- `typing` - User typing indicator

### Client Events
- `chat message` - Send new message
- `thread message` - Send thread reply
- `reaction` - Add/remove reaction
- `typing` - Send typing indicator
- `join channel` - Join chat channel
- `leave channel` - Leave chat channel

## Security Features

1. **Authentication**
   - JWT-based authentication
   - Password hashing with bcrypt
   - Token expiration and refresh
   - Guest access limitations

2. **File Upload Security**
   - File type validation
   - File size limits
   - Secure file naming
   - Virus scanning (recommended)

3. **Data Protection**
   - Input sanitization
   - XSS prevention
   - SQL injection protection via Prisma
   - Rate limiting on API endpoints

## Deployment Infrastructure

### AWS EC2 Setup
- Instance Type: t2.micro (minimum)
- Operating System: Amazon Linux 2
- Security Groups:
  - HTTP (80)
  - HTTPS (443)
  - SSH (22)
  - Custom TCP (3000)

### Process Management (PM2)
```bash
# Start application
pm2 start server.js --name chat-genius

# View logs
pm2 logs chat-genius

# Monitor
pm2 monit

# Restart
pm2 restart chat-genius

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Database Backups
```bash
# Backup
pg_dump -U postgres chatgenius > backup.sql

# Restore
psql -U postgres chatgenius < backup.sql

# Automated daily backups
0 0 * * * pg_dump -U postgres chatgenius > /backups/chatgenius_$(date +\%Y\%m\%d).sql
```

### File Storage
- Location: `/public/uploads/`
- Regular backups
- Disk space monitoring
- Proper file permissions
- Optional: Consider AWS S3 for scalability

## Cleanup Policies

1. **Message Cleanup**
   - Archive messages older than 90 days
   - Remove unused file attachments
   - Clean up orphaned database records

2. **File Cleanup**
   - Remove temporary upload files
   - Delete unused file attachments
   - Monitor storage usage

3. **Session Cleanup**
   - Remove expired JWT tokens
   - Clean up disconnected socket sessions
   - Remove inactive guest accounts

## Monitoring

1. **Application Monitoring**
```bash
# View PM2 stats
pm2 monit

# Check logs
pm2 logs chat-genius

# System resources
htop
```

2. **Database Monitoring**
```bash
# Connection count
SELECT count(*) FROM pg_stat_activity;

# Database size
SELECT pg_size_pretty(pg_database_size('chatgenius'));

# Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

## Limitations and Future Improvements

1. **Current Limitations**
   - 5MB file size limit
   - Basic search functionality
   - No message editing
   - Limited channel management

2. **Planned Improvements**
   - Message search functionality
   - User profile customization
   - Message editing and deletion
   - Enhanced channel management
   - Voice/video chat integration
   - Mobile application
   - Message formatting (Markdown)
   - Integration with external services