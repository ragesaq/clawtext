# 🦊 Tailscale Configuration for ClawText Browser

**Tailscale IP:** `100.80.61.30`  
**Hostname:** `luminous` (your machine name in Tailscale)  
**Service Port:** `3737`

---

## 🌐 Access URLs

### Primary (Tailscale Hostname)
http://luminous.tailedd004.ts.net:3737

### Fallback (Tailscale IP)
http://100.80.61.30:3737

### Local Machine
http://localhost:3737
http://127.0.0.1:3737

---

## 🔧 Setup Tailscale Smart Hostname

### 1. Check Current Tailscale Hostname
```bash
tailscale status | grep luminous
# Should show: luminous    100.80.61.30    linux
```

### 2. Set Friendly Hostname (if needed)
```bash
# Login to Tailscale admin console:
# https://login.tailscale.com/admin/machines

# Or rename via CLI:
tailscale up --advertise-routes=...  # If advertising routes
# Hostname is usually set by your machine's hostname
```

### 3. Verify DNS Resolution
```bash
# From another machine on Tailscale:
ping luminous.tailxxxx.ts.net
# Should resolve to 100.80.61.30

# Or use the short name (if MagicDNS is enabled):
ping luminous
```

---

## 🚀 Start the Service

### Option 1: Manual Start (Development)
```bash
cd ~/.openclaw/workspace/skills/clawtext-browser
npm start
# Or with custom port:
PORT=3737 HOST=0.0.0.0 npm start
```

### Option 2: Systemd Service (Production)
```bash
# Create service file (see systemd-clawtext-browser.service)
sudo cp systemd-clawtext-browser.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable clawtext-browser
sudo systemctl start clawtext-browser

# Check status:
sudo systemctl status clawtext-browser

# View logs:
sudo journalctl -u clawtext-browser -f
```

### Option 3: PM2 (Alternative)
```bash
npm install -g pm2
cd ~/.openclaw/workspace/skills/clawtext-browser
pm2 start src/server.js --name clawtext-browser
pm2 save
pm2 startup
```

---

## 🔒 Firewall Configuration

### Allow Tailscale Traffic
```bash
# Tailscale uses port 41641 (UDP) for discovery
# Your service uses 3737 (TCP)

# If using ufw:
sudo ufw allow from 100.64.0.0/10 to any port 3737 proto tcp

# If using iptables:
sudo iptables -A INPUT -s 100.64.0.0/10 -p tcp --dport 3737 -j ACCEPT
```

### Verify Service is Listening
```bash
# Check if bound to all interfaces:
sudo ss -tlnp | grep 3737
# Should show: 0.0.0.0:3737 (not 127.0.0.1:3737)

# Or:
netstat -tlnp | grep 3737
```

---

## 🧪 Test Connectivity

### From Local Machine
```bash
curl http://localhost:3737/api/health
```

### From Another Tailscale Machine
```bash
curl http://100.80.61.30:3737/api/health
# Or:
curl http://luminous.tailxxxx.ts.net:3737/api/health
```

### From Browser
```
http://100.80.61.30:3737
http://luminous.tailxxxx.ts.net:3737
```

---

## 📊 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3737` | Service port |
| `HOST` | `0.0.0.0` | Bind address (0.0.0.0 = all interfaces) |
| `MEMORY_DIR` | `~/.openclaw/workspace/memory` | Memory data directory |

### Example
```bash
PORT=3737 HOST=0.0.0.0 MEMORY_DIR=~/.openclaw/workspace/memory npm start
```

---

## 🔐 Security Notes

### Current State
- **No authentication** — Only accessible via Tailscale (trusted network)
- **CORS enabled** — Allows requests from any origin (fine for internal use)
- **No HTTPS** — Tailscale encrypts traffic end-to-end

### If Exposing Beyond Tailscale
1. Add authentication (API key or OAuth)
2. Enable HTTPS (reverse proxy with nginx/caddy)
3. Restrict CORS to specific origins
4. Add rate limiting

**For now:** Tailscale provides sufficient security (encrypted, authenticated, private network).

---

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check logs:
sudo journalctl -u clawtext-browser -n 50

# Check if port is in use:
sudo ss -tlnp | grep 3737

# Test manually:
cd ~/.openclaw/workspace/skills/clawtext-browser
npm start
```

### Can't Reach from Tailscale
```bash
# Check Tailscale status:
tailscale status

# Verify IP:
tailscale ip

# Test from another machine:
ping 100.80.61.30

# Check firewall:
sudo ufw status
sudo iptables -L -n | grep 3737
```

### DNS Resolution Fails
```bash
# Check MagicDNS:
tailscale status --json | grep -i dns

# Try IP instead of hostname:
curl http://100.80.61.30:3737/api/health

# Check /etc/hosts (if manually configured):
cat /etc/hosts | grep luminous
```

---

## 📝 Quick Reference

### Start
```bash
sudo systemctl start clawtext-browser
```

### Stop
```bash
sudo systemctl stop clawtext-browser
```

### Restart
```bash
sudo systemctl restart clawtext-browser
```

### Logs
```bash
sudo journalctl -u clawtext-browser -f
```

### Status
```bash
sudo systemctl status clawtext-browser
```

### Access URLs
- **Tailscale:** `http://luminous.tailxxxx.ts.net:3737`
- **IP:** `http://100.80.61.30:3737`
- **Local:** `http://localhost:3737`

---

*Last updated: 2026-03-10 20:20 UTC*
*Service port: 3737 | Tailscale IP: 100.80.61.30*
