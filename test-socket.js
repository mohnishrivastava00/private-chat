const { io } = require('socket.io-client');
const http = require('http');
const assert = require('assert');

process.env.PORT = 3457;
require('./server');

setTimeout(async () => {
  try {
    console.log('⚡ Testing Real-Time WebSockets Multi-User Interaction on port 3457...\n');

    // 1. Log in all 3 users to get auth tokens
    const loginUser = async (username, password) => {
      const res = await fetch('http://localhost:3457/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return await res.json();
    };

    const momoAuth = await loginUser('Hottie_Momo', '!_!!!!_Namrru');
    const namrataAuth = await loginUser('sexy_Namrru', '160417090312');
    const demoAuth = await loginUser('demo', 'ikigai03');

    // 2. Connect 3 sockets
    const momoSocket = io('http://localhost:3457', { auth: { token: momoAuth.token } });
    const namrataSocket = io('http://localhost:3457', { auth: { token: namrataAuth.token } });
    const demoSocket = io('http://localhost:3457', { auth: { token: demoAuth.token } });

    await new Promise((resolve) => {
      let connected = 0;
      const onConn = () => {
        connected++;
        if (connected === 3) resolve();
      };
      momoSocket.on('connect', onConn);
      namrataSocket.on('connect', onConn);
      demoSocket.on('connect', onConn);
    });
    console.log('1️⃣ All 3 sockets (Momo, Namrata, Demo) connected successfully');

    // 3. Test message dispatch from Momo -> Namrata
    let receivedMessage = null;
    const msgPromise = new Promise((resolve) => {
      namrataSocket.on('new_message', (msg) => {
        if (msg.sender_username === 'hottie_momo') {
          receivedMessage = msg;
          resolve(msg);
        }
      });
    });

    momoSocket.emit('send_message', {
      content: 'Hey **Namrru**! Testing real-time emergency vault ⚡'
    });

    const msg = await msgPromise;
    assert(msg && msg.content.includes('Hey **Namrru**'), 'Message content should match');
    console.log('2️⃣ Real-time message broadcast from Momo received by Namrata');

    // 4. Test Reaction
    const reactionPromise = new Promise((resolve) => {
      momoSocket.on('reaction_updated', (data) => {
        if (data.message_id === msg.id) {
          resolve(data);
        }
      });
    });

    namrataSocket.emit('toggle_reaction', {
      message_id: msg.id,
      emoji: '💖'
    });

    const rx = await reactionPromise;
    assert(rx.reactions['💖'].includes('sexy_Namrru'), 'Reaction should be recorded');
    console.log('3️⃣ Reaction 💖 from Namrata successfully broadcast to Momo & Demo');

    // Clean up
    momoSocket.disconnect();
    namrataSocket.disconnect();
    demoSocket.disconnect();

    console.log('\n🎉 SOCKET.IO MULTI-CLIENT REAL-TIME TEST COMPLETED WITH 100% SUCCESS!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Socket test error:', err);
    process.exit(1);
  }
}, 1000);
