const http = require('http');
const assert = require('assert');

// Start server on a test port
process.env.PORT = 3456;
require('./server');

setTimeout(async () => {
  try {
    console.log('🌐 Testing Server API Endpoints on port 3456...\n');

    // 1. Test Login Endpoint for Namrata
    console.log('1️⃣ Testing /api/login for sexy_namrru...');
    const loginRes1 = await fetch('http://localhost:3456/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sexy_Namrru', password: '160417090312' })
    });
    assert(loginRes1.status === 200, 'Login for Namrata should return 200');
    const loginData1 = await loginRes1.json();
    assert(loginData1.token, 'Token should be returned');
    assert(loginData1.user.display_name === 'sexy_Namrru', 'Display name matches');
    console.log('   ✅ sexy_Namrru logged in successfully, token received');

    // 2. Test Login for Momo
    console.log('2️⃣ Testing /api/login for Hottie_Momo...');
    const loginRes2 = await fetch('http://localhost:3456/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hottie_momo', password: '!_!!!!_Namrru' })
    });
    assert(loginRes2.status === 200, 'Login for Momo should return 200');
    const loginData2 = await loginRes2.json();
    assert(loginData2.token, 'Token should be returned');
    console.log('   ✅ Hottie_Momo logged in successfully');

    // 3. Test Login for Demo
    console.log('3️⃣ Testing /api/login for demo with new password...');
    const loginRes3 = await fetch('http://localhost:3456/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'ikigai03' })
    });
    assert(loginRes3.status === 200, 'Login for demo should return 200');
    console.log('   ✅ demo user logged in successfully with password "ikigai03"');

    // 4. Test Invalid Login
    console.log('4️⃣ Testing /api/login with invalid password...');
    const loginRes4 = await fetch('http://localhost:3456/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sexy_Namrru', password: 'wrongPassword' })
    });
    assert(loginRes4.status === 401, 'Invalid login should return 401');
    console.log('   ✅ Rejected invalid password correctly with 401 Unauthorized');

    // 5. Test Authenticated /api/messages
    console.log('5️⃣ Testing /api/messages endpoint...');
    const msgRes = await fetch('http://localhost:3456/api/messages', {
      headers: { 'Authorization': `Bearer ${loginData1.token}` }
    });
    assert(msgRes.status === 200, '/api/messages should return 200');
    const msgData = await msgRes.json();
    assert(Array.isArray(msgData.messages), 'Messages should be an array');
    console.log(`   ✅ /api/messages returned ${msgData.messages.length} messages`);

    console.log('\n🚀 ALL API ENDPOINTS WORKING PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Server test failed:', err);
    process.exit(1);
  }
}, 1000);
