import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanDatabase() {
    try {
        // Delete in order to respect foreign key constraints
        console.log('Cleaning database...');
        
        // Delete reactions first
        await prisma.reaction.deleteMany();
        console.log('✓ Deleted all reactions');
        
        // Delete channel users
        await prisma.channelUser.deleteMany();
        console.log('✓ Deleted all channel users');
        
        // Delete messages
        await prisma.message.deleteMany();
        console.log('✓ Deleted all messages');
        
        // Delete channels
        await prisma.channel.deleteMany();
        console.log('✓ Deleted all channels');
        
        // Delete users
        await prisma.user.deleteMany();
        console.log('✓ Deleted all users');
        
        console.log('Database cleaned successfully!');
    } catch (error) {
        console.error('Error cleaning database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase(); 