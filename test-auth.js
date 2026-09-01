const bcrypt = require('bcryptjs');
const db = require('./database');
const assert = require('assert');

console.log('🧪 Starting Automated Tests for Private Space Platform...\n');

// 1. Check user accounts in database
console.log('1️⃣ Testing User Account Lookups (Case-Insensitive)...');

const namrataUser1 = db.getUserByUsername('sexy_Namrru');
const namrataUser2 = db.getUserByUsername('SEXY_NAMRRU');
const namrataUser3 = db.getUserByUsername('sexy_namrru');
assert(namrataUser1 !== null, 'sexy_Namrru should exist');
assert(namrataUser2 !== null, 'SEXY_NAMRRU lookup should match');
assert(namrataUser3 !== null, 'sexy_namrru lookup should match');
console.log('   ✅ sexy_Namrru case-insensitive lookup passed');

const momoUser1 = db.getUserByUsername('Hottie_Momo');
const momoUser2 = db.getUserByUsername('hottie_momo');
assert(momoUser1 !== null, 'Hottie_Momo should exist');
assert(momoUser2 !== null, 'hottie_momo lookup should match');
console.log('   ✅ Hottie_Momo case-insensitive lookup passed');

const demoUser1 = db.getUserByUsername('demo');
const demoUser2 = db.getUserByUsername('DEMO');
assert(demoUser1 !== null, 'demo user should exist');
assert(demoUser2 !== null, 'DEMO lookup should match');
console.log('   ✅ demo case-insensitive lookup passed');

// 2. Check Password Verification (Exact & Case-Sensitive)
console.log('\n2️⃣ Testing Password Verification (Case-Sensitive)...');

// Namrata password check
assert(bcrypt.compareSync('160417090312', namrataUser1.password_hash) === true, 'Namrata valid password must match');
assert(bcrypt.compareSync('wrong_pass', namrataUser1.password_hash) === false, 'Namrata invalid password must fail');
console.log('   ✅ Namrata password (160417090312) verified successfully');

// Momo password check
assert(bcrypt.compareSync('!_!!!!_Namrru', momoUser1.password_hash) === true, 'Momo valid password must match');
assert(bcrypt.compareSync('!_!!!!_namrru', momoUser1.password_hash) === false, 'Momo wrong case password must fail');
console.log('   ✅ Momo password (!_\u0021\u0021\u0021\u0021_Namrru) verified successfully (strict casing enforced)');

// Demo password check
assert(bcrypt.compareSync('ikigai03', demoUser1.password_hash) === true, 'Demo valid password must match');
assert(bcrypt.compareSync('demo', demoUser1.password_hash) === false, 'Old demo password must fail');
console.log('   ✅ Demo password (ikigai03) verified successfully');

// 3. Testing Message Flow & Persistence
console.log('\n3️⃣ Testing Message Flow & Persistence in SQLite...');

const msg1 = db.addMessage({
  sender: 'Hottie_Momo',
  sender_username: 'hottie_momo',
  content: 'Hello **Namrata**! Welcome to our private space 💖'
});
assert(msg1.id > 0, 'Message 1 must be inserted with an ID');

const msg2 = db.addMessage({
  sender: 'sexy_Namrru',
  sender_username: 'sexy_namrru',
  content: 'Hey Momo! It works smoothly with *zero lag* 🌸'
});
assert(msg2.id > 0, 'Message 2 must be inserted with an ID');

const recent = db.getRecentMessages(10);
assert(recent.length >= 2, 'Must retrieve at least 2 messages');
console.log(`   ✅ Retrieved ${recent.length} persisted messages from SQLite`);

// 4. Testing Reaction Toggle
console.log('\n4️⃣ Testing Emoji Reactions...');
const reactions1 = db.toggleReaction(msg1.id, 'sexy_Namrru', '❤️');
assert(reactions1['❤️'] && reactions1['❤️'].includes('sexy_Namrru'), 'Reaction ❤️ should be added');

const reactions2 = db.toggleReaction(msg1.id, 'sexy_Namrru', '❤️');
assert(!reactions2['❤️'] || !reactions2['❤️'].includes('sexy_Namrru'), 'Reaction ❤️ should be removed upon second toggle');
console.log('   ✅ Emoji reaction toggle passed');

console.log('\n🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
process.exit(0);
