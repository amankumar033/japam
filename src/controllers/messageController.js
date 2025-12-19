import prisma from '../config/database.js';
import { messageSchema, chatHistorySchema } from '../utils/validation.js';

export const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const validatedData = chatHistorySchema.parse({
      userId,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Verify the other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, username: true, email: true },
    });

    if (!otherUser) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found',
        message: `No user found with ID: ${validatedData.userId}`,
        suggestion: 'Please verify the user ID and try again'
      });
    }

    // Get messages between current user and the other user
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: req.user.id,
            receiverId: validatedData.userId,
          },
          {
            senderId: validatedData.userId,
            receiverId: req.user.id,
          },
        ],
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
      orderBy: {
        createdAt: 'desc',
      },
      take: validatedData.limit,
      skip: validatedData.offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.message.count({
      where: {
        OR: [
          {
            senderId: req.user.id,
            receiverId: validatedData.userId,
          },
          {
            senderId: validatedData.userId,
            receiverId: req.user.id,
          },
        ],
      },
    });

    const reversedMessages = messages.reverse(); // Reverse to show oldest first

    res.status(200).json({
      success: true,
      message: `Retrieved ${reversedMessages.length} message(s) from chat with ${otherUser.username}`,
      data: {
        messages: reversedMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: {
            id: msg.sender.id,
            username: msg.sender.username,
            email: msg.sender.email
          },
          receiver: {
            id: msg.receiver.id,
            username: msg.receiver.username,
            email: msg.receiver.email
          },
          read: msg.read,
          createdAt: msg.createdAt,
          isFromCurrentUser: msg.senderId === req.user.id
        })),
        chatWith: {
          id: otherUser.id,
          username: otherUser.username,
          email: otherUser.email
        },
        pagination: {
          total: totalCount,
          limit: validatedData.limit,
          offset: validatedData.offset,
          hasMore: totalCount > validatedData.offset + validatedData.limit,
          totalPages: Math.ceil(totalCount / validatedData.limit),
          currentPage: Math.floor(validatedData.offset / validatedData.limit) + 1
        }
      },
      instructions: {
        note: 'Messages are ordered from oldest to newest',
        nextPage: totalCount > validatedData.offset + validatedData.limit 
          ? `Use offset=${validatedData.offset + validatedData.limit} to get next page`
          : 'No more messages available',
        realTimeMessaging: 'Use Socket.IO to send/receive messages in real-time'
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        success: false,
        error: 'Validation error',
        message: 'Please check your request parameters. The following fields have errors:',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.input
        })),
        example: {
          userId: 'uuid-format (required)',
          limit: '1-100 (optional, default: 50)',
          offset: '0 or greater (optional, default: 0)'
        }
      });
    }
    console.error('Get chat history error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching chat history. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};


