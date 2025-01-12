# Chat Genius

A real-time chat application with features like message threading, file sharing, and emoji reactions.

## Project Structure

```
chat_genius/
├── deployment/           # Project-specific deployment files (gitignored)
│   ├── keys/            # SSH keys (400 permissions)
│   └── aws/             # AWS credentials (600 permissions)
├── docs/                # Detailed documentation
│   ├── features/        # Feature-specific documentation
│   └── README.md        # Documentation overview
├── prisma/              # Database schema and migrations
├── public/              # Client-side assets and code
│   └── uploads/         # User uploaded files (gitignored)
├── .env                 # Environment variables (gitignored)
├── .env.example         # Template for environment setup
└── server.js            # Main application file
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v14 or higher)
- PM2 (for production)

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Aries744/Chat_Genius.git
   cd Chat_Genius
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Production Deployment (AWS EC2)

1. SSH into your EC2 instance:
   ```bash
   # SSH key should be in deployment/keys/ with 400 permissions
   ssh -i deployment/keys/deploy2.pem ec2-user@[EC2-IP]
   ```

2. Clone and set up the application:
   ```bash
   git clone https://github.com/Aries744/Chat_Genius.git
   cd Chat_Genius
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

4. Set up the database:
   ```bash
   npx prisma migrate deploy
   ```

5. Start with PM2:
   ```bash
   pm2 start server.js --name chat-app
   pm2 save
   ```

## Security Notes

- Keep `.env` and files in `deployment/` secure and never commit them
- Maintain proper file permissions:
  - SSH keys: 400 (read-only for owner)
  - AWS credentials: 600 (read/write for owner only)
  - Uploads directory: 755
- Use HTTPS in production
- Regularly update dependencies

## Features

- Real-time messaging
- Message threading
- File sharing (images, documents)
- Emoji reactions
- User authentication
- Persistent storage
- Mobile-responsive design

## License

MIT License - see LICENSE file for details 