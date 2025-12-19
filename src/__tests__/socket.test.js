import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { io as socketClient } from 'socket.io-client';
import prisma from '../config/database.js';
import socketService from '../services/socketService.js';
import dotenv from 'dotenv';

dotenv.config();

describe('Socket.IO Integration', () => {
  let httpServer;
  let io;
  let testUser1;
  let testUser2;
  let token1;
  let token2;

  beforeAll(async () => {
    // Create test users
    const password1 = await bcrypt.hash('password123', 10);
    const password2 = await bcrypt.hash('password123', 10);

    testUser1 = await prisma.user.create({
      data: {
        username: `socket_test_user1_${Date.now()}`,
        email: `socket_test1_${Date.now()}@example.com`,
        password: password1,
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        username: `socket_test_user2_${Date.now()}`,
        email: `socket_test2_${Date.now()}@example.com`,
        password: password2,
      },
    });

    token1 = jwt.sign({ userId: testUser1.id }, process.env.JWT_SECRET);
    token2 = jwt.sign({ userId: testUser2.id }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUser1.id, testUser2.id] },
      },
    });
    await prisma.$disconnect();
  });

  beforeEach((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    socketService.initialize(io);
    
    // Mock authentication middleware
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.user = { id: decoded.userId, username: 'test' };
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      socketService.handleConnection(socket);
    });

    httpServer.listen(() => {
      done();
    });
  });

  afterEach((done) => {
    io.close();
    httpServer.close(() => {
      done();
    });
  });

  it('should connect with valid token', (done) => {
    const socket = socketClient(`http://localhost:${httpServer.address().port}`, {
      auth: { token: token1 },
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });

    socket.on('connect_error', (error) => {
      done(error);
    });
  });

  it('should fail to connect with invalid token', (done) => {
    const socket = socketClient(`http://localhost:${httpServer.address().port}`, {
      auth: { token: 'invalid-token' },
    });

    socket.on('connect_error', (error) => {
      expect(error.message).toContain('Authentication');
      socket.disconnect();
      done();
    });
  });

  it('should send and receive messages', (done) => {
    const socket1 = socketClient(`http://localhost:${httpServer.address().port}`, {
      auth: { token: token1 },
    });
    const socket2 = socketClient(`http://localhost:${httpServer.address().port}`, {
      auth: { token: token2 },
    });

    let socket1Connected = false;
    let socket2Connected = false;

    const trySendMessage = () => {
      if (socket1Connected && socket2Connected) {
        // Set up listener before sending
        socket2.on('message:received', (message) => {
          expect(message).toHaveProperty('content');
          expect(message).toHaveProperty('senderId', testUser1.id);
          expect(message).toHaveProperty('receiverId', testUser2.id);
          
          socket1.disconnect();
          socket2.disconnect();
          done();
        });

        // Small delay to ensure listener is set up
        setTimeout(() => {
          socket1.emit('message:send', {
            content: 'Test message',
            receiverId: testUser2.id,
          });
        }, 100);
      }
    };

    socket1.on('connect', () => {
      socket1Connected = true;
      trySendMessage();
    });

    socket2.on('connect', () => {
      socket2Connected = true;
      trySendMessage();
    });

    socket1.on('connect_error', (err) => done(err));
    socket2.on('connect_error', (err) => done(err));
  }, 10000);

  it('should track online status', (done) => {
    const socket = socketClient(`http://localhost:${httpServer.address().port}`, {
      auth: { token: token1 },
    });

    socket.on('connect', () => {
      socket.on('user:online', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('status', true);
        socket.disconnect();
        done();
      });
    });
  });
});

