# Authentication

## Overview

The authentication system uses JWT tokens for secure user authentication, with bcrypt for password hashing and secure session management.

## Environment Setup

Required variables in `.env`:
```bash
# Security
JWT_SECRET="your-secret-key"
SESSION_SECRET="your-session-secret"

# Optional
JWT_EXPIRY="24h"  # Token expiration time
```

## Implementation

### Server-side (server.js)
- JWT token generation and validation
- Password hashing with bcrypt
- Session management with express-session
- Rate limiting on auth endpoints

### Client-side (public/app.js)
- Token storage in localStorage
- Automatic token refresh
- Session expiry handling
- Login/register form validation

## Security Measures

1. Password Security:
   - Bcrypt hashing with salt rounds
   - Minimum password requirements
   - Password change functionality

2. Session Management:
   - Secure session cookies
   - Token expiration
   - Session invalidation on logout

3. Rate Limiting:
   - Login attempt limits
   - Account lockout protection
   - IP-based rate limiting

4. Input Validation:
   - Email format validation
   - Username requirements
   - Password complexity rules

## API Endpoints

```javascript
// Register new user
POST /api/auth/register
{
  username: string,
  email: string,
  password: string
}

// Login user
POST /api/auth/login
{
  email: string,
  password: string
}

// Logout user
POST /api/auth/logout

// Refresh token
POST /api/auth/refresh
```

## Error Handling

- Invalid credentials
- Account lockout
- Rate limit exceeded
- Token expiration
- Validation errors

## Future Improvements

- Two-factor authentication
- OAuth integration
- Password reset functionality
- Session device management 