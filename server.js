import 'dotenv/config';
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
import fs from 'fs';
import { storeMessageEmbedding, handleRAGQuery } from './lib/rag.js';

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
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`));
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
    console.log('Login request received:', req.body);
    try {
        const { username, password } = req.body;
        
        const user = await prisma.user.findUnique({
            where: { username }
        });

        console.log('User found:', user ? 'yes' : 'no');

        if (!user || user.isGuest) {
            console.log('Invalid credentials: user not found or is guest');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword);
        
        if (!validPassword) {
            console.log('Invalid credentials: wrong password');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
        console.log('Login successful for user:', username);
        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Login error details:', error);
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

        // Convert backslashes to forward slashes for URLs
        const relativePath = path.relative(
            path.join(__dirname, 'public'),
            req.file.path
        ).replace(/\\/g, '/');

        const fileUrl = `/${relativePath}`;
        
        console.log('File uploaded successfully:', {
            url: fileUrl,
            type: req.file.mimetype,
            name: req.file.originalname,
            size: req.file.size
        });

        res.json({
            url: fileUrl,
            type: req.file.mimetype,
            name: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'File upload failed', details: error.message });
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
                    type: 'channel'
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

// Socket.IO event handlers
io.on('connection', async (socket) => {
    try {
        console.log('User connected:', socket.username);
        
        // Broadcast user online status
        io.emit('user status', {
            userId: socket.userId,
            isOnline: true
        });

        // Join user's channels
        const userChannels = await prisma.channelUser.findMany({
            where: { userId: socket.userId },
            include: { channel: true }
        });

        userChannels.forEach(({ channel }) => {
            console.log('User joining channel:', channel.name, channel.id);
            socket.join(channel.id);
        });

        // Get all channels the user has access to
        const channels = await prisma.channel.findMany({
            where: {
                OR: [
                    { type: 'channel' },
                    {
                        users: {
                            some: { userId: socket.userId }
                        }
                    }
                ]
            }
        });

        // Get messages for the general channel
        const generalChannel = await prisma.channel.findFirst({
            where: { name: 'general' }
        });

        if (generalChannel) {
            console.log('Found general channel:', generalChannel.id);
            
            // Ensure user is member of general channel
            const isMember = await prisma.channelUser.findFirst({
                where: {
                    userId: socket.userId,
                    channelId: generalChannel.id
                }
            });

            if (!isMember) {
                console.log('Adding user to general channel');
                await prisma.channelUser.create({
                    data: {
                        userId: socket.userId,
                        channelId: generalChannel.id
                    }
                });
                socket.join(generalChannel.id);
            }

            const messages = await prisma.message.findMany({
                where: { channelId: generalChannel.id },
                include: {
                    user: true,
                    reactions: {
                        include: { user: true }
                    }
                },
                orderBy: { createdAt: 'asc' },
                take: 50
            });

            console.log('Sending initial messages:', messages.length);
            
            // Get all users
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    username: true,
                    isGuest: true
                }
            });

            socket.emit('initialize', {
                channels,
                currentUser: {
                    id: socket.userId,
                    username: socket.username
                },
                users,
                messages: messages.map(msg => ({
                    ...msg,
                    username: msg.user.username,
                    reactions: msg.reactions.reduce((acc, reaction) => {
                        if (!acc[reaction.emoji]) {
                            acc[reaction.emoji] = [];
                        }
                        acc[reaction.emoji].push(reaction.user.username);
                        return acc;
                    }, {})
                }))
            });
        }

        // Message handling
        socket.on('chat message', async (msg) => {
            try {
                console.log('Received message:', msg);
                
                // Check if it's an AI query
                if (msg.text.startsWith('/askAI ')) {
                    const query = msg.text.slice(7).trim(); // Remove '/askAI ' prefix
                    
                    try {
                        // Create the user's question message first
                        const userMessage = await prisma.message.create({
                            data: {
                                text: msg.text,
                                userId: socket.userId,
                                channelId: msg.channelId,
                                parentId: msg.parentId || null
                            },
                            include: {
                                user: true,
                                reactions: true,
                                replies: {
                                    include: {
                                        user: true,
                                        reactions: true
                                    }
                                }
                            }
                        });

                        // Broadcast the user's message
                        const formattedUserMessage = {
                            ...userMessage,
                            username: userMessage.user.username,
                            reactions: {},
                            replyCount: userMessage.replies.length
                        };
                        io.to(msg.channelId).emit('chat message', {
                            channelId: msg.channelId,
                            message: formattedUserMessage
                        });

                        // Get AI response
                        const { response, context } = await handleRAGQuery(query);
                        
                        // Create AI response message as a reply to user's message
                        const aiMessage = await prisma.message.create({
                            data: {
                                text: `AI Response: ${response}\n\nBased on context from:\n${context.map(c => `- ${c.message.username}: ${c.message.text}`).join('\n')}`,
                                userId: socket.userId,
                                channelId: msg.channelId,
                                parentId: userMessage.id  // Set as reply to user's message
                            },
                            include: {
                                user: true,
                                reactions: true,
                                replies: {
                                    include: {
                                        user: true,
                                        reactions: true
                                    }
                                }
                            }
                        });

                        const formattedAiMessage = {
                            ...aiMessage,
                            username: aiMessage.user.username,
                            reactions: {},
                            replyCount: aiMessage.replies.length
                        };

                        // Emit both the AI response and thread update
                        io.to(msg.channelId).emit('chat message', {
                            channelId: msg.channelId,
                            message: formattedAiMessage
                        });
                        io.to(msg.channelId).emit('thread_updated', {
                            parentId: userMessage.id,
                            replyCount: 1,
                            reply: formattedAiMessage
                        });
                    } catch (error) {
                        console.error('Error processing AI query:', error);
                        socket.emit('error', { message: 'Failed to process AI query' });
                    }
                    return;
                }

                // Regular message handling
                const message = await prisma.message.create({
                    data: {
                        text: msg.text,
                        userId: socket.userId,
                        channelId: msg.channelId,
                        parentId: msg.parentId || null,
                        fileUrl: msg.fileUrl,
                        fileType: msg.fileType,
                        fileName: msg.fileName
                    },
                    include: {
                        user: true,
                        reactions: true,
                        replies: {
                            include: {
                                user: true,
                                reactions: true
                            }
                        }
                    }
                });

                // Store message embedding for future RAG queries
                storeMessageEmbedding(message.id).catch(error => {
                    console.error('Error storing message embedding:', error);
                });

                console.log('Created message:', message);

                const formattedMessage = {
                    ...message,
                    username: message.user.username,
                    reactions: {},
                    replyCount: message.replies.length
                };

                // If this is a thread reply, notify about thread update
                if (msg.parentId) {
                    const parentMessage = await prisma.message.findUnique({
                        where: { id: msg.parentId },
                        include: {
                            replies: {
                                include: {
                                    user: true,
                                    reactions: true
                                }
                            }
                        }
                    });

                    if (parentMessage) {
                        io.to(msg.channelId).emit('thread_updated', {
                            parentId: msg.parentId,
                            replyCount: parentMessage.replies.length,
                            reply: formattedMessage
                        });
                    }
                }

                console.log('Broadcasting message to channel:', msg.channelId);
                io.to(msg.channelId).emit('chat message', {
                    channelId: msg.channelId,
                    message: formattedMessage
                });
            } catch (error) {
                console.error('Error in chat message handler:', error);
                socket.emit('error', { message: 'Failed to process message' });
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

                io.emit('reaction_updated', {
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
                const { parentId, channelId } = data;
                
                // Get parent message with its replies
                const threadMessages = await prisma.message.findUnique({
                    where: { id: parentId },
                    include: {
                        user: true,
                        reactions: {
                            include: { user: true }
                        },
                        replies: {
                            include: {
                                user: true,
                                reactions: {
                                    include: { user: true }
                                }
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                });

                if (!threadMessages) {
                    console.error('Thread parent message not found');
                    return;
                }

                const formattedMessages = {
                    parent: {
                        ...threadMessages,
                        username: threadMessages.user.username,
                        reactions: threadMessages.reactions.reduce((acc, reaction) => {
                            if (!acc[reaction.emoji]) {
                                acc[reaction.emoji] = [];
                            }
                            acc[reaction.emoji].push(reaction.user.username);
                            return acc;
                        }, {})
                    },
                    replies: threadMessages.replies.map(reply => ({
                        ...reply,
                        username: reply.user.username,
                        reactions: reply.reactions.reduce((acc, reaction) => {
                            if (!acc[reaction.emoji]) {
                                acc[reaction.emoji] = [];
                            }
                            acc[reaction.emoji].push(reaction.user.username);
                            return acc;
                        }, {})
                    }))
                };

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
            // Broadcast user offline status
            io.emit('user status', {
                userId: socket.userId,
                isOnline: false
            });

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

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Server running on port ${PORT}`);
}); 