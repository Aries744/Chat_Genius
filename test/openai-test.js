import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Test embedding generation
async function testEmbedding() {
    try {
        console.log('Testing embedding generation...');
        const response = await openai.embeddings.create({
            input: "This is a test message about artificial intelligence.",
            model: process.env.OPENAI_EMBEDDING_MODEL,
        });
        console.log('Embedding generated successfully!');
        console.log('Embedding dimensions:', response.data[0].embedding.length);
        return response;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

// Test chat completion
async function testChatCompletion() {
    try {
        console.log('\nTesting chat completion...');
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant.'
                },
                {
                    role: 'user',
                    content: 'What is artificial intelligence?'
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        console.log('Chat completion generated successfully!');
        console.log('Response:', response.choices[0].message.content);
        return response;
    } catch (error) {
        console.error('Error generating chat completion:', error);
        throw error;
    }
}

// Run tests
async function runTests() {
    try {
        console.log('Starting OpenAI API tests...');
        
        console.log('\n1. Testing Embedding Generation');
        await testEmbedding();
        
        console.log('\n2. Testing Chat Completion');
        await testChatCompletion();
        
        console.log('\nAll OpenAI tests completed successfully!');
    } catch (error) {
        console.error('\nError in test suite:', error);
    }
}

// Run the tests
runTests(); 