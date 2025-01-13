# Chat Genius

A real-time chat application with features like message threading, file sharing, and emoji reactions.

## Features

- Real-time messaging using Socket.IO
- Message threading and replies
- File attachments (images, PDFs, documents)
- Emoji reactions to messages
- User authentication and guest access
- Channel-based communication
- Direct messaging between users

## Tech Stack

- Node.js & Express.js
- Socket.IO for real-time communication
- PostgreSQL with Prisma ORM
- JWT for authentication
- PM2 for process management
- AWS EC2 for hosting

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/Aries744/Chat_Genius.git
cd Chat_Genius
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

4. Set up the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Production Deployment (AWS EC2)

1. SSH into your EC2 instance:
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

2. Install required software:
```bash
# Update system
sudo yum update -y

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 16

# Install PostgreSQL
sudo yum install postgresql14 postgresql14-server
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

3. Clone and setup the application:
```bash
git clone https://github.com/Aries744/Chat_Genius.git
cd Chat_Genius
npm install
npm install -g pm2
```

4. Configure PostgreSQL:
```bash
sudo -u postgres psql
CREATE DATABASE chatgenius;
CREATE USER chatuser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE chatgenius TO chatuser;
```

5. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with production values
```

6. Run database migrations:
```bash
npx prisma migrate deploy
```

7. Start the application with PM2:
```bash
pm2 start server.js --name chat-genius
pm2 save
pm2 startup
```

## Database Management

To clean the database (remove all data):
```bash
node prisma/clean-db.js
```

To reset the database (clean and recreate):
```bash
npx prisma migrate reset
```

## Monitoring and Logs

View application logs:
```bash
pm2 logs chat-genius
```

Monitor application:
```bash
pm2 monit
```

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- File uploads are restricted by type and size
- CORS is configured for production
- Rate limiting is implemented for API endpoints

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 