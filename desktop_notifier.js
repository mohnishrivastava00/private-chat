#!/usr/bin/env node

/**
 * Discreet Desktop Notification Sentinel for Kali Linux
 * Listens for messages from Namrata on the live Render private chat
 * and displays disguised academic / AI / JEE / tech flashcards on screen.
 */

const { io } = require('socket.io-client');
const { exec } = require('child_process');
const path = require('path');

const SERVER_URL = process.env.RENDER_URL || 'https://private-chat-1-kt0q.onrender.com';
const USERNAME = 'Hottie_Momo';
const PASSWORD = '!_!!!!_Namrru';

// Curated Steganographic Notification Library
const DISGUISED_TOPICS = [
  {
    title: '🧠 JEE Physics Daily',
    facts: [
      'Thermodynamics: For an isolated system, entropy always increases (ΔS_total > 0).',
      'Rotational Motion: Angular momentum is conserved when net external torque is zero.',
      'Electromagnetism: Induced EMF opposes the rate of change of magnetic flux (Lenz’s Law).',
      'Optics: Brewster angle occurs when reflected and refracted rays are perpendicular.',
      'Modern Physics: Photoelectric effect proves particle nature of light (E = hν - Φ).'
    ]
  },
  {
    title: '⚡ AI & Technology Flash',
    facts: [
      'Transformer Scaling: FlashAttention optimizes GPU SRAM memory IO for long context windows.',
      'Deep Learning: Residual connections prevent vanishing gradient degradation in deep nets.',
      'Mixture of Experts: Sparse gating dynamically routes tokens across specialized expert layers.',
      'Neural Architectures: RMSNorm and RoPE positional embeddings enhance LLM training stability.',
      'AI Acceleration: Tensor core systolic arrays execute FP8 matrix multiply-accumulate at peak FLOPs.'
    ]
  },
  {
    title: '📐 JEE Mathematics Insight',
    facts: [
      'Calculus: Evaluate ∫ f\'(x)/f(x) dx as ln|f(x)| + C before trying integration by parts.',
      'Coordinate Geometry: Normal to y² = 4ax at (am², 2am) is y = -mx + 2am + am³.',
      'Vectors & 3D: Shortest distance between skew lines uses (b₁ × b₂) · (a₂ - a₁) / |b₁ × b₂|.',
      'Complex Numbers: |z₁ + z₂|² + |z₁ - z₂|² = 2(|z₁|² + |z₂|²) represents parallelogram law.',
      'Matrices: For orthogonal matrix A, A · A^T = I and det(A) = ±1.'
    ]
  },
  {
    title: '🔬 JEE Chemistry Alert',
    facts: [
      'Physical Chem: Gibbs free energy ΔG = ΔH - TΔS governs spontaneous reaction equilibrium.',
      'Organic Chem: Carbocation stability follows 3° > 2° > 1° due to hyperconjugation & inductive effect.',
      'Inorganic Chem: Lanthanoid contraction causes similar atomic radii in 4d and 5d series elements.',
      'Coordination: Crystal Field Stabilization Energy (CFSE) splits d-orbitals into t2g and eg sets.',
      'Kinetics: Arrhenius equation k = A·e^(-Ea/RT) models temperature dependence of reaction rate.'
    ]
  },
  {
    title: '🚀 Tech & Quantum Sentinel',
    facts: [
      'Quantum Computing: Superconducting qubits leverage Josephson junction non-linearity.',
      'Linux Kernel: eBPF programs execute in-kernel bytecode verification for zero-overhead telemetry.',
      'Hardware: High Bandwidth Memory (HBM3e) achieves 1.2 TB/s throughput via 3D TSV stacking.',
      'Networking: QUIC protocol replaces TCP handshake with zero-RTT TLS 1.3 multiplexing.'
    ]
  }
];

function getRandomNotification() {
  const category = DISGUISED_TOPICS[Math.floor(Math.random() * DISGUISED_TOPICS.length)];
  const fact = category.facts[Math.floor(Math.random() * category.facts.length)];
  return { title: category.title, body: fact };
}

const VOICE_PHRASES = ['News', 'Task incompleted'];

