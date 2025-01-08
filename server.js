require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Keep original filename but make it safe
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// In-memory storage
const messages = new Map(); // channelId/userId -> messages
const users = new Map();    // userId -> user
const channels = new Map(); // channelId -> channel
const onlineUsers = new Set(); // Track online users

// Initialize default channel
channels.set('general', {
    id: 'general',
    name: 'general',
    type: 'channel'
});

// Authentication Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if user exists
        if (Array.from(users.values()).some(u => u.username === username)) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Create new user
        const userId = Date.now().toString();
        const user = { id: userId, username, password, isGuest: false };
        users.set(userId, user);

        // Generate token
        const token = jwt.sign({ userId }, 'your-secret-key');
        res.json({ token, username });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = Array.from(users.values()).find(u => 
            u.username === username && u.password === password && !u.isGuest
        );
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id }, 'your-secret-key');
        res.json({ token, username });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.post('/api/guest', async (req, res) => {
    try {
        const { username } = req.body;
        const userId = Date.now().toString();
        
        // Create temporary guest user
        const guestUser = {
            id: userId,
            username: `guest_${username}`,
            isGuest: true
        };
        users.set(userId, guestUser);

        // Generate temporary token
        const token = jwt.sign({ userId }, 'your-secret-key', { expiresIn: '24h' });
        res.json({ token, username: guestUser.username });
    } catch (error) {
        res.status(500).json({ message: 'Error creating guest user' });
    }
});

// Socket.IO Authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    jwt.verify(token, 'your-secret-key', (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.userId = decoded.userId;
        next();
    });
});

io.on('connection', (socket) => {
    console.log('User connected');
    const user = users.get(socket.userId);
    
    // If no valid user is found, disconnect
    if (!user) {
        socket.disconnect();
        return;
    }

    // Mark user as online
    onlineUsers.add(socket.userId);
    
    // Join the general channel by default
    socket.join('general');
    
    // Send initial data to the user with ALL users, not just online ones
    socket.emit('initialize', {
        channels: Array.from(channels.values()),
        users: Array.from(users.values())
            .filter(u => !u.isGuest || onlineUsers.has(u.id)) // Only include online guest users
            .map(u => ({
                id: u.id,
                username: u.username,
                isGuest: u.isGuest,
                isOnline: onlineUsers.has(u.id)
            })),
        currentUser: user
    });

    // Also notify everyone about the new user if they're not already in the list
    if (!user.isGuest) {
        socket.broadcast.emit('user joined', {
            id: user.id,
            username: user.username,
            isGuest: user.isGuest,
            isOnline: true
        });
    }

    // Broadcast user status to others
    socket.broadcast.emit('user status', {
        userId: socket.userId,
        isOnline: true
    });

    // Send channel history
    if (messages.has('general')) {
        socket.emit('previous messages', {
            channelId: 'general',
            messages: messages.get('general')
        });
    }

    // Handle channel creation
    socket.on('create channel', (channelName) => {
        const channelId = channelName.toLowerCase().replace(/\s+/g, '-');
        if (!channels.has(channelId)) {
            channels.set(channelId, {
                id: channelId,
                name: channelName,
                type: 'channel'
            });
            io.emit('channel created', channels.get(channelId));
        }
    });

    // Handle joining channels
    socket.on('join channel', (channelId) => {
        socket.join(channelId);
        if (messages.has(channelId)) {
            socket.emit('previous messages', {
                channelId,
                messages: messages.get(channelId)
            });
        }
    });

    // Handle new messages
    socket.on('chat message', async (msg) => {
        try {
            const user = users.get(socket.userId);
            if (!user) return;

            const message = {
                id: Date.now().toString(),
                text: msg.text,
                user: user.username,
                time: new Date().toISOString(),
                reactions: {},
                fileUrl: msg.fileUrl,
                fileType: msg.fileType,
                parentId: msg.parentId || null, // Add parent message ID for threads
                replies: [] // Store reply IDs
            };

            // Store message in appropriate channel/DM
            const channelId = msg.channelId || 'general';
            if (!messages.has(channelId)) {
                messages.set(channelId, []);
            }
            const channelMessages = messages.get(channelId);

            // If this is a reply, add it to parent message's replies
            if (message.parentId) {
                const parentMessage = channelMessages.find(m => m.id === message.parentId);
                if (parentMessage) {
                    parentMessage.replies.push(message.id);
                }
            }

            channelMessages.push(message);
            
            // Keep only last 50 root messages (not replies)
            if (channelMessages.length > 50) {
                const rootMessages = channelMessages.filter(m => !m.parentId);
                if (rootMessages.length > 50) {
                    const oldestRootMessage = rootMessages[0];
                    // Remove oldest root message and all its replies
                    const toRemove = new Set([oldestRootMessage.id, ...oldestRootMessage.replies]);
                    messages.set(channelId, channelMessages.filter(m => !toRemove.has(m.id)));
                }
            }

            // Broadcast to appropriate room
            io.to(channelId).emit('chat message', {
                channelId,
                message
            });

            // If this is a reply, also emit a thread update
            if (message.parentId) {
                io.to(channelId).emit('thread_updated', {
                    parentId: message.parentId,
                    reply: message
                });
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    // Handle direct messages
    socket.on('direct message', (data) => {
        const { targetUserId, text } = data;
        const dmChannelId = [socket.userId, targetUserId].sort().join('-');
        
        const message = {
            id: Date.now().toString(),
            text,
            user: user.username,
            time: new Date().toISOString()
        };

        // Store DM
        if (!messages.has(dmChannelId)) {
            messages.set(dmChannelId, []);
        }
        messages.get(dmChannelId).push(message);

        // Make sure both users are in the DM channel
        socket.join(dmChannelId);
        const targetSocket = io.sockets.sockets.get(targetUserId);
        if (targetSocket) {
            targetSocket.join(dmChannelId);
        }

        // Broadcast to the DM channel
        io.to(dmChannelId).emit('chat message', {
            channelId: dmChannelId,
            message,
            isDM: true
        });
    });

    // Add reaction handler
    socket.on('add_reaction', (data) => {
        const { messageId, reaction, channelId } = data;
        
        if (!messages.has(channelId)) return;
        
        const channelMessages = messages.get(channelId);
        const message = channelMessages.find(m => m.id === messageId);
        
        if (message) {
            // Initialize reactions object if it doesn't exist
            if (!message.reactions) {
                message.reactions = {};
            }
            
            // Initialize reaction array if it doesn't exist
            if (!message.reactions[reaction]) {
                message.reactions[reaction] = [];
            }
            
            // Toggle user's reaction
            const userIndex = message.reactions[reaction].indexOf(socket.userId);
            if (userIndex === -1) {
                message.reactions[reaction].push(socket.userId);
            } else {
                message.reactions[reaction].splice(userIndex, 1);
            }
            
            // Remove reaction if no users are using it
            if (message.reactions[reaction].length === 0) {
                delete message.reactions[reaction];
            }
            
            // Broadcast reaction update
            io.to(channelId).emit('reaction_updated', {
                messageId,
                reactions: message.reactions
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        onlineUsers.delete(socket.userId);
        
        // Broadcast offline status
        io.emit('user status', {
            userId: socket.userId,
            isOnline: false
        });
    });
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
        url: fileUrl,
        filename: req.file.originalname,
        type: req.file.mimetype
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 