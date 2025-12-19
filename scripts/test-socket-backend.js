#!/usr/bin/env node

/**
 * Backend-only Socket.IO Client Test Script
 * 
 * This script allows you to test all Socket.IO features without a browser/frontend.
 * Perfect for testing real-time messaging, online/offline status, and typing indicators.
 * 
 * Usage:
 *   node scripts/test-socket-backend.js <token> [serverUrl]
 * 
 * Example:
 *   node scripts/test-socket-backend.js "your-jwt-token-here"
 *   node scripts/test-socket-backend.js "your-jwt-token-here" "http://localhost:3000"
 */

import { SocketClient } from '../src/utils/socketClient.js';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🚀 Backend Socket.IO Client Test Script

Usage:
  node scripts/test-socket-backend.js <token> [serverUrl]

Arguments:
  token      - JWT token from login/register (required)
  serverUrl  - Server URL (optional, default: http://localhost:3000)

Example:
  node scripts/test-socket-backend.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  node scripts/test-socket-backend.js "your-token" "http://localhost:3000"

How to get a token:
  1. Register: POST http://localhost:3000/api/auth/register
  2. Login: POST http://localhost:3000/api/auth/login
  3. Copy the token from the response

Features:
  ✅ Real-time messaging (send/receive)
  ✅ Online/offline status tracking
  ✅ Typing indicators
  ✅ Read receipts
  ✅ Interactive command mode
`);
  process.exit(1);
}

const token = args[0];
const serverUrl = args[1] || process.env.SERVER_URL || 'http://localhost:3000';

console.log(`
╔══════════════════════════════════════════════════════════╗
║     Backend Socket.IO Client - Real-Time Chat Test     ║
╚══════════════════════════════════════════════════════════╝

Server: ${serverUrl}
Token: ${token.substring(0, 20)}...
`);

const client = new SocketClient(serverUrl, token);

client.connect()
  .then(() => {
    console.log('\n✅ Ready! You can now use interactive commands.');
    console.log('📖 Type "help" to see available commands.\n');
    client.startInteractiveMode();
  })
  .catch((error) => {
    console.error('\n❌ Failed to connect:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure the server is running (npm run dev)');
    console.error('  2. Verify your token is valid (not expired)');
    console.error('  3. Check the server URL is correct');
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  client.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down...');
  client.disconnect();
  process.exit(0);
});

