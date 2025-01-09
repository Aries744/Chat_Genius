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
- Message threading and reactions
- Clean and responsive interface

## Setup

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
4. The last 50 messages are preserved and shown to new users

## Technical Stack
- Node.js
- Express
- Socket.IO
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Vanilla JavaScript (no framework)
- HTML5 & CSS3 
 