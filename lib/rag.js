import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import prisma from './prisma.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

const index = pinecone.Index(process.env.PINECONE_INDEX);

// Function to generate embeddings for a message
async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        input: text,
        model: process.env.OPENAI_EMBEDDING_MODEL,
    });
    return response.data[0].embedding;
}

// Function to store message embedding
export async function storeMessageEmbedding(messageId) {
    try {
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: { user: true }
        });

        if (!message) {
            throw new Error('Message not found');
        }

        // Generate embedding for the message text
        const embedding = await generateEmbedding(message.text);

        // Store in Pinecone
        await index.upsert([{
            id: messageId,
            values: embedding,
            metadata: {
                text: message.text,
                username: message.user.username,
                timestamp: message.createdAt.toISOString()
            }
        }]);

        // Store in PostgreSQL for backup
        await prisma.messageEmbedding.create({
            data: {
                messageId: message.id,
                vector: Buffer.from(new Float32Array(embedding).buffer)
            }
        });

        return true;
    } catch (error) {
        console.error('Error storing message embedding:', error);
        throw error;
    }
}

// Function to query similar messages
export async function querySimilarMessages(query, limit = 5) {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);

        // Query Pinecone for similar messages
        const results = await index.query({
            vector: queryEmbedding,
            topK: limit,
            includeMetadata: true
        });

        return results.matches.map(match => ({
            score: match.score,
            message: match.metadata
        }));
    } catch (error) {
        console.error('Error querying similar messages:', error);
        throw error;
    }
}

// Function to handle AI response generation
export async function generateAIResponse(query, similarMessages) {
    try {
        // Construct the prompt with context from similar messages
        const context = similarMessages
            .map(m => `${m.message.username}: ${m.message.text}`)
            .join('\n');

        const prompt = `Context from previous messages:
${context}

Question: ${query}

Please provide a helpful response based on the context above. If the context doesn't contain relevant information, say so.`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant in a chat application. Your role is to provide informative responses based on the chat history context provided.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error generating AI response:', error);
        throw error;
    }
}

// Main function to handle RAG pipeline
export async function handleRAGQuery(query) {
    try {
        // 1. Query similar messages
        const similarMessages = await querySimilarMessages(query);

        // 2. Generate AI response
        const aiResponse = await generateAIResponse(query, similarMessages);

        return {
            response: aiResponse,
            context: similarMessages
        };
    } catch (error) {
        console.error('Error in RAG pipeline:', error);
        throw error;
    }
} 