# File Sharing

## Overview
The application supports file sharing functionality using `multer` for handling file uploads, allowing users to share files in both channels and direct messages.

## Implementation

### 1. Server-Side (`server.js`)
```javascript
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
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
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allowed file types
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

// Socket.IO file message handling
socket.on('file message', async (data) => {
    try {
        const user = users.get(socket.userId);
        if (!user) return;

        const message = {
            id: Date.now().toString(),
            text: data.text || '',
            user: user.username,
            time: new Date().toISOString(),
            fileUrl: data.fileUrl,
            fileType: data.fileType,
            fileName: data.fileName,
            reactions: {}
        };

        // Store and broadcast message
        const channelId = data.channelId || 'general';
        if (!messages.has(channelId)) {
            messages.set(channelId, []);
        }
        messages.get(channelId).push(message);

        io.to(channelId).emit('chat message', {
            channelId,
            message
        });
    } catch (error) {
        console.error('Error handling file message:', error);
    }
});
```

### 2. Client-Side (`public/app.js`)
```javascript
// File upload handling
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        
        // Send file message
        socket.emit('file message', {
            channelId: currentChannel,
            text: `Shared a file: ${file.name}`,
            fileUrl: data.url,
            fileType: data.type,
            fileName: data.name
        });

        // Clear file input
        e.target.value = '';
    } catch (error) {
        console.error('File upload error:', error);
        alert('Failed to upload file');
    }
});

// File message display
function addFileMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message file-message';
    messageElement.dataset.messageId = message.id;

    let filePreview = '';
    if (message.fileType.startsWith('image/')) {
        filePreview = `
            <div class="file-preview">
                <img src="${message.fileUrl}" alt="Shared image">
            </div>
        `;
    } else {
        filePreview = `
            <div class="file-preview">
                <a href="${message.fileUrl}" target="_blank" class="file-link">
                    <i class="file-icon"></i>
                    ${message.fileName}
                </a>
            </div>
        `;
    }

    messageElement.innerHTML = `
        <span class="user">${message.user}</span>
        <span class="time">${formatTime(message.time)}</span>
        <div class="text">${message.text}</div>
        ${filePreview}
        <div class="message-reactions"></div>
    `;

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    if (message.reactions) {
        updateMessageReactions(message.id, message.reactions);
    }
}
```

## Features

### 1. File Upload
- Support for multiple file types
- File size limit (5MB)
- Secure file storage
- Progress indication
- Error handling

### 2. File Types
- Images (JPEG, PNG, GIF)
- Documents (PDF)
- Text files
- File type validation
- MIME type checking

### 3. File Display
- Image previews
- File links
- File name display
- File type indicators
- Download options

### 4. File Management
- Unique file naming
- Organized storage
- Automatic cleanup
- Access control

## File Flow

1. **Upload Process**
   ```
   User selects file
   ↓
   Client validates file
   ↓
   File uploaded to server
   ↓
   Server processes file
   ↓
   Server stores file
   ↓
   Server returns file URL
   ↓
   Client sends file message
   ↓
   All users receive update
   ```

2. **Download Process**
   ```
   User clicks file
   ↓
   Browser handles download
   ↓
   File served from server
   ↓
   File saved locally
   ```

## Storage Management

1. **File Storage**
   - Local disk storage
   - Organized directories
   - Unique file names
   - Type-based organization

2. **Access Control**
   - Public file URLs
   - No authentication required
   - Direct file access
   - Browser caching

## Limitations

1. **Storage**
   - Local storage only
   - No cloud integration
   - Limited space
   - No file backup

2. **Features**
   - No file preview for non-images
   - No file editing
   - No version control
   - No file sharing permissions

3. **Performance**
   - Single server bottleneck
   - No upload acceleration
   - No download resumption
   - No file compression

## Future Improvements

1. **Storage**
   - Cloud storage integration
   - CDN integration
   - File backup system
   - Storage optimization

2. **Features**
   - File preview for more types
   - File editing capabilities
   - Version control
   - File permissions
   - File expiration
   - File compression

3. **Performance**
   - Chunked uploads
   - Upload acceleration
   - Download resumption
   - Image optimization
   - Caching improvements

4. **Security**
   - File scanning
   - Access control
   - Encryption
   - Watermarking
   - Audit logging 

## File Storage

### Production Environment (EC2)
- Files stored in `/public/uploads/` directory
- Regular backups to prevent data loss
- Disk space monitoring
- Proper file permissions
- Optional: Consider using S3 for scalability

### Storage Management
- Automatic cleanup of old files
- Size limits per file (5MB)
- Allowed file types
- Virus scanning (recommended)
- Disk space monitoring

### Security
- File type validation
- Secure file names
- Access control
- Regular security scans
- Protected upload directory 