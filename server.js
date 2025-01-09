import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        
        if (!user) return next(new Error('User not found'));
        
        socket.userId = user.id;
        socket.username = user.username;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });
        
        if (existingUser) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                isGuest: false
            }
        });

        // Add user to general channel
        const generalChannel = await prisma.channel.findFirst({
            where: { name: 'general' }
        });

        if (generalChannel) {
            await prisma.channelUser.create({
                data: {
                    userId: user.id,
                    channelId: generalChannel.id
                }
            });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user || user.isGuest) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Guest access endpoint
app.post('/api/guest', async (req, res) => {
    try {
        const { username } = req.body;
        
        const user = await prisma.user.create({
            data: {
                username: `guest_${username}`,
                isGuest: true
            }
        });

        // Add guest to general channel
        const generalChannel = await prisma.channel.findFirst({
            where: { name: 'general' }
        });

        if (generalChannel) {
            await prisma.channelUser.create({
                data: {
                    userId: user.id,
                    channelId: generalChannel.id
                }
            });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Guest access error:', error);
        res.status(500).json({ message: 'Error creating guest user' });
    }
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            url: fileUrl,
            type: req.file.mimetype,
            name: req.file.originalname
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

// Socket.IO event handlers
io.on('connection', async (socket) => {
    try {
        // Join user's channels
        const userChannels = await prisma.channelUser.findMany({
            where: { userId: socket.userId },
            include: { channel: true }
        });

        userChannels.forEach(({ channel }) => {
            socket.join(channel.id);
        });

        // Send initial channel list and messages
        const channels = await prisma.channel.findMany({
            where: {
                users: {
                    some: { userId: socket.userId }
                }
            }
        });

        socket.emit('initialize', {
            channels,
            currentUser: {
                id: socket.userId,
                username: socket.username
            }
        });

        // Message handling
        socket.on('chat message', async (msg) => {
            try {
                const message = await prisma.message.create({
                    data: {
                        text: msg.text,
                        userId: socket.userId,
                        channelId: msg.channelId,
                        parentId: msg.parentId,
                        fileUrl: msg.fileUrl,
                        fileType: msg.fileType,
                        fileName: msg.fileName
                    },
                    include: {
                        user: true
                    }
                });

                io.to(msg.channelId).emit('chat message', {
                    channelId: msg.channelId,
                    message: {
                        ...message,
                        username: message.user.username
                    }
                });
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Reaction handling
        socket.on('add reaction', async (data) => {
            try {
                const { messageId, emoji } = data;

                const existingReaction = await prisma.reaction.findFirst({
                    where: {
                        messageId,
                        userId: socket.userId,
                        emoji
                    }
                });

                if (existingReaction) {
                    await prisma.reaction.delete({
                        where: { id: existingReaction.id }
                    });
                } else {
                    await prisma.reaction.create({
                        data: {
                            emoji,
                            userId: socket.userId,
                            messageId
                        }
                    });
                }

                const reactions = await prisma.reaction.findMany({
                    where: { messageId },
                    include: { user: true }
                });

                const formattedReactions = reactions.reduce((acc, reaction) => {
                    if (!acc[reaction.emoji]) {
                        acc[reaction.emoji] = [];
                    }
                    acc[reaction.emoji].push(reaction.user.username);
                    return acc;
                }, {});

                io.emit('reaction updated', {
                    messageId,
                    reactions: formattedReactions
                });
            } catch (error) {
                console.error('Error handling reaction:', error);
            }
        });

        // Thread handling
        socket.on('get thread', async (data) => {
            try {
                const { parentId } = data;
                const threadMessages = await prisma.message.findMany({
                    where: { parentId },
                    include: {
                        user: true,
                        reactions: {
                            include: { user: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                });

                const formattedMessages = threadMessages.map(message => ({
                    ...message,
                    username: message.user.username,
                    reactions: message.reactions.reduce((acc, reaction) => {
                        if (!acc[reaction.emoji]) {
                            acc[reaction.emoji] = [];
                        }
                        acc[reaction.emoji].push(reaction.user.username);
                        return acc;
                    }, {})
                }));

                socket.emit('thread messages', {
                    parentId,
                    messages: formattedMessages
                });
            } catch (error) {
                console.error('Error getting thread messages:', error);
            }
        });

        // Cleanup on disconnect
        socket.on('disconnect', async () => {
            if (socket.username.startsWith('guest_')) {
                try {
                    await prisma.user.delete({
                        where: { id: socket.userId }
                    });
                } catch (error) {
                    console.error('Error cleaning up guest user:', error);
                }
            }
        });
    } catch (error) {
        console.error('Socket connection error:', error);
    }
});

// Initialize database with general channel
async function initializeDatabase() {
    try {
        const generalChannel = await prisma.channel.findFirst({
            where: { name: 'general' }
        });

        if (!generalChannel) {
            console.log('Creating general channel...');
            await prisma.channel.create({
                data: {
                    name: 'general',
                    isDirectMessage: false
                }
            });
            console.log('General channel created successfully');
        } else {
            console.log('General channel already exists');
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Server running on port ${PORT}`);
}); 