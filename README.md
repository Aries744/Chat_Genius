# Chat Genius

A modern real-time chat application with advanced messaging features, user presence tracking, and AI integration.

## Features

### Message Management
- Real-time message delivery and updates
- Message editing with edit history tracking
- Message deletion with cascade deletion for threads
- Visual indicators for edited messages
- Confirmation dialogs for destructive actions
- Hover interactions for message actions

### User Features
- Real-time user list with online/offline status
- Guest user support
- Direct messaging
- User filtering (excludes current user)
- Status indicators
- Automatic status updates

### Channel Management
- Public channels
- Direct message channels
- Channel switching
- Message threading
- File sharing support

### Message Interactions
- Emoji reactions
- Message threading
- File attachments
- Message search
- Real-time updates

### AI Integration
- AI-powered responses
- RAG pipeline for context-aware replies
- Hover interactions for AI features
- Confirmation dialogs

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chat-genius.git
cd chat-genius
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Development

### Database Schema
The application uses Prisma with PostgreSQL. Key models include:
- User (authentication, profile)
- Channel (messaging groups)
- Message (content, threading)
- Reaction (emoji interactions)
- MessageEdit (edit history)

### Architecture
- Backend: Node.js with Express
- Real-time: Socket.IO
- Database: PostgreSQL with Prisma
- Frontend: Vanilla JavaScript
- File Storage: Local/S3 (configurable)

## Security

- Password hashing
- Session management
- Message ownership verification
- Edit history tracking
- Input sanitization
- File upload validation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 