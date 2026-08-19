# Deployment Guide — Al Kayan Al Arabi CRM

Production setup for the CRM: backend (Express + MongoDB), frontend (vanilla static files), webhook integration (n8n), and MongoDB Atlas.

**Contents**
- [1. Requirements](#1-requirements)
- [2. Architecture](#2-architecture)
- [3. MongoDB setup (Atlas)](#3-mongodb-setup-atlas)
- [4. Backend deployment](#4-backend-deployment)
- [5. Frontend deployment](#5-frontend-deployment)
- [6. Environment variables](#6-environment-variables)
- [7. Seeding initial data](#7-seeding-initial-data)
- [8. Production security](#8-production-security)
- [9. Backup strategy](#9-backup-strategy)
- [10. Deployment checklists](#10-deployment-checklists)

---

## 1. Requirements

| Component | Requirement |
| --- | --- |
| Node.js | **v18+** (tested on v24) — Express 4 + Mongoose 8 |
| MongoDB | **MongoDB Atlas** cluster (M0 free tier is enough to start) or self-hosted 6.0+ |
| Git | To clone the repository |
| n8n (optional) | For the WhatsApp webhook integration |
| Reverse proxy (recommended) | Nginx / Caddy / Cloudflare for HTTPS + gzip |
| Process manager (recommended) | PM2 or a platform service (Render/Railway/Heroku) |

### Repo layout

```
.
├── backend/            # Express API + serves the frontend statically
│   ├── server.js
│   ├── config/db.js
│   ├── controllers/ models/ routes/ middleware/ utils/ services/ validators/
│   ├── tests/          # node --test suite (65 tests)
│   └── scripts/        # seed.js, seedCommunicationTypes.js, ...
├── frontend/           # static SPA (HTML + CSS + JS), served by backend
├── uploads/            # payment receipts (created at runtime)
├── docs/               # guides (n8n, deployment)
└── .env                # secrets — NEVER commit (gitignored)
```

---

## 2. Architecture

The backend serves **both** the API (`/api/*`) and the static frontend (`/`), so a single Node process can host the whole app. Uploaded receipts are served from `/uploads`.

```
        Mobile / Desktop browsers
                  │
                  │ HTTPS
                  ▼
        ┌─────────────────────┐
        │  Reverse proxy       │   Nginx / Caddy / Cloudflare (TLS, gzip)
        └─────────┬───────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Node.js (Express)   │   PORT=5000 (default)
        │  • /api/*  API       │
        │  • /      frontend   │
        │  • /uploads receipts │
        └─────────┬───────────┘
                  │ ssl=true, authSource=admin
                  ▼
        ┌─────────────────────┐
        │  MongoDB Atlas       │   MONGODB_URI
        └─────────────────────┘

        n8n ──POST /api/webhook/whatsapp──► backend
        (Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>)
```

### Recommended hosting combo (simple + cheap)

| Layer | Option | Notes |
| --- | --- | --- |
| Backend + frontend | Render / Railway / Fly.io / DigitalOcean droplet / VPS | Single Node service |
| Database | MongoDB Atlas M0/M2 | Managed, free tier available |
| TLS + domain | Cloudflare (proxy) or platform TLS | Terminate HTTPS in front |
| WhatsApp | Meta WhatsApp Cloud API + n8n (self-host or n8n cloud) | Calls `/api/webhook/whatsapp` |

---

## 3. MongoDB setup (Atlas)

1. Create a **MongoDB Atlas** account → create a new cluster (M0 free tier is fine to start).
2. Under **Database Access**, create a database user:
   - Name: `crmuser` (example)
   - Password: strong, unique (store it in `.env` only)
   - Built-in role: **`readWriteAnyDatabase`** (or restrict to a single DB for least privilege)
3. Under **Network Access**, add an **IP allowlist**:
   - For production, add only the server's public IP (or `0.0.0.0/0` only if you must, and rely on strong credentials — not recommended).
4. **Get the connection string**: in your cluster → Connect → Drivers →
   ```
   mongodb+srv://crmuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>`. Set `ssl=true` (default for Atlas). Add `&appName=Cluster0` if desired.
5. (Optional) Under **Backup** enable **Cloud Backup** / **Continuous Backup (PITR)**.

> ⚠️ Atlas connection strings support `mongodb://user:pass@host:27017,.../?ssl=true&replicaSet=...&authSource=admin` (multi-host SRV style) — the app's `config/db.js` uses `mongoose.connect(MONGODB_URI)` and accepts either format.

---

## 4. Backend deployment

### 4.1 Clone + install

```bash
git clone https://github.com/khaleddaidar012/alkayan.git
cd alkayan
cd backend
npm install
```

### 4.2 Environment variables

Copy the template (never commit `.env` — it is gitignored):

```bash
cp .env.example .env        # if provided; otherwise create .env manually
nano .env
```

Required variables (see [§6](#6-environment-variables) for the full table):

```
PORT=5000
MONGODB_URI=mongodb+srv://crmuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=<64+ random chars>
JWT_EXPIRE=7d
WHATSAPP_WEBHOOK_SECRET=<random secret shared with n8n>
WEBHOOK_AUTH_MODE=bearer
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"   # webhook secret
```

### 4.3 Seed initial data

> ⚠️ `npm run seed` **deletes all users** before re-creating the 3 defaults. Run once on a fresh DB only.

```bash
npm run seed                     # creates admin/manager/employee users
node scripts/seedCommunicationTypes.js
node scripts/seedCustomerStatuses.js
node scripts/seedPaymentMethods.js
```

Default accounts:

| Role | Email | Password (change after first login) |
| --- | --- | --- |
| Admin | `admin@alkayan.com` | `admin123` |
| Manager | `manager@alkayan.com` | `manager123` |
| Employee | `employee@alkayan.com` | `employee123` |

### 4.4 Start

```bash
node server.js
# or
npm start
```

Health check: `GET {BASE_URL}/api/health` → `{ "status": "ok", ... }`.

### 4.5 Production process manager (PM2)

```bash
npm install -g pm2
pm2 start server.js --name alkayan-crm --cwd backend
pm2 save && pm2 startup   # survive reboots
pm2 logs alkayan-crm
```

### 4.6 Reverse proxy (example: Nginx)

```nginx
server {
    listen 80;
    server_name crm.example.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Uploads can be large (receipts up to 10MB)
        client_max_body_size 12M;
    }
}
```

Add TLS with **Certbot** (`certbot --nginx -d crm.example.com`) or Cloudflare proxy.

---

## 5. Frontend deployment

The frontend is **plain static files** — there is no build step. Two options:

### Option A — served by the backend (default, recommended)

The backend already serves `../frontend` with UTF-8 headers. No extra work:
- Files: `frontend/` must sit next to `backend/` (i.e. both inside the repo).
- The API is same-origin, so nothing else to configure **if** you also change `API_URL` (see below).

### Option B — separate static host (Netlify / Vercel / S3 + CloudFront)

1. Deploy the `frontend/` folder to any static host.
2. **Critical:** every `frontend/js/*.js` file defines `const API_URL = 'http://localhost:5000/api';` at the top. For production you **must** change it to the public API origin, e.g. `const API_URL = 'https://crm.example.com/api';` (or an empty string `''` if the frontend and API share the same origin — then calls become `/api/...`).
3. CORS: the backend currently uses `app.use(cors())` (open). If the frontend is on a different origin, restrict it (see [§8](#8-production-security)).
4. Add an `SPA fallback` rule if the host requires one (the app uses multi-page HTML, not a router, so a `404 → index.html` rule is optional).

> **Same-origin tip:** if you serve the frontend from the backend (Option A) on the same domain, set `API_URL = ''` so all fetches become relative (`/api/...`). This avoids hard-coding a domain.

---

## 6. Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | no | `5000` | Backend HTTP port |
| `MONGODB_URI` | **yes** | — | MongoDB connection string (Atlas or local). Supports `mongodb+srv://` and multi-host `mongodb://…&ssl=true&replicaSet=…&authSource=admin` |
| `JWT_SECRET` | **yes** | — | Signs JWT tokens. Generate ≥32 random bytes. **Never commit.** |
| `JWT_EXPIRE` | no | `7d` | Token lifetime (`7d`, `24h`, etc.) |
| `WHATSAPP_WEBHOOK_SECRET` | yes* | — | Shared secret with n8n for `/api/webhook/*` auth. *Required unless `WEBHOOK_AUTH_MODE=none`* |
| `WEBHOOK_AUTH_MODE` | no | `bearer` | `bearer` · `hmac` · `both` · `none` (see `docs/n8n-workflow.md`) |

`.env.example` template:

```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=<replace-with-random-64-hex>
JWT_EXPIRE=7d
WHATSAPP_WEBHOOK_SECRET=<replace-with-random-secret>
WEBHOOK_AUTH_MODE=bearer
```

> No real secrets exist in this repository; `.env`, `*.log`, and `uploads/` are gitignored.

---

## 7. Seeding initial data

| Script | Purpose | Safe to re-run? |
| --- | --- | --- |
| `npm run seed` | Creates admin/manager/employee users | **No** — deletes all users first |
| `node scripts/seedCommunicationTypes.js` | Default communication types | Yes (skips existing) |
| `node scripts/seedCustomerStatuses.js` | Default customer statuses | Yes |
| `node scripts/seedPaymentMethods.js` | Default payment methods | Yes |

---

## 8. Production security

| Area | Recommendation |
| --- | --- |
| **HTTPS** | Terminate TLS at Nginx/Caddy/Cloudflare or use the platform's TLS. Never serve over plain HTTP with a real domain. |
| **JWT secret** | ≥32 random bytes; rotate on breach; keep out of logs. |
| **JWT expiry** | Keep `7d` or shorten to `24h` for higher security. |
| **Token handling** | The frontend stores tokens in `localStorage` — acceptable for this app, but be aware XSS on the frontend could read them. HTTPS + no third-party scripts mitigates the main risk. |
| **CORS** | Backend uses open `app.use(cors())`. In production, restrict to your frontend origin(s): `app.use(cors({ origin: 'https://crm.example.com' }))`. |
| **MongoDB access** | Atlas IP allowlist + dedicated user with least privilege; `ssl=true`; don't expose MongoDB publicly. |
| **Password hashing** | Already handled — `bcryptjs` with 12 salt rounds. |
| **Rate limiting** | The webhook endpoint is limited (100 req/min/IP). Consider adding `express-rate-limit` to `/api/auth/login` to slow brute-force. |
| **Uploads** | Receipts are served from `/uploads` via static middleware; validate files client+server side (multer limits size 10MB). |
| **Environment** | `.env` gitignored; never paste secrets into logs, screenshots, or chat. |
| **Secrets rotation** | Webhook secret must match n8n; JWT rotation invalidates existing sessions (users re-login). |
| **Backups** | See next section. |

### Operational hardening checklist

- [ ] HTTPS enabled and forced (HTTP → HTTPS redirect).
- [ ] MongoDB Atlas IP allowlist configured (no `0.0.0.0/0` unless necessary).
- [ ] `JWT_SECRET` is a fresh random value, not a default.
- [ ] Default seed passwords changed after first login.
- [ ] CORS restricted to the real frontend origin.
- [ ] `WEBHOOK_AUTH_MODE=none` **not** used in production.
- [ ] Backups enabled and a restore drill performed once.
- [ ] PM2 (or platform service) restarts the app on crash/reboot.

---

## 9. Backup strategy

### 9.1 Automated backups (recommended — Atlas Cloud Backup)

Enable in Atlas → cluster → **Backup**:

- **Cloud Backup** snapshots on a schedule (e.g. daily).
- **Continuous Backup / PITR** for point-in-time recovery (down to ~minutes).
- **Retention:** set snapshots (e.g. 7 days) + a monthly archive. Match retention to your SLA.

### 9.2 Manual backup (`mongodump`)

```bash
# Full dump of the app database
mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%F)

# Optional: single collection
mongodump --uri="$MONGODB_URI" --collection=customers --out=./backup-$(date +%F)
```

Run on a schedule (cron) and ship the dump to object storage (S3/R2) for off-site copies.

### 9.3 Application-level data

- **Uploads:** back up the `uploads/` directory (payment receipts) alongside the DB dumps.
- **`.env`:** keep a secure copy of the environment variables (password manager / vault) so you can rebuild any server.
- **Repo:** the code is already versioned in Git — `git fetch`/`pull` before restoring a server.

### 9.4 Restore process

```bash
# Dry-run / verify the dump exists
mongorestore --uri="$MONGODB_URI" --nsInclude="crm.*" --dryRun ./backup-2026-08-19

# Actual restore
mongorestore --uri="$MONGODB_URI" ./backup-2026-08-19
```

> Restore into a **fresh database** first and verify counts (customers, payments, programs) before pointing the app at it. For Atlas PITR, use the Atlas UI → Restore, or `atlas-cli` backups restore.

### 9.5 Recovery plan (RPO/RTO)

| Goal | Setting |
| --- | --- |
| Data loss tolerance (RPO) | ≤ 5 min → enable PITR; ≤ 24 h → daily snapshots |
| Restore time target (RTO) | Test a restore so you know it's < 1 hour for your dataset size |

**Recovery steps in order:**
1. Stop writes (pause PM2) or point the app to a temporary DB.
2. Restore the DB from the newest good backup (Atlas UI or `mongorestore`).
3. Restore `uploads/` if receipts are missing.
4. Restore `.env` from vault.
5. Start the app and verify `/api/health` + login + a sample of customers/payments.

---

## 10. Deployment checklists

### First-time production deploy
- [ ] Node 18+ installed, repo cloned, `backend/npm install` succeeded.
- [ ] `.env` created with fresh secrets; `.env` not committed.
- [ ] `MONGODB_URI` points to Atlas; IP allowlist + DB user set.
- [ ] `npm run seed` + seed scripts run once.
- [ ] `API_URL` in `frontend/js/*.js` set to the production origin (or `''` for same-origin).
- [ ] App started (PM2), `/api/health` OK, admin login works.
- [ ] HTTPS enabled; CORS restricted; default passwords changed.
- [ ] Backups enabled; one restore drill performed.

### Post-deploy smoke test
- [ ] Login (admin / manager / employee) works.
- [ ] Customers list + create + payment add/delete reflect in reports/dashboard.
- [ ] Programs/campaigns/tasks/goals load data.
- [ ] Webhook test: `POST /api/webhook/dev/webhook-test` then check Webhook Logs.
- [ ] Dark/light theme, AR/EN, mobile + desktop all render.