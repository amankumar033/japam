# 💬 Real-Time One-to-One Chat Backend

A **production-ready real-time chat backend** built with **Node.js, Socket.IO, PostgreSQL, and Prisma**, featuring JWT authentication, presence tracking, and persistent messaging.

---

## 🚀 Features

* ✅ **JWT Authentication** – Secure HTTP & Socket authentication
* ✅ **Real-Time Messaging** – Instant one-to-one chat using Socket.IO
* ✅ **Online / Offline Status** – Real-time presence tracking
* ✅ **Message Persistence** – Chat history stored in PostgreSQL
* ✅ **Production Ready** – Validation, error handling & security best practices
* ✅ **Comprehensive Tests** – Unit & integration tests included

---

## 🧰 Tech Stack

* **Runtime:** Node.js (ES Modules)
* **WebSocket:** Socket.IO v4
* **HTTP Server:** Express.js
* **Database:** PostgreSQL (Prisma ORM)
* **Authentication:** JWT (JSON Web Tokens)
* **Validation:** Zod
* **Testing:** Jest + Supertest

---

## 📦 Prerequisites

* Node.js **v18+**
* npm or yarn
* PostgreSQL database (connection string required)

---

## ⚙️ Installation

### 1️⃣ Clone the Repository

```bash
git clone <your-repo-url>
cd japam
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=DATABASE_URL="postgres://0d7ae37931efef4775bd2bec3725442f1b193533bdcb062c6de0db94b26f639f:sk_pOB5PW2AavISwk3ZAiN80@db.prisma.io:5432/postgres?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="*"
```

> ⚠️ **Important:** Never commit real credentials to GitHub.

---

### 4️⃣ Generate Prisma Client

```bash
npm run prisma:generate
```

### 5️⃣ Run Database Migrations

```bash
npm run prisma:migrate
```

This will create the **users** and **messages** tables.

---

## ▶️ Running the Application

### Development Mode

```bash
npm run dev
```

Server runs at:

```
http://localhost:3000
```

### Production Mode

```bash
npm start
```

---


## 📋 Method 1: Interactive Socket Client (Recommended)

### Step 1: Register User (Get JWT Token)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

* Username & email **must be unique**
* You can also use **Postman**
* Save the returned **JWT token**

---

### Step 2: Run Interactive Socket Client

```bash
node scripts/test-socket-backend.js "YOUR_JWT_TOKEN"
```

---

### Step 3: Available Commands

```text
send <receiverId> <message>   Send a message
typing <receiverId>           Start typing indicator
stoptyping <receiverId>       Stop typing indicator
read <messageId>              Mark message as read
status                        Show connection status
disconnect | exit | quit      Disconnect
help                          Show commands
```

#### Example

```bash
send abc123-user-id Hello, this is a test message!
typing abc123-user-id
stoptyping abc123-user-id
status
exit
```

---

## 🧪 Method 2: HTML Frontend Test Client

### Step 1: Register Users (Browser Console OR Postman)

```javascript
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john',
    email: 'john@test.com',
    password: 'password123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Token:', data.token);
  console.log('User ID:', data.user.id);
});
```

> Repeat for User 2 (change username & email)

---

### Step 2: Test Real-Time Chat

1. Open `test-client.html` in **Tab 1**
2. Paste **User 1 token** → Connect
3. Enter **Receiver ID** → Send message
4. Open `test-client.html` in **Tab 2**
5. Connect using **User 2 token**
6. 🎉 Messages appear instantly

---


## Images

![Socket Test Client – Connected](images/1.png)

![Socket Test Client – Connected](images/2.png)

![Socket Test Client – Connected](images/3.png)

### Step 3: Test Online / Offline Status

* Connect both users
* Check **User Status** section
* Disconnect one user
* Other user sees **offline event**
* Reconnect → status updates automatically

---

## 🎬 Demo Flow

1. `npm run dev`
2. Register **2 users**
3. Open **two browser tabs** with `test-client.html`
4. Connect both users
5. Send messages in real-time ✨
6. Disconnect / reconnect to test presence

---

## 🔗 API Endpoints

### 🔑 Authentication

#### POST `/api/auth/register`

Register a new user

#### POST `/api/auth/login`

Login & receive JWT token

---

### 💬 Messages

#### GET `/api/messages/history/:userId`

Fetch chat history with a user

> 🔒 Requires authentication

---

## 🗂 Project Structure

```text
.
├── src/
│   ├── __tests__/          # Tests
│   │   ├── auth.test.js
│   │   └── socket.test.js
│   ├── config/             # Config
│   │   └── database.js
│   ├── controllers/        # Controllers
│   │   ├── authController.js
│   │   └── messageController.js
│   ├── middleware/         # Middleware
│   │   └── auth.js
│   ├── routes/             # Routes
│   │   ├── authRoutes.js
│   │   └── messageRoutes.js
│   ├── services/           # Socket services
│   │   └── socketService.js
│   ├── utils/              # Utilities
│   │   ├── jwt.js
│   │   └── validation.js
│   └── server.js           # Entry point
├── prisma/
│   └── schema.prisma
├── .env.example
├── jest.config.js
├── nodemon.json
├── package.json
└── README.md
```

---

## ✅ Status

✔ Fully functional
✔ Secure & scalable
✔ Ready for production & frontend integration

---

## 🧑‍💻 Author

Built with ❤️ for real-time applications
