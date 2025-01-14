import { storeMessageEmbedding, querySimilarMessages, generateAIResponse, handleRAGQuery } from '../lib/rag.js';
import prisma from '../lib/prisma.js';

// Test message creation and embedding
async function testMessageEmbedding() {
    try {
        console.log('Creating test message...');
        const message = await prisma.message.create({
            data: {
                text: "This is a test message about artificial intelligence and machine learning.",
                userId: "test-user", // You'll need to replace this with a real user ID
                channelId: "test-channel", // You'll need to replace this with a real channel ID
            }
        });
        console.log('Message created:', message);

        console.log('Generating and storing embedding...');
        await storeMessageEmbedding(message.id);
        console.log('Embedding stored successfully');

        return message;
    } catch (error) {
        console.error('Error in testMessageEmbedding:', error);
        throw error;
    }
}

// Test similar message query
async function testSimilarMessages() {
    try {
        console.log('Testing similar message query...');
        const query = "What do you know about AI?";
        const results = await querySimilarMessages(query);
        console.log('Similar messages found:', results);
        return results;
    } catch (error) {
        console.error('Error in testSimilarMessages:', error);
        throw error;
    }
}

// Test AI response generation
async function testAIResponse() {
    try {
        console.log('Testing AI response generation...');
        const query = "What do you know about AI?";
        const similarMessages = await querySimilarMessages(query);
        const response = await generateAIResponse(query, similarMessages);
        console.log('AI Response:', response);
        return response;
    } catch (error) {
        console.error('Error in testAIResponse:', error);
        throw error;
    }
}

// Test full RAG pipeline
async function testFullPipeline() {
    try {
        console.log('Testing full RAG pipeline...');
        const query = "What do you know about AI?";
        const result = await handleRAGQuery(query);
        console.log('Full pipeline result:', result);
        return result;
    } catch (error) {
        console.error('Error in testFullPipeline:', error);
        throw error;
    }
}

// Main test function
async function runTests() {
    try {
        console.log('Starting RAG pipeline tests...');
        
        // Get existing user and channel for testing
        const user = await prisma.user.findFirst();
        const channel = await prisma.channel.findFirst();
        
        if (!user || !channel) {
            throw new Error('Please ensure there is at least one user and channel in the database');
        }
        
        // Update test data with real IDs
        const testMessage = await prisma.message.create({
            data: {
                text: "This is a test message about artificial intelligence and machine learning.",
                userId: user.id,
                channelId: channel.id,
            }
        });

        console.log('\n1. Testing Message Embedding');
        await storeMessageEmbedding(testMessage.id);

        console.log('\n2. Testing Similar Messages Query');
        await testSimilarMessages();

        console.log('\n3. Testing AI Response Generation');
        await testAIResponse();

        console.log('\n4. Testing Full Pipeline');
        await testFullPipeline();

        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Error in test suite:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the tests
runTests(); 