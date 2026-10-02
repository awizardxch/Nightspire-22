// ui.js — HUD, overlay, chat, banners.
export function sanitizeName(raw, fallback) {
  const s = (raw || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 16);
  return s || fallback;
}
export function randomName() {
  return 'mage' + Math.floor(100 + Math.random() * 900);
}

export function initUI() {
  const el = (id) => document.getElementById(id);
  const ui = {
    overlay: el('overlay'), hud: el('hud'), status: el('hud-status'),
    chatLog: el('chat-log'), chatInput: el('chat-input'),
    nameInput: el('name-input'), serverInput: el('server-input'),
    enterBtn: el('enter-btn'), banner: el('offline-banner'),
    muteBtn: el('mute-btn'),
    hint: el('hover-hint'),
    onlineCount: 0,
  };
  try {
    ui.nameInput.value = localStorage.getItem('ns22-name') || '';
    ui.serverInput.value = localStorage.getItem('ns22-server') || '';
    ui.nameInput.placeholder = randomName();
  } catch { /* ignore */ }

  ui.setStatus = (s, count = 0) => {
    ui.onlineCount = count;
    ui.status.className = s;
    if (s === 'online') ui.status.textContent = `ONLINE: ${count} mage${count === 1 ? '' : 's'}`;
    else if (s === 'offline') ui.status.textContent = 'OFFLINE: single-player';
    else ui.status.textContent = 'CONNECTING…';
    ui.banner.classList.toggle('hidden', s !== 'offline');
  };

  ui.addChat = (who, text, cls = '') => {
    const div = document.createElement('div');
    if (cls) div.className = cls;
    if (who) {
      const b = document.createElement('span');
      b.className = 'who'; b.textContent = who + ': ';
      div.appendChild(b);
      div.appendChild(document.createTextNode(text));
    } else {
      div.className = 'sys';
      div.textContent = text;
    }
    ui.chatLog.appendChild(div);
    while (ui.chatLog.children.length > 80) ui.chatLog.removeChild(ui.chatLog.firstChild);
    ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
  };

  ui.showHUD = () => {
    ui.overlay.classList.add('hidden');
    ui.hud.classList.remove('hidden');
  };

  ui.getName = () => sanitizeName(ui.nameInput.value, ui.nameInput.placeholder || randomName());
  ui.getServer = () => ui.serverInput.value.trim();

  ui.showHint = (text, x, y) => {
    ui.hint.textContent = text;
    ui.hint.style.left = x + 'px';
    ui.hint.style.top = y + 'px';
    ui.hint.classList.remove('hidden');
  };
  ui.hideHint = () => ui.hint.classList.add('hidden');

  return ui;
}