function playVoiceAlert() {
  const phrase = VOICE_PHRASES[Math.floor(Math.random() * VOICE_PHRASES.length)];
  const voiceCmd = `spd-say -r -5 -p 5 "${phrase}"`;
  exec(voiceCmd, (err) => {
    if (err) {
      exec(`spd-say "${phrase}"`, () => {});
    }
  });
}

function sendDesktopNotification(title, body) {
  const display = process.env.DISPLAY || ':0.0';
  const dbus = process.env.DBUS_SESSION_BUS_ADDRESS || 'unix:path=/run/user/1000/bus';

  // Sanitize for shell
  const safeTitle = title.replace(/"/g, '\\"');
  const safeBody = body.replace(/"/g, '\\"');

  const cmd = `DISPLAY=${display} DBUS_SESSION_BUS_ADDRESS=${dbus} notify-send -u normal -t 5000 "${safeTitle}" "${safeBody}"`;

  exec(cmd, (err) => {
    if (err) {
      console.error('[Notifier] Failed to trigger notify-send:', err.message);
    } else {
      console.log(`[Notifier] 🔔 Disguised notification sent: "${safeTitle}"`);
    }
  });
}

let socket = null;
let lastNotificationTime = 0;
const COOLDOWN_MS = 15000; // Minimum 15 seconds between alerts to prevent spam
let isMomoTabFocused = false;

function isLocalChatWindowActive() {
  return new Promise((resolve) => {
    const display = process.env.DISPLAY || ':0.0';
    exec(`DISPLAY=${display} xdotool getwindowfocus getwindowname 2>/dev/null`, (err, stdout) => {
      if (err || !stdout) return resolve(false);
      const title = stdout.toLowerCase();
      // Check if current focused window is the chat tab / window
      const isChat = title.includes('our private space') || title.includes('private-chat') || title.includes('private space');
      resolve(isChat);
    });
  });
}

async function loginAndConnect() {
  try {
    console.log(`[Notifier] Connecting to ${SERVER_URL}...`);
    const res = await fetch(`${SERVER_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });

    if (!res.ok) {
      throw new Error(`Login failed with status ${res.status}`);
    }

    const data = await res.json();
    const token = data.token;
    console.log('[Notifier] Authenticated successfully. Starting real-time listener...');

    if (socket) {
      socket.disconnect();
    }

    socket = io(SERVER_URL, {
      auth: { token, is_notifier: true },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity
    });

    socket.on('connect', () => {
      console.log('[Notifier] 🟢 Connected and actively monitoring for incoming messages.');
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Notifier] 🟡 Disconnected: ${reason}. Will reconnect automatically.`);
    });

    socket.on('user_focus_update', ({ username, isFocused }) => {
      if ((username || '').toLowerCase() === 'hottie_momo') {
        isMomoTabFocused = !!isFocused;
      }
    });

    socket.on('new_message', async (msg) => {
      // Only handle messages from Namrata (sexy_namrru)
      const sender = (msg.sender_username || '').toLowerCase();
      if (sender !== 'sexy_namrru') return;

      // 1. Check if Momo is actively viewing the chat window / tab
      const isWindowActive = await isLocalChatWindowActive();
      if (isMomoTabFocused || isWindowActive) {
        console.log('[Notifier] 🤫 Momo is currently viewing the chat. Suppressed sound and pop-up.');
        return;
      }

      // 2. Check Cooldown to prevent "NEWS NEWS NEWS" repetition
      const now = Date.now();
      if (now - lastNotificationTime < COOLDOWN_MS) {
        console.log(`[Notifier] ⏳ Alert in cooldown (${Math.round((COOLDOWN_MS - (now - lastNotificationTime))/1000)}s remaining). Suppressed repeated sound.`);
        return;
      }

      lastNotificationTime = now;
      console.log('[Notifier] 📬 New message from Namrata while away. Triggering single stealth notification & voice alert...');
      const { title, body } = getRandomNotification();
      sendDesktopNotification(title, body);
      playVoiceAlert();
    });

  } catch (err) {
    console.error('[Notifier] Connection error:', err.message);
    setTimeout(loginAndConnect, 10000);
  }
}

// Start
loginAndConnect();
