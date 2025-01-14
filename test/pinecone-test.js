import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

const index = pinecone.index(process.env.PINECONE_INDEX);

// Test embedding generation and storage
async function testEmbeddingStorage() {
    try {
        console.log('Testing embedding generation and storage...');
        
        // Test messages
        const messages = [
            {
                id: 'msg1',
                text: "Artificial Intelligence is transforming how we build software applications.",
                username: "Alice"
            },
            {
                id: 'msg2',
                text: "Machine learning models can help understand user behavior.",
                username: "Bob"
            },
            {
                id: 'msg3',
                text: "The weather is nice today, perfect for a walk.",
                username: "Charlie"
            }
        ];
        
        // Generate embeddings and store vectors
        for (const msg of messages) {
            const response = await openai.embeddings.create({
                input: msg.text,
                model: process.env.OPENAI_EMBEDDING_MODEL,
            });
            const embedding = response.data[0].embedding;
            
            await index.upsert([{
                id: msg.id,
                values: embedding,
                metadata: {
                    text: msg.text,
                    username: msg.username,
                    timestamp: new Date().toISOString()
                }
            }]);
            console.log(`Stored vector for message: ${msg.id}`);
        }

        console.log('All vectors stored successfully!');
        return true;
    } catch (error) {
        console.error('Error in embedding storage test:', error);
        throw error;
    }
}

// Test vector similarity search
async function testVectorSearch() {
    try {
        console.log('\nTesting vector similarity search...');
        
        // Generate query embedding
        const queryText = "How is AI changing software development?";
        console.log('Query:', queryText);
        
        const queryResponse = await openai.embeddings.create({
            input: queryText,
            model: process.env.OPENAI_EMBEDDING_MODEL,
        });
        const queryEmbedding = queryResponse.data[0].embedding;

        // Query Pinecone
        const results = await index.query({
            vector: queryEmbedding,
            topK: 2,
            includeMetadata: true
        });

        console.log('Search results:', JSON.stringify(results, null, 2));
        return results;
    } catch (error) {
        console.error('Error in vector search test:', error);
        throw error;
    }
}

// Run tests
async function runTests() {
    try {
        console.log('Starting Pinecone integration tests...');
        
        console.log('\n1. Testing Vector Storage');
        await testEmbeddingStorage();
        
        console.log('\n2. Testing Vector Search');
        await testVectorSearch();
        
        console.log('\nAll Pinecone tests completed successfully!');
    } catch (error) {
        console.error('\nError in test suite:', error);
    }
}

// Run the tests
runTests(); 