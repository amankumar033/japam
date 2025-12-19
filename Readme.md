# Real-Time One-to-One Chat Backend


## Features

- ✅ **JWT Authentication** - Secure socket and HTTP endpoint authentication
- ✅ **Real-Time Messaging** - Instant message send/receive via Socket.IO
- ✅ **Online/Offline Status** - Track user presence in real-time
- ✅ **Message Persistence** - Store and retrieve chat history from PostgreSQL
- ✅ **Production Ready** - Error handling, validation, security best practices
- ✅ **Comprehensive Tests** - Unit and integration tests included

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **WebSocket**: Socket.IO v4
- **HTTP Server**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Testing**: Jest + Supertest

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (connection string provided)

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd japam
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgres://***********************"
   JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
   JWT_EXPIRES_IN="7d"
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN="*"
   ```

4. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

   This will create the `users` and `messages` tables in your PostgreSQL database.

## Running the Application

### Development Mode
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

### Production Mode
```bash
npm start
```

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user.


#### POST `/api/auth/login`
Login and get JWT token.


### Messages

#### GET `/api/messages/history/:userId`
Get chat history with a specific user. Requires authentication.




## 📋 Method 1: Interactive Socket Client (Recommended)

### Step 1: Get JWT Token

**Register a user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```
***the username and email should be unique and also you can use postman for this ***

**Save the token** from the response.

### Step 2: Run Interactive Client

```bash
node scripts/test-socket-backend.js "YOUR_JWT_TOKEN_HERE"
```

### Step 3: Use Commands

Once connected, you can use these commands:

```
💬 Enter command (type "help" for commands): help

📖 Available Commands:
   send <receiverId> <message>  - Send a message
   typing <receiverId>           - Start typing indicator
   stoptyping <receiverId>       - Stop typing indicator
   read <messageId>              - Mark message as read
   status                        - Show connection status
   disconnect / exit / quit     - Disconnect and exit
   help                          - Show this help message
```

### Example Usage:

```bash
# Send a message
send abc123-user-id Hello, this is a test message!

# Start typing indicator
typing abc123-user-id

# Stop typing indicator
stoptyping abc123-user-id

# Check status
status

# Disconnect
exit

```

### For Frontend View 🧪 HTML Test Client (Easy Way to Test Real-Time Chat)


## 📋 Complete Step-by-Step Guide

### Step 1: Register Users (Get Tokens)

**In browser console (F12):**
```javascript
// Register User 1
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john',
    email: 'john@test.com',
    password: 'password123'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Token:', data.token);
  console.log('User ID:', data.user.id);
});
```

**Repeat for User 2** (change username/email)

### Step 2: Test Real-Time Messaging

**Option A: Use test-client.html (EASIEST)**
1. Open `test-client.html`
2. Paste token → Connect
3. Enter receiver ID → Send message
4. Open another tab with `test-client.html`
5. Connect with second user's token
6. **Messages appear in real-time!**

**Option B: Browser Console**
```javascript
// User 1 connects
const socket1 = io('http://localhost:3000', {
  auth: { token: 'TOKEN_1' }
});

// User 2 connects (in another tab)
const socket2 = io('http://localhost:3000', {
  auth: { token: 'TOKEN_2' }
});

// User 1 sends message
socket1.emit('message:send', {
  content: 'Hello!',
  receiverId: 'USER_2_ID'
});

// User 2 receives automatically
socket2.on('message:received', (msg) => {
  console.log('Received:', msg.content);
});
```

### Step 3: Test Online/Offline Status

**In test-client.html:**
- Connect both users
- Check "User Status" section - shows online status
- Disconnect one user
- Other user sees "User [id] is offline" in Event Log

**In browser console:**
```javascript
socket.on('user:status', (data) => {
  console.log(`User ${data.userId} is ${data.status ? 'ONLINE' : 'OFFLINE'}`);
});

// Disconnect to test
socket.disconnect();
```

---
## Images

![Socket Test Client – Connected](screenshots/1.png)
![Socket Test Client – Connected](screenshots/2.png)


## 🎬 Quick Demo Flow

1. **Start server:** `npm run dev`
2. **Register 2 users** → Get tokens & user IDs
3. **Open `test-client.html`** in Tab 1 → Connect User 1
4. **Open `test-client.html`** in Tab 2 → Connect User 2
5. **Send message from Tab 1** → See it appear in Tab 2 instantly! ✨
6. **Disconnect Tab 1** → Tab 2 sees "User offline"
7. **Reconnect Tab 1** → Tab 2 sees "User online"

---


## Project Structure

```
.
├── src/
│   ├── __tests__/          # Test files
│   │   ├── auth.test.js
│   │   └── socket.test.js
│   ├── config/             # Configuration files
│   │   └── database.js
│   ├── controllers/         # Route controllers
│   │   ├── authController.js
│   │   └── messageController.js
│   ├── middleware/         # Express middleware
│   │   └── auth.js
│   ├── routes/             # Express routes
│   │   ├── authRoutes.js
│   │   └── messageRoutes.js
│   ├── services/          # Business logic services
│   │   └── socketService.js
│   ├── utils/             # Utility functions
│   │   ├── jwt.js
│   │   └── validation.js
│   └── server.js          # Main server file
├── prisma/
│   └── schema.prisma      # Prisma schema
├── .env.example          # Environment variables example
├── .gitignore
├── jest.config.js        # Jest configuration
├── nodemon.json          # Nodemon configuration
├── package.json
└── README.md
```
