import { io } from 'socket.io-client';
import readline from 'readline';

/**
 * Backend-only Socket.IO client for testing real-time features
 * This allows testing Socket.IO features without a browser/frontend
 */
export class SocketClient {
  constructor(serverUrl, token) {
    this.serverUrl = serverUrl;
    this.token = token;
    this.socket = null;
    this.rl = null;
    this.isConnected = false;
    this.messages = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`\n🔌 Connecting to ${this.serverUrl}...`);
      
      this.socket = io(this.serverUrl, {
        auth: {
          token: this.token
        },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('✅ Connected successfully!');
        console.log(`📡 Socket ID: ${this.socket.id}`);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        console.log(`\n🔌 Disconnected: ${reason}`);
      });

      // Listen for messages
      this.socket.on('message:received', (message) => {
        console.log('\n📨 NEW MESSAGE RECEIVED:');
        console.log(`   From: ${message.sender.username} (${message.sender.email})`);
        console.log(`   Content: ${message.content}`);
        console.log(`   Time: ${new Date(message.createdAt).toLocaleString()}`);
        this.messages.push(message);
      });

      this.socket.on('message:sent', (message) => {
        console.log('\n✅ Message sent successfully!');
        console.log(`   To: ${message.receiver.username}`);
        console.log(`   Content: ${message.content}`);
      });

      this.socket.on('message:error', (error) => {
        console.error('\n❌ Message error:', error.error);
        if (error.details) {
          console.error('   Details:', error.details);
        }
      });

      // Listen for user status
      this.socket.on('user:online', (data) => {
        console.log(`\n✅ User online: ${data.userId}`);
      });

      this.socket.on('user:status', (data) => {
        const status = data.status ? '🟢 ONLINE' : '🔴 OFFLINE';
        console.log(`\n👤 User Status Update:`);
        console.log(`   User ID: ${data.userId}`);
        console.log(`   Status: ${status}`);
      });

      // Listen for typing indicators
      this.socket.on('typing:start', (data) => {
        console.log(`\n⌨️  ${data.username || data.userId} is typing...`);
      });

      this.socket.on('typing:stop', (data) => {
        console.log(`\n⌨️  User ${data.userId} stopped typing`);
      });

      // Listen for read receipts
      this.socket.on('message:read', (data) => {
        console.log(`\n✓ Message ${data.messageId} was read by user ${data.readBy}`);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      console.log('\n👋 Disconnected from server');
    }
  }

  sendMessage(receiverId, content) {
    if (!this.isConnected) {
      console.error('❌ Not connected. Please connect first.');
      return;
    }

    console.log(`\n📤 Sending message to ${receiverId}...`);
    this.socket.emit('message:send', {
      content: content,
      receiverId: receiverId
    });
  }

  startTyping(receiverId) {
    if (!this.isConnected) {
      console.error('❌ Not connected. Please connect first.');
      return;
    }

    this.socket.emit('typing:start', {
      receiverId: receiverId
    });
    console.log(`\n⌨️  Typing indicator sent to ${receiverId}`);
  }

  stopTyping(receiverId) {
    if (!this.isConnected) {
      console.error('❌ Not connected. Please connect first.');
      return;
    }

    this.socket.emit('typing:stop', {
      receiverId: receiverId
    });
    console.log(`\n⌨️  Typing stopped for ${receiverId}`);
  }

  markAsRead(messageId) {
    if (!this.isConnected) {
      console.error('❌ Not connected. Please connect first.');
      return;
    }

    this.socket.emit('message:read', {
      messageId: messageId
    });
    console.log(`\n✓ Marked message ${messageId} as read`);
  }

  startInteractiveMode() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n💬 Enter command (type "help" for commands): '
    });

    this.rl.prompt();

    this.rl.on('line', (line) => {
      const input = line.trim();
      const [command, ...args] = input.split(' ');

      switch (command.toLowerCase()) {
        case 'help':
          this.showHelp();
          break;
        case 'send':
          if (args.length < 2) {
            console.log('❌ Usage: send <receiverId> <message>');
          } else {
            const receiverId = args[0];
            const message = args.slice(1).join(' ');
            this.sendMessage(receiverId, message);
          }
          break;
        case 'typing':
          if (args.length < 1) {
            console.log('❌ Usage: typing <receiverId>');
          } else {
            this.startTyping(args[0]);
          }
          break;
        case 'stoptyping':
          if (args.length < 1) {
            console.log('❌ Usage: stoptyping <receiverId>');
          } else {
            this.stopTyping(args[0]);
          }
          break;
        case 'read':
          if (args.length < 1) {
            console.log('❌ Usage: read <messageId>');
          } else {
            this.markAsRead(args[0]);
          }
          break;
        case 'status':
          console.log(`\n📊 Connection Status:`);
          console.log(`   Connected: ${this.isConnected ? '✅ Yes' : '❌ No'}`);
          console.log(`   Socket ID: ${this.socket?.id || 'N/A'}`);
          console.log(`   Messages received: ${this.messages.length}`);
          break;
        case 'disconnect':
          this.disconnect();
          this.rl.close();
          process.exit(0);
          break;
        case 'exit':
        case 'quit':
          this.disconnect();
          this.rl.close();
          process.exit(0);
          break;
        default:
          if (command) {
            console.log(`❌ Unknown command: ${command}. Type "help" for available commands.`);
          }
      }
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.disconnect();
      process.exit(0);
    });
  }

  showHelp() {
    console.log('\n📖 Available Commands:');
    console.log('   send <receiverId> <message>  - Send a message');
    console.log('   typing <receiverId>           - Start typing indicator');
    console.log('   stoptyping <receiverId>        - Stop typing indicator');
    console.log('   read <messageId>              - Mark message as read');
    console.log('   status                        - Show connection status');
    console.log('   disconnect / exit / quit      - Disconnect and exit');
    console.log('   help                           - Show this help message');
  }
}

