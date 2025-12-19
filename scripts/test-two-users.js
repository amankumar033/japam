#!/usr/bin/env node

/**
 * Backend-only Two-User Chat Test Script
 * 
 * This script demonstrates real-time messaging between two users
 * without needing a browser/frontend.
 * 
 * Usage:
 *   node scripts/test-two-users.js <token1> <token2> [serverUrl]
 * 
 * Example:
 *   node scripts/test-two-users.js "token1" "token2"
 */

import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
🚀 Two-User Socket.IO Chat Test Script

This script demonstrates real-time messaging between two users.

Usage:
  node scripts/test-two-users.js <token1> <token2> [serverUrl]

Arguments:
  token1     - JWT token for User 1 (required)
  token2     - JWT token for User 2 (required)
  serverUrl  - Server URL (optional, default: http://localhost:3000)

Example:
  node scripts/test-two-users.js "token1" "token2"
  node scripts/test-two-users.js "token1" "token2" "http://localhost:3000"

How to get tokens:
  1. Register User 1: POST http://localhost:3000/api/auth/register
  2. Register User 2: POST http://localhost:3000/api/auth/register
  3. Copy tokens from responses
`);
  process.exit(1);
}

const token1 = args[0];
const token2 = args[1];
const serverUrl = args[2] || process.env.SERVER_URL || 'http://localhost:3000';

console.log(`
╔══════════════════════════════════════════════════════════╗
║        Two-User Real-Time Chat Test (Backend Only)      ║
╚══════════════════════════════════════════════════════════╝

Server: ${serverUrl}
User 1 Token: ${token1.substring(0, 20)}...
User 2 Token: ${token2.substring(0, 20)}...
`);

// Connect User 1
console.log('\n🔌 Connecting User 1...');
const socket1 = io(serverUrl, {
  auth: { token: token1 }
});

socket1.on('connect', () => {
  console.log('✅ User 1 connected! Socket ID:', socket1.id);
  
  socket1.on('user:online', (data) => {
    console.log(`✅ User 1 is online: ${data.userId}`);
  });

  socket1.on('message:received', (message) => {
    console.log('\n📨 User 1 received message:');
    console.log(`   From: ${message.sender.username}`);
    console.log(`   Content: ${message.content}`);
    console.log(`   Time: ${new Date(message.createdAt).toLocaleString()}`);
  });

  socket1.on('user:status', (data) => {
    console.log(`\n👤 User 1 sees: User ${data.userId} is ${data.status ? 'ONLINE' : 'OFFLINE'}`);
  });

  socket1.on('typing:start', (data) => {
    console.log(`\n⌨️  User 1 sees: ${data.username} is typing...`);
  });

  // Connect User 2 after User 1
  setTimeout(() => {
    console.log('\n🔌 Connecting User 2...');
    const socket2 = io(serverUrl, {
      auth: { token: token2 }
    });

    socket2.on('connect', () => {
      console.log('✅ User 2 connected! Socket ID:', socket2.id);

      socket2.on('user:online', (data) => {
        console.log(`✅ User 2 is online: ${data.userId}`);
      });

      socket2.on('message:received', (message) => {
        console.log('\n📨 User 2 received message:');
        console.log(`   From: ${message.sender.username}`);
        console.log(`   Content: ${message.content}`);
        console.log(`   Time: ${new Date(message.createdAt).toLocaleString()}`);
      });

      socket2.on('user:status', (data) => {
        console.log(`\n👤 User 2 sees: User ${data.userId} is ${data.status ? 'ONLINE' : 'OFFLINE'}`);
      });

      socket2.on('typing:start', (data) => {
        console.log(`\n⌨️  User 2 sees: ${data.username} is typing...`);
      });

      // Get User 2's ID from the token (you'll need to decode it or get it from login)
      // For now, we'll demonstrate with a delay
      setTimeout(() => {
        console.log('\n📤 User 1 sending message to User 2...');
        console.log('   (Note: Replace USER_2_ID with actual user ID from login response)');
        console.log('   Example: socket1.emit("message:send", { content: "Hello!", receiverId: "user-id" })');
        
        // Example - replace USER_2_ID with actual ID
        // socket1.emit('message:send', {
        //   content: 'Hello User 2! This is a real-time message from User 1.',
        //   receiverId: 'USER_2_ID'
        // });

        console.log('\n✅ Both users connected and ready!');
        console.log('📝 To send messages, use:');
        console.log('   socket1.emit("message:send", { content: "Hello!", receiverId: "USER_2_ID" })');
        console.log('   socket2.emit("message:send", { content: "Hi!", receiverId: "USER_1_ID" })');
        console.log('\n💡 Keep this script running to see real-time messages!');
        console.log('   Press Ctrl+C to exit\n');
      }, 2000);
    });

    socket2.on('connect_error', (error) => {
      console.error('❌ User 2 connection error:', error.message);
    });
  }, 1000);
});

socket1.on('connect_error', (error) => {
  console.error('❌ User 1 connection error:', error.message);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  socket1.disconnect();
  process.exit(0);
});

