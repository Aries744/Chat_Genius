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
   - RAG pipeline for AI-powered chat assistance

2. **Database (PostgreSQL + Prisma)**
   - User management
   - Channel management
   - Message storage
   - Thread relationships
   - Reactions storage
   - File metadata storage
   - Message embeddings storage

3. **Vector Database (Pinecone)**
   - Storage for message embeddings
   - Semantic search capabilities
   - Real-time vector similarity search
   - Metadata storage for messages

4. **AI Integration (OpenAI)**
   - Text embeddings generation
   - Context-aware response generation
   - Natural language understanding

5. **Client (public/)**
   - Vanilla JavaScript implementation
   - Socket.IO client for real-time updates
   - Responsive CSS design
   - File upload handling
   - Thread management UI

## RAG Pipeline

### Overview
The Retrieval Augmented Generation (RAG) pipeline enables AI-powered chat assistance by combining message history with OpenAI's language models. The system provides real-time feedback with loading indicators and automatic thread management.

### Components

1. **Message Embedding**
   ```prisma
   model MessageEmbedding {
     id        String   @id @default(uuid())
     messageId String   @unique
     message   Message  @relation(fields: [messageId], references: [id])
     vector    Bytes    // Store the embedding vector
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     @@index([messageId])
   }
   ```

2. **Vector Storage**
   - Platform: Pinecone
   - Index Configuration:
     - Dimensions: 1536 (OpenAI embedding size)
     - Metric: Cosine Similarity
     - Environment: Serverless
   - Metadata Storage:
     - Message text
     - Username
     - Timestamp

3. **AI Models**
   - Embedding Model: text-embedding-3-small
   - Chat Model: gpt-4-turbo-preview
   - Use Cases:
     - Message embedding generation
     - Context-aware response generation

### Pipeline Flow

1. **Message Processing**
   - New messages are automatically embedded
   - Embeddings are stored in both PostgreSQL and Pinecone
   - Metadata is attached for context preservation
   - Real-time UI feedback during processing

2. **Query Processing**
   - User queries via `/askAI` command
   - Loading indicator shows "AI is thinking..."
   - Query is embedded using the same model
   - Similar messages are retrieved from Pinecone
   - Context is constructed from retrieved messages

3. **Response Generation**
   - Retrieved context is formatted
   - OpenAI generates contextual response
   - Response is delivered in real-time
   - Thread automatically opens to show response
   - Loading indicator is removed

### User Experience

1. **Visual Feedback**
   - Loading spinner during AI processing
   - "AI is thinking..." status message
   - Automatic thread opening for responses
   - Smooth transitions and animations

2. **Thread Management**
   - AI responses automatically create threads
   - Original question remains visible in main chat
   - Response appears as a threaded reply
   - Thread opens automatically for context

3. **Command Interface**
   ```
   /askAI What was discussed about feature X?
   ```
   - Command appears immediately in chat
   - Loading indicator shows processing status
   - Response appears in thread when ready

### Usage

Users can interact with the AI assistant using the `/askAI` command:
```
/askAI What was discussed about feature X?
```

The system will:
1. Convert the query to an embedding
2. Find similar messages in the chat history
3. Use the context to generate a relevant response
4. Include source messages for reference

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
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4-turbo-preview"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Pinecone Configuration
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="your-pinecone-environment"
PINECONE_INDEX="chatgenius"
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
- `ai response` - AI assistant response

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

4. **AI Security**
   - API key protection
   - Rate limiting on AI requests
   - Context validation
   - Response filtering

## Performance Considerations

1. **Vector Database**
   - Index optimization
   - Query performance monitoring
   - Batch operations for efficiency
   - Regular maintenance

2. **AI Integration**
   - Caching frequently used embeddings
   - Rate limit handling
   - Batch processing where possible
   - Error handling and retries

3. **General**
   - Database query optimization
   - Connection pooling
   - Resource monitoring
   - Load balancing (in production)

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

## UI/UX Features

### Real-time Feedback
- Loading indicators for AI processing
- Automatic thread management
- Smooth transitions and animations
- Clear visual hierarchy

### Thread Management
- Automatic thread creation for AI responses
- One-click thread opening
- Reply count indicators
- Context preservation

### Message Styling
- Clear user attribution
- Timestamp display
- File attachment previews
- Reaction support

### Responsive Design
- Mobile-friendly layout
- Adaptive message containers
- Touch-friendly controls
- Flexible thread view