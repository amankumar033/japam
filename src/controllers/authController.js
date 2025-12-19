import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { generateToken } from '../utils/jwt.js';
import { registerSchema, loginSchema } from '../utils/validation.js';

export const register = async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
      select: { id: true, username: true, email: true }
    });

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true, username: true, email: true }
    });

    // Build detailed error messages based on what exists
    if (existingUsername && existingEmail) {
      // Both exist - check if it's the same user
      if (existingUsername.id === existingEmail.id) {
        // Same user - both username and email belong to the same account
        return res.status(400).json({
          success: false,
          error: 'Account already exists',
          message: `An account with username "${validatedData.username}" and email "${validatedData.email}" already exists.`,
          details: {
            conflicts: [
              {
                field: 'username',
                message: `The username "${validatedData.username}" is already taken. Please choose a different username.`,
                existingValue: validatedData.username
              },
              {
                field: 'email',
                message: `The email "${validatedData.email}" is already registered. Please use a different email address.`,
                existingValue: validatedData.email
              }
            ],
            isSameAccount: true
          },
          suggestions: [
            `Choose a different username (e.g., "${validatedData.username}1", "${validatedData.username}_new")`,
            `Use a different email address`,
            `If this is your account, try logging in at POST /api/auth/login instead`
          ],
          action: 'Try logging in at POST /api/auth/login if this is your account'
        });
      } else {
        // Different users - both username and email are taken by different accounts
        return res.status(400).json({
          success: false,
          error: 'Username and email already taken',
          message: `Both the username "${validatedData.username}" and email "${validatedData.email}" are already taken by different accounts.`,
          details: {
            conflicts: [
              {
                field: 'username',
                message: `The username "${validatedData.username}" is already taken by another user. Please choose a different username.`,
                existingValue: validatedData.username,
                takenBy: existingUsername.email
              },
              {
                field: 'email',
                message: `The email "${validatedData.email}" is already registered to another user. Please use a different email address.`,
                existingValue: validatedData.email,
                takenBy: existingEmail.username
              }
            ],
            isSameAccount: false
          },
          suggestions: [
            `Choose a different username (e.g., "${validatedData.username}1", "${validatedData.username}_new")`,
            `Use a different email address`,
            `Try a combination of different username and email`
          ]
        });
      }
    } else if (existingUsername) {
      // Only username exists
      return res.status(400).json({
        success: false,
        error: 'Username already taken',
        message: `The username "${validatedData.username}" is already taken. Please choose a different username.`,
        details: {
          conflicts: [
            {
              field: 'username',
              message: `The username "${validatedData.username}" is already in use. Please choose another username.`,
              existingValue: validatedData.username,
              suggestion: `Try variations like "${validatedData.username}1", "${validatedData.username}_new", or "${validatedData.username}2024"`
            }
          ],
          emailAvailable: true
        },
        suggestions: [
          `Choose a different username (e.g., "${validatedData.username}1", "${validatedData.username}_new")`,
          `Add numbers or underscores to make it unique`,
          `Try a completely different username`
        ]
      });
    } else if (existingEmail) {
      // Only email exists
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
        message: `The email "${validatedData.email}" is already registered. Please use a different email address.`,
        details: {
          conflicts: [
            {
              field: 'email',
              message: `The email "${validatedData.email}" is already registered to an account. Please use a different email address.`,
              existingValue: validatedData.email,
              suggestion: `If this is your account, try logging in at POST /api/auth/login instead`
            }
          ],
          usernameAvailable: true
        },
        suggestions: [
          `Use a different email address`,
          `If this is your account, try logging in at POST /api/auth/login instead`,
          `Check if you already have an account with this email`
        ],
        action: 'Try logging in at POST /api/auth/login if this is your account'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      }
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        token: token,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      },
      instructions: {
        nextSteps: [
          'Use the token in Authorization header for protected endpoints',
          'Format: Authorization: Bearer <token>',
          'Connect to Socket.IO using this token for real-time messaging',
          'Token expires in: ' + (process.env.JWT_EXPIRES_IN || '7d')
        ],
        socketConnection: 'Connect to ws://localhost:3000 with auth: { token: "' + token + '" }'
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      const fieldErrors = error.errors.map(err => {
        const field = err.path.join('.');
        let formattedMessage = err.message;
        
        // Add more context to common validation errors
        if (field === 'username') {
          if (err.message.includes('too small')) {
            formattedMessage = `Username must be at least 3 characters long. You provided "${err.input || ''}" which is too short.`;
          } else if (err.message.includes('too big')) {
            formattedMessage = `Username must be at most 30 characters long. You provided "${err.input || ''}" which is too long.`;
          }
        } else if (field === 'email') {
          formattedMessage = `Please provide a valid email address. You provided "${err.input || ''}" which is not a valid email format.`;
        } else if (field === 'password') {
          if (err.message.includes('too small')) {
            formattedMessage = `Password must be at least 6 characters long. Your password is too short.`;
          }
        }
        
        return {
          field: field,
          message: formattedMessage,
          received: err.input || null,
          requirement: field === 'username' ? '3-30 characters' :
                       field === 'email' ? 'Valid email format (e.g., user@example.com)' :
                       field === 'password' ? 'Minimum 6 characters' : 'Check requirements'
        };
      });

      return res.status(400).json({ 
        success: false,
        error: 'Validation error',
        message: `Please fix the following ${fieldErrors.length} error(s) in your registration data:`,
        details: fieldErrors,
        formattedErrors: fieldErrors.map(err => `• ${err.field}: ${err.message}`),
        example: {
          username: 'johndoe (3-30 characters, letters, numbers, underscores)',
          email: 'john@example.com (must be a valid email format)',
          password: 'password123 (minimum 6 characters, recommended: mix of letters and numbers)'
        },
        suggestions: [
          'Check each field above and correct the errors',
          'Make sure username is 3-30 characters',
          'Ensure email is in valid format (e.g., user@domain.com)',
          'Password must be at least 6 characters long'
        ]
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

export const login = async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password. Please check your credentials and try again.',
        suggestion: 'If you don\'t have an account, register at POST /api/auth/register'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(validatedData.password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password. Please check your credentials and try again.',
        suggestion: 'Make sure you\'re using the correct password for this account'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        token: token,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      },
      instructions: {
        nextSteps: [
          'Use this token in Authorization header for protected endpoints',
          'Format: Authorization: Bearer <token>',
          'Connect to Socket.IO using this token for real-time messaging',
          'Get chat history: GET /api/messages/history/:userId'
        ],
        socketConnection: 'Connect to ws://localhost:3000 with auth: { token: "' + token + '" }'
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        success: false,
        error: 'Validation error',
        message: 'Please check your input data. The following fields have errors:',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.input
        })),
        example: {
          email: 'john@example.com (valid email)',
          password: 'password123 (required)'
        }
      });
    }
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};


