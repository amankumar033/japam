import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true }
    });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    next(new Error('Authentication error: ' + error.message));
  }
};

export const authenticateHTTP = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        message: 'No authentication token provided. Please include a valid JWT token in the Authorization header.',
        instructions: {
          header: 'Authorization: Bearer <your-jwt-token>',
          howToGetToken: 'Register at POST /api/auth/register or login at POST /api/auth/login'
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found',
        message: 'The user associated with this token no longer exists.',
        suggestion: 'Please register a new account or contact support'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid or malformed.',
        suggestion: 'Please login again to get a new token at POST /api/auth/login'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expired',
        message: 'Your authentication token has expired.',
        suggestion: 'Please login again to get a new token at POST /api/auth/login',
        tokenExpiredAt: error.expiredAt
      });
    }
    res.status(401).json({ 
      success: false,
      error: 'Authentication failed',
      message: 'Unable to authenticate your request.',
      suggestion: 'Please check your token and try again, or login at POST /api/auth/login'
    });
  }
};


