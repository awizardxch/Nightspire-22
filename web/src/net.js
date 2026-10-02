// net.js — multiplayer client for the Nightspire-22 presence server.
// Protocol (JSON, field t = type). Offline fallback after 2.5s.

export function resolveServerUrl() {
  const q = new URLSearchParams(location.search).get('server');
  if (q) { try { localStorage.setItem('ns22-server', q); } catch { /* ignore */ } return q; }
  try {
    const s = localStorage.getItem('ns22-server');
    if (s) return s;
  } catch { /* ignore */ }
  return 'ws://localhost:8787';
}

export class Net {
  constructor() {
    this.ws = null;
    this.online = false;
    this.myId = null;
    this.onStatus = () => {};
    this.onJoin = () => {};
    this.onLeave = () => {};
    this.onState = () => {};
    this.onChat = () => {};
    this._timer = null;
  }

  connect(url, name) {
    this.setStatus('connecting');
    let settled = false;
    const goOffline = () => {
      if (settled) return;
      settled = true;
      try { this.ws?.close(); } catch { /* ignore */ }
      this.ws = null;
      this.online = false;
      this.setStatus('offline');
    };
    this._timer = setTimeout(goOffline, 2500);
    try {
      this.ws = new WebSocket(url);
    } catch {
      goOffline();
      return;
    }
    this.ws.onopen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(this._timer);
      this.online = true;
      this.send({ t: 'hello', name });
      this.setStatus('online');
    };
    this.ws.onclose = () => { if (!settled) goOffline(); else this._dropped(); };
    this.ws.onerror = () => { if (!settled) goOffline(); };
    this.ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      switch (m.t) {
        case 'welcome': this.myId = m.id; break;
        case 'join': this.onJoin(m.id, m.name); break;
        case 'leave': this.onLeave(m.id); break;
        case 'state': this.onState(m.players || []); break;
        case 'chat': this.onChat(m.id, m.name, m.text); break;
        default: break;
      }
    };
  }

  _dropped() {
    this.online = false;
    this.setStatus('offline');
  }

  setStatus(s) { this.onStatus(s); }

  send(o) {
    if (this.online && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(o)); } catch { /* ignore */ }
    }
  }

  sendMove(p, yaw, seq) { this.send({ t: 'move', p, yaw, seq }); }
  sendChat(text) { this.send({ t: 'chat', text }); }
}
