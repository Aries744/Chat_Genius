# RAG Pipeline Feature

## Overview
The Retrieval Augmented Generation (RAG) pipeline enhances the chat application with AI-powered assistance. It combines the power of OpenAI's language models with a semantic search over the chat history to provide contextually relevant responses.

## Implementation

### 1. Database Schema
```prisma
model Message {
    // ... existing fields ...
    embedding MessageEmbedding?
}

model MessageEmbedding {
    id        String   @id @default(uuid())
    messageId String   @unique
    message   Message  @relation(fields: [messageId], references: [id])
    vector    Bytes    // Store the embedding vector
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([messageId])
}
```

### 2. Vector Database Setup (`lib/rag.js`)
```javascript
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

const index = pinecone.index(process.env.PINECONE_INDEX);
```

### 3. Message Processing
```javascript
// Generate embedding for a message
async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        input: text,
        model: process.env.OPENAI_EMBEDDING_MODEL,
    });
    return response.data[0].embedding;
}

// Store message embedding
export async function storeMessageEmbedding(messageId) {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { user: true }
    });

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

    // Store in PostgreSQL
    await prisma.messageEmbedding.create({
        data: {
            messageId: message.id,
            vector: Buffer.from(new Float32Array(embedding).buffer)
        }
    });
}
```

### 4. Query Processing
```javascript
// Query similar messages
export async function querySimilarMessages(query, limit = 5) {
    const queryEmbedding = await generateEmbedding(query);
    
    return await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true
    });
}

// Generate AI response
export async function generateAIResponse(query, similarMessages) {
    const context = similarMessages
        .map(m => `${m.message.username}: ${m.message.text}`)
        .join('\n');

    const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a helpful AI assistant in a chat application.'
            },
            {
                role: 'user',
                content: `Context:\n${context}\n\nQuestion: ${query}`
            }
        ],
        temperature: 0.7,
        max_tokens: 500
    });

    return response.choices[0].message.content;
}
```

### 5. Socket.IO Integration
```javascript
socket.on('chat message', async (msg) => {
    if (msg.text.startsWith('/askAI ')) {
        const query = msg.text.slice(7).trim();
        const { response, context } = await handleRAGQuery(query);
        
        // Create AI response message
        const aiMessage = await prisma.message.create({
            data: {
                text: `AI Response: ${response}\n\nBased on:\n${context}`,
                userId: socket.userId,
                channelId: msg.channelId
            }
        });

        io.to(msg.channelId).emit('chat message', aiMessage);
    } else {
        // Regular message handling
        const message = await prisma.message.create({/*...*/});
        // Store embedding for future queries
        storeMessageEmbedding(message.id);
    }
});
```

## Configuration

### Environment Variables
```env
# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4-turbo-preview"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Pinecone Configuration
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="your-pinecone-environment"
PINECONE_INDEX="chatgenius"
```

### Pinecone Index Setup
- Name: chatgenius
- Dimensions: 1536 (OpenAI embedding size)
- Metric: Cosine similarity
- Environment: Serverless

## Usage

Users can interact with the AI assistant using the `/askAI` command followed by their question:

```
/askAI What was the conclusion about the database schema?
```

The system will:
1. Generate an embedding for the query
2. Find similar messages in the chat history
3. Use the context to generate a relevant response
4. Include source messages for reference

## Error Handling

1. **API Failures**
   - Retry logic for transient failures
   - Graceful degradation when services are unavailable
   - User-friendly error messages

2. **Rate Limiting**
   - OpenAI API rate limit handling
   - Pinecone query throttling
   - User request limiting

3. **Data Validation**
   - Input sanitization
   - Context length validation
   - Response filtering

## Performance Optimization

1. **Embedding Generation**
   - Batch processing for multiple messages
   - Caching frequently accessed embeddings
   - Asynchronous processing

2. **Vector Search**
   - Optimal `topK` parameter tuning
   - Metadata filtering
   - Index optimization

3. **Response Generation**
   - Context window optimization
   - Temperature and token limit tuning
   - Response caching for similar queries

## Security Considerations

1. **API Key Protection**
   - Secure key storage
   - Key rotation
   - Access logging

2. **Data Privacy**
   - Message content filtering
   - User data protection
   - Embedding storage security

3. **Request Validation**
   - Input sanitization
   - Rate limiting
   - Authentication checks 