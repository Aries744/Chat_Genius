# Chat Genius Documentation

## Overview

This documentation covers the implementation details, features, and setup instructions for the Chat Genius application, including its user presence tracking, AI-powered chat assistance capabilities, message management, and real-time features.

## Project Organization

- `docs/features/` - Detailed documentation for each feature:
  - `1-Authentication.md` - User authentication and session management
  - `2-RealTimeMessaging.md` - Socket.IO implementation for real-time chat, user presence, and message management
  - `3-FileSharing.md` - File upload and sharing functionality
  - `4-EmojiReactions.md` - Emoji reaction system
  - `5-MessageThreading.md` - Thread-based conversations
  - `6-RAGPipeline.md` - AI-powered chat assistance with RAG

## Environment Setup

The application uses two environment files:
- `.env` - Contains actual configuration values (not committed to git)
- `.env.example` - Template showing required environment variables

Required environment variables:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/chatapp"

# Server
PORT=3000
NODE_ENV=development/production

# Security
JWT_SECRET="your-secret-key"
SESSION_SECRET="your-session-secret"

# File Upload
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif,application/pdf"

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4-turbo-preview"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Pinecone Configuration
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="your-pinecone-environment"
PINECONE_INDEX="chatgenius"
```

## Database Architecture

The application uses a dual-database approach:
1. PostgreSQL with Prisma ORM:
   - Primary database for all application data
   - Stores users, messages, channels, and embeddings
   - Schema defined in `prisma/schema.prisma`
   - Migrations in `prisma/migrations/`
   - User presence tracking
   - Message deletion cascade

2. Pinecone Vector Database:
   - Specialized storage for message embeddings
   - Optimized for semantic similarity search
   - Powers the RAG pipeline for AI assistance
   - Index configuration: 1536 dimensions, cosine similarity

## Development Workflow

1. Copy environment template: `cp .env.example .env`
2. Install dependencies: `npm install`
3. Run migrations: `npx prisma migrate dev`
4. Configure Pinecone:
   - Create an account at pinecone.io
   - Create an index named "chatgenius"
   - Set dimensions to 1536
   - Choose cosine similarity metric
5. Start development server: `npm run dev`

## Real-Time Features

The application uses Socket.IO for real-time features:
1. User Presence:
   - Online/offline status tracking
   - Real-time user list updates
   - Status broadcast on connect/disconnect
   - Visual status indicators

2. Messaging:
   - Instant message delivery
   - Real-time updates for edits/deletions
   - Thread notifications
   - Typing indicators

3. Reactions:
   - Real-time emoji reactions
   - Reaction counts and user lists
   - Toggle functionality

## Testing

The application includes several test suites:
```bash
npm run test:rag      # Test RAG pipeline functionality
npm run test:openai   # Test OpenAI integration
```

## Production Deployment

### EC2 Access
Production server details:
- IP Address: 18.208.137.52
- Region: us-east-1
- Instance Type: t2.micro
- OS: Amazon Linux 2023

Sensitive deployment files are stored in:
```
aws/
├── deploy3.pem        # SSH key (400 permissions)
└── accessKeys.csv     # AWS credentials (600 permissions)
```

Note: These files are not committed to git for security reasons.

### EC2 SSH Access
- Key location: `aws/deploy3.pem`
- Key permissions: `400` (read-only for owner)
- Default user: `ec2-user`
- SSH command:
  ```bash
  chmod 400 aws/deploy3.pem  # Set correct permissions
  ssh -i aws/deploy3.pem ec2-user@18.208.137.52
  ```

### Environment Setup
1. SSH into the instance:
   ```bash
   ssh -i aws/deploy3.pem ec2-user@18.208.137.52
   ```
2. Update environment variables:
   ```bash
   nano .env  # Edit environment variables
   ```
3. Restart the application:
   ```bash
   pm2 restart all  # Restart all processes
   ```

## Security Considerations

- Environment variables in `.env`