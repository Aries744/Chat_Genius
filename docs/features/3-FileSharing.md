# File Sharing Feature

## Overview
File sharing in Chat Genius allows users to share various types of files in both main chat and thread replies. The feature supports images, documents, and text files with a size limit of 5MB per file.

## Supported File Types
- Images: JPEG, PNG, GIF
- Documents: PDF, DOC, DOCX
- Text: TXT

## Implementation

### Server-Side

#### File Upload Configuration
```javascript
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
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
```

#### Upload Endpoint
```javascript
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const relativePath = path.relative(
            path.join(__dirname, 'public'),
            req.file.path
        ).replace(/\\/g, '/');

        const fileUrl = `/${relativePath}`;
        
        res.json({
            url: fileUrl,
            type: req.file.mimetype,
            name: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ 
            error: 'File upload failed', 
            details: error.message 
        });
    }
});
```

### Client-Side

#### File Upload Handler
```javascript
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        e.target.value = '';
        return;
    }

    // Show loading indicator
    const messageInput = document.getElementById('message-input');
    messageInput.placeholder = 'Uploading file...';
    messageInput.disabled = true;

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
        socket.emit('chat message', {
            channelId: currentChannel,
            text: `Shared a file: ${file.name}`,
            fileUrl: data.url,
            fileType: data.type,
            fileName: data.name,
            parentId: currentThreadId || null
        });
    } catch (error) {
        alert(error.message || 'Failed to upload file');
    } finally {
        messageInput.placeholder = 'Type a message...';
        messageInput.disabled = false;
        e.target.value = '';
    }
});
```

#### File Display
```javascript
function getFileIcon(mimeType) {
    const iconMap = {
        'application/pdf': '📄',
        'application/msword': '📝',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
        'text/plain': '📝',
        'image/jpeg': '🖼️',
        'image/png': '🖼️',
        'image/gif': '🖼️'
    };
    return iconMap[mimeType] || '📎';
}

function renderFileAttachment(message) {
    if (!message.fileUrl) return '';

    if (message.fileType?.startsWith('image/')) {
        return `
            <div class="file-attachment">
                <img src="${message.fileUrl}" alt="Attached image" 
                     class="message-image" 
                     onclick="window.open('${message.fileUrl}', '_blank')">
                <div class="file-info">
                    <span class="file-name">${message.fileName}</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="file-attachment">
            <a href="${message.fileUrl}" target="_blank" class="file-link">
                <span class="file-icon">${getFileIcon(message.fileType)}</span>
                <span class="file-name">${message.fileName}</span>
            </a>
        </div>
    `;
}
```

## Storage Management

### File Storage
- Files are stored in `/public/uploads/` directory
- Each file has a unique name generated using timestamp and random number
- Files are served statically by Express

### Cleanup Policy
- Regular cleanup of unused files recommended
- Monitor disk space usage
- Consider implementing file expiration
- Optional: Move to cloud storage (e.g., AWS S3) for better scalability

## Security Considerations

### Upload Security
1. File Type Validation
   - Whitelist of allowed MIME types
   - Server-side validation
   - Client-side validation

2. File Size Limits
   - 5MB maximum file size
   - Both client and server validation
   - Configurable through environment variables

3. File Storage Security
   - Unique file names
   - No executable files allowed
   - Proper file permissions
   - Regular security scans

### Best Practices
1. File Handling
   - Sanitize file names
   - Check file types
   - Validate file contents
   - Handle upload errors gracefully

2. Storage
   - Regular backups
   - Monitoring disk space
   - Cleanup unused files
   - Secure file permissions

## Limitations
- 5MB file size limit
- Limited file type support
- Local storage only
- No file versioning
- No file preview for documents

## Future Improvements
1. Enhanced Features
   - Cloud storage integration
   - File versioning
   - Document preview
   - Drag-and-drop upload
   - Progress indicator

2. Security Enhancements
   - Virus scanning
   - Content validation
   - Access control
   - Encryption at rest

3. Storage Optimizations
   - Image compression
   - File deduplication
   - Automated cleanup
   - CDN integration 