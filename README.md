# ChatGenius - Modern Real-time Chat Application

A full-stack chat application featuring real-time messaging, file sharing, message threading, and AI-powered features.

## Project Structure

```
proj1_chatgenius_new/
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Auth.tsx          # Authentication component
│   │   │   ├── Chat.tsx          # Main chat interface
│   │   │   ├── MessageList.tsx   # Message display
│   │   │   ├── MessageInput.tsx  # Message input with file upload
│   │   │   └── ui/              # Shared UI components
│   │   ├── lib/          # Frontend utilities
│   │   └── App.tsx       # Root component
├── server.js             # Express backend server
├── lib/                  # Backend utilities
│   ├── prisma.js         # Database client
│   └── rag.js            # AI features (RAG implementation)
├── prisma/              # Database configuration
│   └── schema.prisma    # Database schema
└── public/              # Static assets and uploads
```

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- shadcn/ui components
- Tailwind CSS for styling
- Socket.IO Client for real-time features

### Backend
- Node.js with Express
- PostgreSQL with Prisma ORM
- Socket.IO for real-time communication
- JWT authentication
- Multer for file uploads
- OpenAI for AI features
- bcrypt for password hashing

## Features

### Authentication
- [x] User registration with secure password hashing
- [x] Login with JWT tokens
- [x] Guest access with temporary accounts
- [x] Automatic channel joining
- [x] Session persistence

### Real-time Messaging
- [x] Instant message delivery
- [x] File attachments (images, documents)
- [x] Message reactions
- [x] Thread support
- [x] Channel-based communication
- [x] User presence indicators

### Channels
- [x] Public channels
- [x] Channel switching
- [x] Message history
- [x] User membership tracking
- [ ] Private channels (TODO)
- [ ] Direct messaging (TODO)

### File Sharing
- [x] Multiple file type support:
  - Images (JPEG, PNG, GIF)
  - Documents (PDF, DOC, DOCX)
  - Text files
- [x] 5MB file size limit
- [x] Automatic file storage
- [x] Image previews
- [x] Secure file handling

### AI Integration
- [x] Message context awareness
- [x] RAG (Retrieval Augmented Generation)
- [x] AI command support (/askAI)
- [ ] Smart search (TODO)
- [ ] Content summarization (TODO)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Environment Setup
Create a `.env` file with:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chatgenius?schema=public"

# Authentication
JWT_SECRET="your-secret-key"

# Server
PORT=3000
NODE_ENV=development

# OpenAI (optional, for AI features)
OPENAI_API_KEY="your-openai-key"
```

### Installation

1. Install dependencies:
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install
```

2. Initialize database:
```bash
npx prisma generate
npx prisma migrate dev
```

3. Start development servers:
```bash
# Start both servers concurrently
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## API Documentation

### REST Endpoints

#### Authentication
- POST `/api/register` - Create new account
  - Body: `{ username: string, password: string }`
- POST `/api/login` - Authenticate user
  - Body: `{ username: string, password: string }`
- POST `/api/guest` - Create guest session
  - Body: `{ username: string }`

#### Files
- POST `/upload` - Upload file
  - Form data: `file`
  - Returns: `{ url: string, type: string, name: string }`

### WebSocket Events

#### Client to Server
- `chat message` - Send new message
  ```typescript
  {
    text: string
    channelId: string
    fileUrl?: string
    fileType?: string
    fileName?: string
  }
  ```
- `add reaction` - Add/remove reaction
  ```typescript
  {
    messageId: string
    emoji: string
  }
  ```
- `join channel` - Join a channel
  ```typescript
  {
    channelId: string
  }
  ```

#### Server to Client
- `initialize` - Initial data
  ```typescript
  {
    channels: Channel[]
    users: User[]
    messages: Message[]
    currentUser: User
  }
  ```
- `chat message` - New message
  ```typescript
  {
    channelId: string
    message: Message
  }
  ```
- `user status` - User presence update
  ```typescript
  {
    userId: string
    isOnline: boolean
  }
  ```
- `reaction_updated` - Reaction changes
  ```typescript
  {
    messageId: string
    reactions: Record<string, string[]>
  }
  ```

## Development Guidelines

### Frontend
- Use TypeScript for all new components
- Follow shadcn/ui component patterns
- Implement responsive designs
- Handle loading and error states
- Use proper state management
- Clean up event listeners

### Backend
- Validate all inputs
- Use try-catch for error handling
- Log meaningful error messages
- Follow RESTful patterns
- Handle WebSocket events properly
- Clean up resources

## Security Features

- [x] JWT-based authentication
- [x] Password hashing with bcrypt
- [x] File upload validation
- [x] Input sanitization
- [x] Secure WebSocket connections
- [ ] Rate limiting (TODO)
- [ ] Request validation (TODO)

## Future Enhancements

- [ ] Message editing
- [ ] Message deletion
- [ ] Rich text editor
- [ ] Voice messages
- [ ] Video chat
- [ ] End-to-end encryption
- [ ] User profiles
- [ ] Channel permissions
- [ ] Message search
- [ ] File previews
- [ ] Mobile app

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 