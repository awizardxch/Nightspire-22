# Deploying Nightspire-22 — self-hosting guide

Two pieces to host: the **static web client** (`web/dist/`) and the
**multiplayer relay** (`server/`, Node + WebSocket). Both are self-hosted —
no third-party platform in the path.

> Scope note: the quick-start and build steps below are verified. The
> reverse-proxy, TLS, and systemd templates are standard configurations
> provided as starting points — a full public deploy was not run
> end-to-end from this environment, so treat them as templates to adjust.

## 1. Quick start (local machine)

```bash
# relay
cd server && npm install && npm start        # → ws://localhost:8787

# client (dev)
cd web && npm install && npm run dev         # → http://localhost:5173

# client (production build)
cd web && npm run build                      # outputs to web/dist/
npx serve web/dist                           # or any static file server
```

Open the client with `?server=` to point at a relay:

```
http://localhost:5173/?server=ws://localhost:8787
```

URL resolution order (see `web/src/net.js`): `?server=` param →
`localStorage` key `ns22-server` (also settable in the entry overlay's
*Server* field) → `ws://localhost:8787`. If the relay is unreachable after
2.5 s the client falls back to offline single-player.

## 2. The relay on a PC or VPS

Requirements: **Node.js 20+**, outbound HTTPS for `npm install` (one time).

```bash
git clone https://github.com/awizardxch/Nightspire-22.git /srv/nightspire
cd /srv/nightspire/server
npm install --omit=dev
PORT=8787 node server.js
```

`PORT` env var sets the listen port (default `8787`). The relay binds all
interfaces by default; behind a reverse proxy you may keep that (firewall
blocks direct access) or bind loopback only.

Debug move logging: `DEBUG_MOVES=1 node server.js`.

Smoke test (runs the real server on a throwaway port, no install needed
beyond `npm install`):

```bash
cd server && npm test
```

## 3. systemd unit (relay as a service)

Template at `server/nightspire-server.service`. Install:

```bash
sudo cp server/nightspire-server.service /etc/systemd/system/
# edit WorkingDirectory / User to match your layout, then:
sudo systemctl daemon-reload
sudo systemctl enable --now nightspire-server
sudo systemctl status nightspire-server
```

The template runs as user `nightspire` from `/srv/nightspire/server`,
restarts on failure, and sets `PORT=8787`.

## 4. Reverse proxy + TLS

Serve `web/dist/` as static files and proxy `/ws` to the relay. Visitors
then join at:

```
https://<your-host>/?server=wss://<your-host>/ws
```

(`wss://` — browsers require TLS WebSockets from HTTPS pages.)

### Caddy (recommended — automatic TLS)

```
tower.example.com {
    handle /ws* {
        reverse_proxy 127.0.0.1:8787
    }
    handle {
        root * /srv/nightspire/web/dist
        file_server
    }
}
```

`caddy reload` after editing; Caddy fetches the certificate itself.

### nginx (alternative)

```nginx
server {
    listen 443 ssl;
    server_name tower.example.com;
    ssl_certificate     /etc/letsencrypt/live/tower.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tower.example.com/privkey.pem;

    location / {
        root /srv/nightspire/web/dist;
        try_files $uri $uri/ /index.html;
    }
    location /ws {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Get the cert with `certbot --nginx -d tower.example.com` (template paths —
adjust to your setup).

## 5. Firewall

Only 80/443 need to be public. The relay port stays private behind the
proxy:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 6. Updating

```bash
cd /srv/nightspire
git pull origin main
cd web && npm install && npm run build
sudo systemctl restart nightspire-server
```

No database, no migrations — the relay is stateless (players are
in-memory; a restart just drops current sessions).

## 7. Cost notes

Cheapest first: run the relay on a machine that's already always on
(your own server/PC). Failing that, any small VPS works — the relay is a
single Node process with negligible CPU/RAM at this player count, and the
client is static files (nearly free to serve). No paid services are
required by this setup; specific provider pricing is left for you to
compare.

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| Client shows OFFLINE | relay reachable? `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://host:8787` should 426/101, not time out; check `?server=` URL and firewall |
| `wss://` fails from `https://` | mixed-content block — the page and socket must both be TLS; verify the `/ws` proxy block |
| Relay won't start | `node --version` ≥ 20; `npm install` completed; port free (`ss -ltnp \| grep 8787`) |
| systemd shows crash loop | `journalctl -u nightspire-server -e` — usually a wrong `WorkingDirectory` or `User` |
