import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(1000),
  receiverId: z.string().uuid(),
});

export const chatHistorySchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});


