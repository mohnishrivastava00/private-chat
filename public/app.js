// Private Space Client Application
// Low-data, Zero-bloat, Real-time Communication

(function() {
  'use strict';

  // State
  let currentUser = null;
  let authToken = localStorage.getItem('vault_token');
  let socket = null;
  let soundEnabled = localStorage.getItem('sound_enabled') !== 'false';
  let isTypingTimeout = null;
  let lastTypingEmit = 0;

  // DOM Elements
  const authScreen = document.getElementById('auth-screen');
  const chatScreen = document.getElementById('chat-screen');
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const authError = document.getElementById('auth-error');
  const togglePasswordBtn = document.getElementById('toggle-password-btn');
  const messagesContainer = document.getElementById('messages-container');
  const messagesList = document.getElementById('messages-list');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const typingIndicator = document.getElementById('typing-indicator');
  const typingText = document.getElementById('typing-text');
  const typingAvatar = document.getElementById('typing-avatar');
  const connectionStatusText = document.getElementById('connection-status-text');

  const presenceMomo = document.getElementById('presence-momo');
  const presenceNamrata = document.getElementById('presence-namrata');
  const presenceDemo = document.getElementById('presence-demo');

  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const menuBtn = document.getElementById('menu-btn');
  const optionsMenu = document.getElementById('options-menu');
  const removeDemoBtn = document.getElementById('remove-demo-btn');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const logoutBtn = document.getElementById('logout-btn');

  const quickEmojisContainer = document.getElementById('quick-emojis');
  const moreEmojisToggle = document.getElementById('more-emojis-toggle');
  const emojiDrawer = document.getElementById('emoji-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const extendedEmojiGrid = document.getElementById('extended-emoji-grid');
  const formatButtons = document.querySelectorAll('.fmt-btn');

  // Extended Emojis List
  const EXTENDED_EMOJIS = [
    '❤️','🔥','😂','😍','😘','🥺','🌸','⚡','💋','✨',
    '🙈','💯','🤫','🤍','🥰','🫂','🌹','💖','👀','😈',
    '🎉','🙌','😴','🤤','🥳','😻','🤤','😏','🤪','😎',
    '👑','🧸','🍿','🍕','🍷','☕','🌙','⭐','🌈','💐'
  ];

  // Sound Chime using Web Audio API (0 bytes external network transfer)
  function playChime(type = 'receive') {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'receive') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.28);
      } else {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      }

      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch {
      // Audio context may be restricted before user gesture
    }
  }

  // Formatting Parser (Markdown light)
  function formatMessageText(text) {
    if (!text) return '';
    // Escape HTML to prevent XSS
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Bold **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Italic *text*
    escaped = escaped.replace(/\*(.*?)\*/g, '<i>$1</i>');
    // Strikethrough ~text~
    escaped = escaped.replace(/~(.*?)~/g, '<s>$1</s>');
    // Monospace `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    // URLs to clickable links
    escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

    return escaped;
  }

  // Format Time
  function formatTime(isoString) {
    try {
      const date = isoString ? new Date(isoString) : new Date();
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  // Populate Extended Emoji Drawer
  function initEmojiDrawer() {
    extendedEmojiGrid.innerHTML = '';
    EXTENDED_EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drawer-emoji-item';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        insertTextAtCursor(emoji);
        emojiDrawer.classList.add('hidden');
      });
      extendedEmojiGrid.appendChild(btn);
    });
  }

  // Insert Text at Cursor
  function insertTextAtCursor(textToInsert) {
    const start = messageInput.selectionStart || messageInput.value.length;
    const end = messageInput.selectionEnd || messageInput.value.length;
    const val = messageInput.value;
    messageInput.value = val.substring(0, start) + textToInsert + val.substring(end);
    messageInput.selectionStart = messageInput.selectionEnd = start + textToInsert.length;
    messageInput.focus();
    autoResizeTextarea();
  }

  // Textarea Auto-Resize
  function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  }

  // Formatting Buttons Helper
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.getAttribute('data-format');
      const start = messageInput.selectionStart;
      const end = messageInput.selectionEnd;
      const val = messageInput.value;
      const selected = val.substring(start, end);

      let wrapper = '';
      if (format === 'bold') wrapper = '**';
      else if (format === 'italic') wrapper = '*';
      else if (format === 'strike') wrapper = '~';
      else if (format === 'code') wrapper = '`';

      const replacement = wrapper + (selected || 'text') + wrapper;
      messageInput.value = val.substring(0, start) + replacement + val.substring(end);
      messageInput.focus();
      messageInput.setSelectionRange(start + wrapper.length, start + wrapper.length + (selected ? selected.length : 4));
    });
  });

  // Quick Emoji Bar Clicks
  quickEmojisContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn) return;
    const emoji = btn.getAttribute('data-emoji');
    if (emoji) {
      insertTextAtCursor(emoji);
    }
  });

  moreEmojisToggle.addEventListener('click', () => {
    emojiDrawer.classList.toggle('hidden');
  });

  closeDrawerBtn.addEventListener('click', () => {
    emojiDrawer.classList.add('hidden');
  });

  // Toggle Password Visibility
  togglePasswordBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      togglePasswordBtn.textContent = '🙈';
    } else {
      passwordInput.type = 'password';
      togglePasswordBtn.textContent = '👁️';
    }
  });

  // Authentication Flow
  async function performLogin(username, password) {
    authError.classList.add('hidden');
    authError.textContent = '';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('vault_token', authToken);

      showChatView();
      initSocket();
      loadMessages();
    } catch (err) {
      authError.textContent = err.message;
      authError.classList.remove('hidden');
    }
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = usernameInput.value.trim();
    const p = passwordInput.value;
    if (u && p) {
      performLogin(u, p);
    }
  });

  async function checkExistingAuth() {
    if (!authToken) return;
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        showChatView();
        initSocket();
        loadMessages();
      } else {
        localStorage.removeItem('vault_token');
      }
    } catch {
      // offline or server restarting
    }
  }

  function showChatView() {
    authScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch) {
      messageInput.focus();
    }
  }

  function showAuthView() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    currentUser = null;
    authToken = null;
    localStorage.removeItem('vault_token');
    chatScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
  }

  logoutBtn.addEventListener('click', showAuthView);

  // Load Message History
  async function loadMessages() {
    try {
      const res = await fetch('/api/messages', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        messagesList.innerHTML = '';
        data.messages.forEach(appendMessage);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }

  // Socket Connection
  function initSocket() {
    if (socket) socket.disconnect();

    socket = io('/', {
      auth: { token: authToken },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      connectionStatusText.textContent = 'Connected & Live';
      reportFocusState();
    });

    socket.on('disconnect', () => {
      connectionStatusText.textContent = 'Reconnecting...';
    });

    socket.on('presence_update', ({ onlineUsernames }) => {
      updatePresence(onlineUsernames || []);
    });

    socket.on('new_message', (msg) => {
      appendMessage(msg);
      scrollToBottom();
      if (msg.sender_username !== currentUser.username.toLowerCase()) {
        playChime('receive');
      }
    });

    socket.on('reaction_updated', ({ message_id, reactions }) => {
      updateMessageReactions(message_id, reactions);
    });

    socket.on('message_deleted', ({ message_id }) => {
      const el = document.getElementById(`msg-${message_id}`);
      if (el) el.remove();
    });

    socket.on('history_cleared', () => {
      messagesList.innerHTML = '';
    });

    socket.on('demo_removed', () => {
      if (presenceDemo) presenceDemo.remove();
    });

    let typingSafetyTimeout = null;

    socket.on('user_typing', ({ username, display_name, isTyping }) => {
      clearTimeout(typingSafetyTimeout);
      const u = (username || '').toLowerCase();
      const pill = u === 'hottie_momo' ? presenceMomo : (u === 'sexy_namrru' ? presenceNamrata : presenceDemo);

      if (isTyping) {
        let avatar = '💬';
        if (u === 'sexy_namrru') avatar = '🌸';
        else if (u === 'hottie_momo') avatar = '⚡';
        else if (u === 'demo') avatar = '✨';

        if (typingAvatar) typingAvatar.textContent = avatar;
        if (typingText) typingText.textContent = `${display_name} is typing...`;
        typingIndicator.classList.remove('hidden');
        if (pill) pill.classList.add('is-typing');
        scrollToBottom();

        // Safety timeout to auto-hide if stop event is missed
        typingSafetyTimeout = setTimeout(() => {
          typingIndicator.classList.add('hidden');
          if (pill) pill.classList.remove('is-typing');
        }, 3500);
      } else {
        typingIndicator.classList.add('hidden');
        if (pill) pill.classList.remove('is-typing');
      }
    });
  }

  // Update Presence Indicators (Green = Online in Chat, Blue = Notifications Active)
  function updateUserPill(pillElement, info) {
    if (!pillElement) return;
    const greenDot = pillElement.querySelector('.green-dot');
    const blueDot = pillElement.querySelector('.blue-dot');
    const grayDot = pillElement.querySelector('.gray-dot');
    const tooltipDetail = pillElement.querySelector('.tooltip-status');

    const isOnline = !!info?.isOnline;
    const isNotificationOn = !!info?.isNotificationOn;

    // Display dots
    if (greenDot) greenDot.style.display = isOnline ? 'inline-block' : 'none';
    if (blueDot) blueDot.style.display = isNotificationOn ? 'inline-block' : 'none';
    if (grayDot) grayDot.style.display = (!isOnline && !isNotificationOn) ? 'inline-block' : 'none';

    // Tooltip status text
    if (tooltipDetail) {
      if (isOnline && isNotificationOn) {
        tooltipDetail.innerHTML = '<span style="color:#22c55e">🟢 Online in Chat</span><br><span style="color:#38bdf8">🔵 Notifications Active</span>';
      } else if (isOnline) {
        tooltipDetail.innerHTML = '<span style="color:#22c55e">🟢 Online in Chat</span><br><span style="color:#94a3b8">⚪ Notifications Off</span>';
      } else if (isNotificationOn) {
        tooltipDetail.innerHTML = '<span style="color:#94a3b8">⚪ Offline from Chat</span><br><span style="color:#38bdf8">🔵 Notifications Active</span>';
      } else {
        tooltipDetail.innerHTML = '<span style="color:#64748b">⚪ Offline</span>';
      }
    }
  }

  function updatePresence(presenceMap) {
    if (!presenceMap || typeof presenceMap !== 'object') return;
    updateUserPill(presenceMomo, presenceMap['hottie_momo']);
    updateUserPill(presenceNamrata, presenceMap['sexy_namrru']);
    updateUserPill(presenceDemo, presenceMap['demo']);
  }

  // Append Message to Feed
  function appendMessage(msg) {
    if (!msg) return;
    const isSelf = currentUser && (msg.sender_username === currentUser.username.toLowerCase());
    const isNamrata = msg.sender_username === 'sexy_namrru';
    const isDemo = msg.sender_username === 'demo';

    let userClass = 'other';
    if (isSelf) userClass = 'self';
    else if (isNamrata) userClass = 'namrata';
    else if (isDemo) userClass = 'demo-user';

    const group = document.createElement('div');
    group.className = `msg-group ${userClass}`;
    group.id = `msg-${msg.id}`;

    let avatarSymbol = '💬';
    if (isNamrata) avatarSymbol = '🌸';
    else if (msg.sender_username === 'hottie_momo') avatarSymbol = '⚡';
    else if (isDemo) avatarSymbol = '✨';

    const senderHeader = !isSelf ? `
      <div class="msg-sender-name">
        <span>${avatarSymbol}</span>
        <span>${msg.sender}</span>
      </div>
    ` : '';

    group.innerHTML = `
      ${senderHeader}
      <div class="msg-bubble">
        <div class="msg-text">${formatMessageText(msg.content)}</div>
        <div class="msg-meta">
          <span class="msg-time">${formatTime(msg.created_at)}</span>
          ${isSelf ? '<span class="msg-status">✓✓</span>' : ''}
        </div>
      </div>
      <div class="msg-reactions" id="reactions-${msg.id}"></div>
    `;

    messagesList.appendChild(group);
    if (msg.reactions) {
      updateMessageReactions(msg.id, msg.reactions);
    }
  }

  // Update Reactions UI
  function updateMessageReactions(messageId, reactions) {
    const container = document.getElementById(`reactions-${messageId}`);
    if (!container) return;
    container.innerHTML = '';

    for (const [emoji, users] of Object.entries(reactions || {})) {
      if (!users || users.length === 0) continue;
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'reaction-pill' + (currentUser && users.includes(currentUser.display_name) ? ' reacted' : '');
      pill.innerHTML = `<span>${emoji}</span><span>${users.length}</span>`;
      pill.addEventListener('click', () => {
        if (socket) {
          socket.emit('toggle_reaction', { message_id: messageId, emoji });
        }
      });
      container.appendChild(pill);
    }
  }

  // Send Message Action
  function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !socket) return;

    socket.emit('send_message', { content });
    playChime('send');

    messageInput.value = '';
    autoResizeTextarea();
    messageInput.focus();

    // Reset typing
    if (socket) socket.emit('typing', { isTyping: false });
  }

  // Keyboard Handlers: Enter to Send, Shift+Enter for new line
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener('input', () => {
    autoResizeTextarea();
    const hasText = messageInput.value.trim().length > 0;
    const now = Date.now();

    if (hasText && socket) {
      if (now - lastTypingEmit > 800) {
        socket.emit('typing', { isTyping: true });
        lastTypingEmit = now;
      }
      clearTimeout(isTypingTimeout);
      isTypingTimeout = setTimeout(() => {
        if (socket) socket.emit('typing', { isTyping: false });
      }, 2200);
    } else if (socket) {
      clearTimeout(isTypingTimeout);
      socket.emit('typing', { isTyping: false });
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Sound Toggle
  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sound_enabled', soundEnabled);
    soundToggleBtn.textContent = soundEnabled ? '🔔' : '🔕';
  });
  soundToggleBtn.textContent = soundEnabled ? '🔔' : '🔕';

  // Theme Cycling
  const themes = ['theme-dark', 'theme-amoled', 'theme-rose'];
  let currentThemeIdx = 0;
  const savedTheme = localStorage.getItem('vault_theme') || 'theme-dark';
  currentThemeIdx = themes.indexOf(savedTheme) !== -1 ? themes.indexOf(savedTheme) : 0;
  document.body.className = themes[currentThemeIdx];

  themeToggleBtn.addEventListener('click', () => {
    currentThemeIdx = (currentThemeIdx + 1) % themes.length;
    const newTheme = themes[currentThemeIdx];
    document.body.className = newTheme;
    localStorage.setItem('vault_theme', newTheme);
  });

  // Options Menu Dropdown
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    optionsMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    optionsMenu.classList.add('hidden');
  });

  // Remove Demo User
  removeDemoBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to permanently delete the demo user?')) {
      try {
        const res = await fetch('/api/remove-demo', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          alert('Demo user removed!');
          if (presenceDemo) presenceDemo.remove();
        }
      } catch (err) {
        alert('Failed to remove demo user');
      }
    }
  });

  // Clear Chat History
  clearChatBtn.addEventListener('click', async () => {
    if (confirm('Clear all conversation messages? This cannot be undone.')) {
      try {
        const res = await fetch('/api/clear-history', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          messagesList.innerHTML = '';
        }
      } catch (err) {
        alert('Failed to clear messages');
      }
    }
  });

  // Visual Viewport handler for mobile software keyboards (iOS Safari & Android Chrome)
  if (window.visualViewport) {
    const handleViewportResize = () => {
      if (chatScreen.classList.contains('hidden')) return;
      const currentHeight = window.visualViewport.height;
      chatScreen.style.height = `${currentHeight}px`;
      chatScreen.style.maxHeight = `${currentHeight}px`;
      setTimeout(scrollToBottom, 60);
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
  }

  // Smooth scroll when user focuses input on mobile
  messageInput.addEventListener('focus', () => {
    setTimeout(scrollToBottom, 250);
  });

  // Track Tab Focus / Visibility State
  function reportFocusState() {
    if (!socket || !currentUser) return;
    const isFocused = document.visibilityState === 'visible' && document.hasFocus();
    socket.emit('user_focus_state', { isFocused });
  }

  window.addEventListener('focus', reportFocusState);
  window.addEventListener('blur', reportFocusState);
  document.addEventListener('visibilitychange', reportFocusState);

  // Init
  initEmojiDrawer();
  checkExistingAuth();

})();
