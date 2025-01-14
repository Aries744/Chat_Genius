# RAG Pipeline Feature

## Overview
The Retrieval Augmented Generation (RAG) pipeline enhances the chat application with AI-powered assistance. It combines OpenAI's language models with a dual-database approach for semantic search and message storage, enabling contextually aware responses based on chat history.

## Architecture

### 1. Dual Database System
- **PostgreSQL**: Primary database storing complete message data and embeddings
- **Pinecone**: Specialized vector database optimized for similarity search
- **Rationale**: This dual approach provides both robust data persistence and efficient semantic search capabilities

### 2. Database Schema
```prisma
model Message {
    id        String   @id @default(uuid())
    text      String
    userId    String
    channelId String
    parentId  String?  // For threaded conversations
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    user      User     @relation(fields: [userId], references: [id])
    channel   Channel  @relation(fields: [channelId], references: [id])
    parent    Message? @relation("Replies", fields: [parentId], references: [id])
    replies   Message[] @relation("Replies")
    reactions Reaction[]
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

### 3. Vector Database Setup (`lib/rag.js`)
```javascript
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

const index = pinecone.Index(process.env.PINECONE_INDEX);
```

### 4. Message Processing Pipeline
```javascript
// Generate embedding for a message
async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        input: text,
        model: "text-embedding-3-small"
    });
    return response.data[0].embedding;
}

// Store message embedding in both databases
export async function storeMessageEmbedding(messageId) {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { user: true }
    });

    const embedding = await generateEmbedding(message.text);

    // Store in Pinecone for semantic search
    await index.upsert([{
        id: messageId,
        values: embedding,
        metadata: {
            text: message.text,
            username: message.user.username,
            timestamp: message.createdAt.toISOString()
        }
    }]);

    // Store in PostgreSQL for data persistence
    await prisma.messageEmbedding.create({
        data: {
            messageId: message.id,
            vector: Buffer.from(new Float32Array(embedding).buffer)
        }
    });
}
```

### 5. Query Processing
```javascript
// Find similar messages using vector similarity
export async function querySimilarMessages(query, limit = 5) {
    const queryEmbedding = await generateEmbedding(query);
    
    const results = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true
    });

    return results.matches;
}

// Generate AI response with context
export async function generateAIResponse(query, similarMessages) {
    const context = similarMessages
        .map(m => `${m.metadata.username}: ${m.metadata.text}`)
        .join('\n');

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
            {
                role: 'system',
                content: 'You are a helpful AI assistant in a chat application. Use the provided context to give accurate and relevant responses.'
            },
            {
                role: 'user',
                content: `Context from chat history:\n${context}\n\nQuestion: ${query}`
            }
        ],
        temperature: 0.7,
        max_tokens: 500
    });

    return {
        response: response.choices[0].message.content,
        context: context
    };
}
```

### 6. Socket.IO Integration
```javascript
socket.on('chat message', async (msg) => {
    if (msg.text.startsWith('/askAI ')) {
        const query = msg.text.slice(7).trim();
        
        // Create user's question message
        const questionMessage = await prisma.message.create({
            data: {
                text: msg.text,
                userId: socket.userId,
                channelId: msg.channelId
            }
        });
        io.to(msg.channelId).emit('chat message', questionMessage);

        // Process RAG query
        const similarMessages = await querySimilarMessages(query);
        const { response, context } = await generateAIResponse(query, similarMessages);
        
        // Create AI response as a reply
        const aiMessage = await prisma.message.create({
            data: {
                text: response,
                userId: socket.userId,
                channelId: msg.channelId,
                parentId: questionMessage.id  // Link as reply
            }
        });

        // Emit both message and thread update
        io.to(msg.channelId).emit('chat message', aiMessage);
        io.to(msg.channelId).emit('thread_updated', {
            parentId: questionMessage.id,
            replyCount: 1,
            lastReply: aiMessage
        });

    } else {
        // Handle regular message
        const message = await prisma.message.create({/*...*/});
        await storeMessageEmbedding(message.id);
        io.to(msg.channelId).emit('chat message', message);
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
- Region: us-east-1

## Usage

Users can interact with the AI assistant using the `/askAI` command:

```
/askAI what do magical creatures eat for breakfast?
```

The system will:
1. Store the user's question
2. Generate an embedding for the query
3. Find similar messages in chat history
4. Generate a contextual response
5. Post the response as a reply in the thread

## Testing

Test the RAG pipeline functionality:
```bash
npm run test:rag      # Test full RAG pipeline
npm run test:openai   # Test OpenAI integration
```

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
   - Asynchronous processing
   - Efficient vector storage

2. **Vector Search**
   - Optimal similarity threshold
   - Metadata filtering
   - Index optimization

3. **Response Generation**
   - Context window optimization
   - Temperature and token limit tuning
   - Thread-based response organization

## Security Considerations

1. **API Key Protection**
   - Secure key storage in environment variables
   - Regular key rotation
   - Access logging

2. **Data Privacy**
   - Message content filtering
   - User data protection
   - Secure embedding storage

3. **Request Validation**
   - Input sanitization
   - Rate limiting
   - Authentication checks 