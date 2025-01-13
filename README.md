# Simple Chat Application

A lightweight Slack-like messaging application for work communication.

## Prerequisites
- Node.js v16 or higher
- PostgreSQL v14 or higher
- npm or yarn package manager

## Features
- Real-time messaging with Socket.IO
- User authentication with JWT
- PostgreSQL database for persistent storage
- File sharing and uploads
- Message threading and replies
- Emoji reactions
- Clean and responsive interface
- Real-time thread notifications
- Thread history preservation

## Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL:
```bash
# Start PostgreSQL service (MacOS)
brew services start postgresql@14
# or for Linux
sudo service postgresql start
# or for Windows
# Start PostgreSQL through the Windows Services application

# Create database
createdb chatapp

# Initialize database schema and generate Prisma client
npx prisma migrate dev
```

3. Configure environment:
- Copy `.env.example` to `.env` (if it doesn't exist, create it with the following content):
```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp?schema=public"
```
- Update database connection string if needed

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Production Deployment

The application is deployed on AWS EC2. Follow these steps for deployment:

### Initial Setup
1. SSH into your EC2 instance:
```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

2. Install required software:
```bash
# Update system packages
sudo yum update -y

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 16

# Install PostgreSQL
sudo yum install postgresql postgresql-server postgresql-devel postgresql-contrib postgresql-docs
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

3. Clone and setup the application:
```bash
git clone https://github.com/yourusername/chat-genius.git
cd chat-genius
npm install
```

4. Configure PostgreSQL:
```bash
sudo -u postgres psql
CREATE DATABASE chatapp;
\q
```

5. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with production values
nano .env
```

6. Setup PM2 for process management:
```bash
npm install pm2 -g
pm2 start server.js --name chat-app
pm2 startup
pm2 save
```

### Updating the Application
To update the running application:
```bash
cd ~/chat-genius
git pull
npm install
pm2 restart chat-app
```

### Monitoring
```bash
# View logs
pm2 logs chat-app

# Monitor application
pm2 monit

# View application status
pm2 status
```

## Database Management

### View Data
```bash
npx prisma studio
```

### Reset Data
```bash
npx prisma migrate reset --force
```

### Update Schema
```bash
npx prisma migrate dev
```

## Usage
1. Enter your name to join the chat
2. Start sending messages
3. Messages are updated in real-time for all connected users
4. Click "Reply in thread" on any message to start or view a thread
5. Use emoji reactions in both main chat and threads
6. Share files in messages and thread replies
7. The last 50 messages are preserved and shown to new users

## Message Threading
- Reply to any message to create a thread
- View all replies in a dedicated thread panel
- Real-time updates for thread replies
- Emoji reactions in threads
- File sharing in thread replies
- Thread reply count indicators
- Thread notifications for participants

## Technical Stack
- Node.js
- Express
- Socket.IO
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Vanilla JavaScript (no framework)
- HTML5 & CSS3 
 