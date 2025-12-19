import prisma from '../config/database.js';
import { messageSchema } from '../utils/validation.js';

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // userId -> Set of socketIds
  }

  initialize(io) {
    this.io = io;
  }

  // Add user to online users
  addOnlineUser(userId, socketId) {
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId).add(socketId);
  }

  // Remove user from online users
  removeOnlineUser(userId, socketId) {
    if (this.onlineUsers.has(userId)) {
      this.onlineUsers.get(userId).delete(socketId);
      if (this.onlineUsers.get(userId).size === 0) {
        this.onlineUsers.delete(userId);
      }
    }
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId) && this.onlineUsers.get(userId).size > 0;
  }

  // Get online status of multiple users
  getOnlineStatus(userIds) {
    const status = {};
    userIds.forEach(userId => {
      status[userId] = this.isUserOnline(userId);
    });
    return status;
  }

  // Handle user connection
  handleConnection(socket) {
    const userId = socket.userId;
    
    // Add user to online users
    this.addOnlineUser(userId, socket.id);

    // Notify user's contacts about online status
    this.broadcastUserStatus(userId, true);

    // Send current online status to the connected user
    socket.emit('user:online', { userId, status: true });

    console.log(`User ${userId} connected (socket: ${socket.id})`);

    // Handle disconnect
    socket.on('disconnect', () => {
      this.removeOnlineUser(userId, socket.id);
      
      // Only notify if user is completely offline
      if (!this.isUserOnline(userId)) {
        this.broadcastUserStatus(userId, false);
        console.log(`User ${userId} disconnected`);
      }
    });

    // Handle sending messages
    socket.on('message:send', async (data) => {
      try {
        const validatedData = messageSchema.parse(data);
        
        // Verify receiver exists
        const receiver = await prisma.user.findUnique({
          where: { id: validatedData.receiverId },
          select: { id: true, username: true, email: true },
        });

        if (!receiver) {
          socket.emit('message:error', { error: 'Receiver not found' });
          return;
        }

        // Prevent self-messaging
        if (validatedData.receiverId === userId) {
          socket.emit('message:error', { error: 'Cannot send message to yourself' });
          return;
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            content: validatedData.content,
            senderId: userId,
            receiverId: validatedData.receiverId,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            receiver: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        });

        // Emit to sender (confirmation)
        socket.emit('message:sent', message);

        // Emit to receiver if online
        if (this.isUserOnline(validatedData.receiverId)) {
          const receiverSockets = this.onlineUsers.get(validatedData.receiverId);
          receiverSockets.forEach(socketId => {
            this.io.to(socketId).emit('message:received', message);
          });
        }

        console.log(`Message sent from ${userId} to ${validatedData.receiverId}`);
      } catch (error) {
        console.error('Message send error:', error);
        if (error.name === 'ZodError') {
          socket.emit('message:error', { 
            error: 'Validation error', 
            details: error.errors 
          });
        } else {
          socket.emit('message:error', { error: 'Failed to send message' });
        }
      }
    });

    // Handle typing indicator
    socket.on('typing:start', (data) => {
      const { receiverId } = data;
      if (this.isUserOnline(receiverId)) {
        const receiverSockets = this.onlineUsers.get(receiverId);
        receiverSockets.forEach(socketId => {
          this.io.to(socketId).emit('typing:start', {
            userId,
            username: socket.user.username,
          });
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { receiverId } = data;
      if (this.isUserOnline(receiverId)) {
        const receiverSockets = this.onlineUsers.get(receiverId);
        receiverSockets.forEach(socketId => {
          this.io.to(socketId).emit('typing:stop', { userId });
        });
      }
    });

    // Handle read receipt
    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message || message.receiverId !== userId) {
          socket.emit('message:error', { error: 'Message not found or unauthorized' });
          return;
        }

        if (!message.read) {
          await prisma.message.update({
            where: { id: messageId },
            data: { read: true },
          });

          // Notify sender if online
          if (this.isUserOnline(message.senderId)) {
            const senderSockets = this.onlineUsers.get(message.senderId);
            senderSockets.forEach(socketId => {
              this.io.to(socketId).emit('message:read', {
                messageId,
                readBy: userId,
              });
            });
          }
        }
      } catch (error) {
        console.error('Read receipt error:', error);
        socket.emit('message:error', { error: 'Failed to mark message as read' });
      }
    });
  }

  // Broadcast user online/offline status to their contacts
  async broadcastUserStatus(userId, isOnline) {
    // Get all users who have exchanged messages with this user
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
      distinct: ['senderId', 'receiverId'],
    });

    const contactIds = new Set();
    messages.forEach(msg => {
      if (msg.senderId !== userId) contactIds.add(msg.senderId);
      if (msg.receiverId !== userId) contactIds.add(msg.receiverId);
    });

    // Notify all contacts
    contactIds.forEach(contactId => {
      if (this.isUserOnline(contactId)) {
        const contactSockets = this.onlineUsers.get(contactId);
        contactSockets.forEach(socketId => {
          this.io.to(socketId).emit('user:status', {
            userId,
            status: isOnline,
          });
        });
      }
    });
  }
}

export default new SocketService();


