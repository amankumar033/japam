import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { authenticateSocket } from './middleware/auth.js';
import socketService from './services/socketService.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize socket service
socketService.initialize(io);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API information
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Real-Time Chat Backend API',
    version: '1.0.0',
    status: 'running',
    server: {
      port: process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    },
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: 'Check server health status',
        authentication: false
      },
      auth: {
        register: {
          method: 'POST',
          path: '/api/auth/register',
          description: 'Register a new user account',
          authentication: false,
          body: {
            username: 'string (3-30 chars)',
            email: 'string (valid email)',
            password: 'string (min 6 chars)'
          }
        },
        login: {
          method: 'POST',
          path: '/api/auth/login',
          description: 'Login and get JWT token',
          authentication: false,
          body: {
            email: 'string (valid email)',
            password: 'string'
          }
        }
      },
      messages: {
        history: {
          method: 'GET',
          path: '/api/messages/history/:userId',
          description: 'Get chat history with a specific user',
          authentication: true,
          queryParams: {
            limit: 'number (1-100, default: 50)',
            offset: 'number (default: 0)'
          }
        }
      },
      socket: {
        connection: 'Socket.IO WebSocket connection',
        url: `ws://localhost:${process.env.PORT || 3000}`,
        description: 'Real-time messaging, online/offline status, typing indicators',
        authentication: 'Required (JWT token in auth.token)',
        documentation: 'See README.md for Socket.IO events'
      }
    },
    quickStart: {
      step1: 'Register: POST /api/auth/register',
      step2: 'Login: POST /api/auth/login (get token)',
      step3: 'Use token in Authorization header for protected endpoints',
      step4: 'Connect to Socket.IO for real-time features'
    },
    documentation: {
      readme: 'See README.md for complete API documentation',
      testingGuide: 'See TESTING_GUIDE.md for testing instructions',
      realtimeGuide: 'See HOW_TO_TEST_REALTIME.md for Socket.IO testing'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true,
    status: 'ok', 
    service: 'realtime-chat-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      port: process.env.PORT || 3000,
      nodeVersion: process.version
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO authentication middleware
io.use(authenticateSocket);

// Socket.IO connection handling
io.on('connection', (socket) => {
  socketService.handleConnection(socket);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    message: statusCode === 500 
      ? 'An unexpected server error occurred. Please try again later.'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.toString()
    }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    message: `The endpoint ${req.method} ${req.path} does not exist.`,
    availableEndpoints: {
      root: 'GET /',
      health: 'GET /health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      chatHistory: 'GET /api/messages/history/:userId',
      socket: 'WebSocket connection at ws://localhost:3000'
    },
    suggestion: 'Check the root endpoint (GET /) for all available endpoints'
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

