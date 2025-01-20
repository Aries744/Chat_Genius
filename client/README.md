# Chat Application Frontend

A modern React-based chat application frontend built with TypeScript, Vite, and shadcn/ui.

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS
- **State Management:** React Hooks
- **Real-time Communication:** Socket.IO Client

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   │   └── button.tsx
│   │   └── Auth.tsx     # Authentication component
│   ├── lib/
│   │   └── utils.ts     # Utility functions
│   ├── App.tsx          # Main application component
│   ├── index.css        # Global styles
│   └── main.tsx         # Application entry point
├── public/              # Static assets
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── tsconfig.node.json   # Node-specific TS config
```

## Setup and Configuration

### TypeScript Configuration

The project uses a dual TypeScript configuration setup:

1. `tsconfig.json`: Main configuration for the React application
   - Path aliases (@/* -> src/*)
   - React-specific settings
   - Modern JavaScript features

2. `tsconfig.node.json`: Configuration for Vite and other Node.js files
   - Used for build tools
   - Node-specific settings

### Vite Configuration

- Development server with proxy settings for API and WebSocket
- Path alias configuration (@/*)
- React plugin setup

### Styling

- Tailwind CSS with custom configuration
- shadcn/ui theme setup
- Dark mode support
- Custom color variables and animations

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build

## Development Guidelines

### Component Creation

1. Use TypeScript for all new components
2. Follow shadcn/ui patterns for consistency
3. Utilize Tailwind CSS for styling

### State Management

- Use React hooks for local state
- Context API for global state when needed
- Props for component communication

### API Integration

- All API calls proxy through Vite to backend
- WebSocket connection handled via Socket.IO
- Authentication via JWT tokens

## Current Features

- [x] Authentication (Login/Register/Guest)
- [x] Modern UI components with shadcn/ui
- [x] TypeScript type safety
- [x] Development proxy configuration
- [x] Path aliasing
- [ ] Real-time chat interface
- [ ] Message threading
- [ ] File uploads
- [ ] User presence

## Next Steps

1. Implement remaining shadcn/ui components
2. Add real-time chat functionality
3. Implement dark mode toggle
4. Add error handling with toast notifications
5. Build chat interface components
