# Chat Genius Documentation

## Overview

This documentation covers the implementation details, features, and setup instructions for the Chat Genius application.

## Project Organization

- `docs/features/` - Detailed documentation for each feature:
  - `1-Authentication.md` - User authentication and session management
  - `2-RealTimeMessaging.md` - Socket.IO implementation for real-time chat
  - `3-FileSharing.md` - File upload and sharing functionality
  - `4-EmojiReactions.md` - Emoji reaction system
  - `5-MessageThreading.md` - Thread-based conversations

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
```

## Secure File Organization

Sensitive files are stored in the `deployment/` directory (gitignored):
```
deployment/
├── keys/     # SSH keys (400 permissions)
└── aws/      # AWS credentials (600 permissions)
```

## Database Management

The application uses PostgreSQL with Prisma ORM:
- Schema defined in `prisma/schema.prisma`
- Migrations in `prisma/migrations/`
- Database cleanup script in `prisma/clean-db.js`

## Development Workflow

1. Copy environment template: `cp .env.example .env`
2. Install dependencies: `npm install`
3. Run migrations: `npx prisma migrate dev`
4. Start development server: `npm run dev`

## Production Deployment

### EC2 SSH Access
- Key location: `deployment/keys/deploy2.pem`
- Key permissions: `400` (read-only for owner)
- Default user: `ec2-user` (for Amazon Linux 2023)
- Command format:
  ```bash
  ssh -i deployment/keys/deploy2.pem ec2-user@[EC2-IP]
  ```

Note: The default user varies by EC2 AMI:
- Amazon Linux 2023: `ec2-user`
- Ubuntu: `ubuntu`
- Amazon Linux 2: `ec2-user`
- RHEL: `ec2-user`
- SUSE: `ec2-user`
- Debian: `admin`
- Fedora: `fedora`

1. SSH access: `ssh -i deployment/keys/deploy2.pem ec2-user@[EC2-IP]`
2. Environment setup: Copy and configure `.env`
3. Database setup: `npx prisma migrate deploy`
4. Process management: PM2 for application lifecycle

## Security Considerations

- Environment variables in `.env` (never committed)
- Secure file permissions (400 for keys, 600 for credentials)
- HTTPS in production
- Regular dependency updates
- Rate limiting on API endpoints
- File upload restrictions 