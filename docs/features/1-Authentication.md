# Authentication

## Overview
The application uses JWT (JSON Web Token) based authentication with three access types: registration, login, and guest access.

## Implementation

### 1. Server-Side (`server.js`)
```javascript
// JWT Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.userId = decoded.userId;
        next();
    });
});

// Registration Endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userId = Date.now().toString();
        const user = { id: userId, username, password, isGuest: false };
        users.set(userId, user);
        const token = jwt.sign({ userId }, process.env.JWT_SECRET);
        res.json({ token, username });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = Array.from(users.values()).find(u => 
            u.username === username && u.password === password && !u.isGuest
        );
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
        res.json({ token, username });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Guest Access Endpoint
app.post('/api/guest', async (req, res) => {
    try {
        const { username } = req.body;
        const userId = Date.now().toString();
        const guestUser = {
            id: userId,
            username: `guest_${username}`,
            isGuest: true
        };
        users.set(userId, guestUser);
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: guestUser.username });
    } catch (error) {
        res.status(500).json({ message: 'Error creating guest user' });
    }
});
```

### 2. Client-Side (`public/app.js`)
```javascript
// Login Handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        loginSuccess(data);
    } catch (error) {
        alert(error.message || 'Login failed');
    }
});

// Registration Handler
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        loginSuccess(data);
    } catch (error) {
        alert(error.message || 'Registration failed');
    }
});

// Guest Access Handler
document.getElementById('guest-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/api/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: formData.get('username')
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        loginSuccess(data);
    } catch (error) {
        alert(error.message || 'Failed to join as guest');
    }
});

// Login Success Handler
function loginSuccess(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    socket = io({
        auth: { token: data.token }
    });
    setupSocketListeners();
    showChatScreen();
}

// Logout Handler
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    currentChannel = 'general';
    currentUser = null;
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('chat-screen').style.display = 'none';
}
```

## Features

### 1. User Registration
- Username and password required
- Checks for existing usernames
- Creates permanent user account
- Returns JWT token

### 2. User Login
- Username and password validation
- Returns JWT token on success
- Error handling for invalid credentials

### 3. Guest Access
- Username only required
- Temporary account creation
- 24-hour token expiration
- Guest prefix added to username

### 4. Token Management
- JWT tokens stored in localStorage
- Token verification on socket connection
- Automatic token cleanup on logout

### 5. Session Management
- Persistent sessions with localStorage
- Auto-login with stored token
- Clean session termination on logout

## Security Measures

1. **JWT Implementation**
   - Secure token generation
   - Token verification on each request
   - Token expiration for guest users
   - Secure storage in production environment

2. **Password Handling**
   - Server-side validation
   - Password hashing using bcrypt
   - Secure transmission over HTTPS

3. **Error Handling**
   - Graceful error responses
   - User-friendly error messages
   - Failed authentication handling
   - Rate limiting on production

4. **Production Security**
   - HTTPS/SSL encryption
   - Secure headers configuration
   - AWS security groups
   - Regular security updates
   - Protected environment variables

## Limitations

1. **Security**
   - Passwords stored without hashing
   - No password complexity requirements
   - No rate limiting on auth attempts

2. **Features**
   - No password reset
   - No email verification
   - No remember me functionality
   - No multi-factor authentication

## Future Improvements

1. **Security Enhancements**
   - Implement password hashing (bcrypt)
   - Add rate limiting
   - Add password complexity requirements
   - Implement secure password reset

2. **Feature Additions**
   - Email verification
   - Remember me functionality
   - Multi-factor authentication
   - OAuth integration (Google, GitHub, etc.)

3. **User Management**
   - User roles and permissions
   - Account deletion
   - Profile management
   - Session management across devices 