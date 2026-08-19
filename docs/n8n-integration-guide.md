# n8n — Complete Integration Guide

How to connect **n8n** to the El Kayan CRM so WhatsApp messages automatically create or update customers.

**Contents**
- [How it works](#how-it-works)
- [1. Backend setup (secret + auth mode)](#1-backend-setup)
- [2. Endpoints](#2-endpoints)
- [3. Authentication](#3-authentication)
- [4. Message format & status mapping](#4-message-format)
- [5. Building the n8n workflow](#5-building-the-n8n-workflow)
- [6. Importable n8n workflow (JSON)](#6-importable-n8n-workflow-json)
- [7. WhatsApp / Meta side](#7-whatsapp--meta-side)
- [8. Testing](#8-testing)
- [9. Webhook Logs (admin UI)](#9-webhook-logs)
- [10. Error handling & retries](#10-error-handling--retries)
- [11. Troubleshooting](#11-troubleshooting)
- [12. Security & limits](#12-security--limits)
- [13. Environment variables reference](#13-environment-variables-reference)

---

## How it works

```
Meta/WhatsApp  ──►  n8n Webhook node  ──►  POST {BASE_URL}/api/webhook/whatsapp  ──►  CRM
                                            │  Authorization: Bearer <secret>          │
                                            │  {"message":"Name | Phone | Program | Status"}  │
                                            ▼                                          ▼
                                     success / error  ◄──  customer created / updated / no_change
```

n8n receives the incoming WhatsApp text, builds the pipe-delimited `message` string, and forwards it to the CRM webhook. The CRM:
1. Parses the message.
2. Normalizes the phone number (this is the **unique match key** — no duplicates).
3. Creates a new customer **or** updates the existing one.
4. Logs every call in `webhook_logs` (visible in the admin UI).

---

## 1. Backend setup

In the backend `.env`:

```
WHATSAPP_WEBHOOK_SECRET=your_shared_secret
WEBHOOK_AUTH_MODE=bearer
```

| Variable | Meaning |
| --- | --- |
| `WHATSAPP_WEBHOOK_SECRET` | Shared secret. Must match the `Authorization` header n8n sends. |
| `WEBHOOK_AUTH_MODE` | `bearer` (default) · `hmac` · `both` · `none`. See [Authentication](#3-authentication). |

After editing `.env`, restart the backend server.

> **Base URL:** `BASE_URL` below means the CRM's public address, e.g. `https://crm.example.com`. Locally it is `http://localhost:5000`.

---

## 2. Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/webhook/whatsapp` | webhook secret | Main endpoint — use this in n8n |
| `POST` | `/api/webhook/n8n` | webhook secret | Alias of the same handler |
| `POST` | `/api/webhook/dev/webhook-test` | none | Local testing, no auth needed |
| `GET` | `/api/webhook/logs` | admin (Bearer JWT) | List webhook logs |
| `POST` | `/api/webhook/logs/:id/reprocess` | admin (Bearer JWT) | Re-run a failed log |

---

## 3. Authentication

Three modes controlled by `WEBHOOK_AUTH_MODE`:

### Bearer token (simplest — recommended)
```
Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>
```
Comparison uses `crypto.timingSafeEqual` (constant-time, no timing leak).

### HMAC-SHA256 signature (strongest)
```
X-Hub-Signature-256: sha256=<hex>
```
Computed as `HMAC-SHA256(<WHATSAPP_WEBHOOK_SECRET>, raw request body)`.
> ⚠️ The signature is computed over the **raw body**, so n8n must send the body unmodified and use "Raw JSON" formatting.

### Both
Accepts either method.

### None
Disables auth entirely — only for local testing, never in production.

---

## 4. Message format

The `message` field must be the 4 pipe-separated parts, in order:

```
Name | Phone | Program | Status
```

| Part | Example | Result |
| --- | --- | --- |
| Name | `خالد هشام` | Stored in `name_ar` (and `name` if empty) |
| Phone | `01092919124` | Normalized to `201092919124`, country detected |
| Program | `برنامج المعلين` | Stored in `program_name` |
| Status | `مشترك` | Mapped to CRM status (see below) |

> Missing parts → `400 Invalid message format`. Separator is ` | ` (the parser splits on `|` and trims whitespace).

### Phone normalization

| Input | Normalized |
| --- | --- |
| `+201092919124` | `201092919124` (Egypt) |
| `00201092919124` | `201092919124` (Egypt) |
| `01092919124` | `201092919124` (Egypt) |
| `0551234567` | `966551234567` (Saudi Arabia) |
| `091234567` | `96891234567` (Oman) |
| `0912345678` | `218912345678` (Libya) |
| other digits | kept as-is |

Rules: strips `00`→`+`, spaces, `-`, `(`, `)`, `.`; detects country by local prefix (`01x`, `05x`, `09x` lengths). The normalized number is stored in `whatsapp_number` and used for matching.

### Status mapping

| You send | CRM status | Matched |
| --- | --- | --- |
| `مشترك` or `subscribed` | Subscribed | ✅ |
| `مهتم` or `interested` | Interested | ✅ |
| `غير مهتم` or `not interested` | Not Interested | ✅ |
| `ملغي` / `ملغى` or `cancelled` | Cancelled | ✅ |
| `جديد` or `new` | New | ✅ |
| `تم التواصل` or `contacted` | Contacted | ✅ |
| `تم التحويل للهاتف` or `transferred to phone` | Transferred to Phone | ✅ |
| anything else | New (warning logged) | ❌ |

---

## 5. Building the n8n workflow

### Node: Webhook (trigger)

| Setting | Value |
| --- | --- |
| HTTP Method | `POST` |
| Path (or full URL) | `{BASE_URL}/api/webhook/whatsapp` |
| Respond | "Using Respond to Webhook node" (or `Immediately`) |

If n8n's "Webhook" node sends the trigger body forward, you'll typically assemble the payload with a **Set / Function** node so the CRM receives exactly:

```json
{
  "message": "خالد هشام | 01092919124 | برنامج المعلين | مشترك",
  "meta": { "message_id": "wamid.HBgN...", "timestamp": 1700000000, "from": "01092919124" }
}
```

### Node: HTTP Request (the call to the CRM)

| Setting | Value |
| --- | --- |
| Method | `POST` |
| URL | `{BASE_URL}/api/webhook/whatsapp` |
| Send headers | `Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>` |
| Send body | `JSON` |

**Example n8n HTTP Request node config:**
```
Method        : POST
URL           : https://crm.example.com/api/webhook/whatsapp
Header "Authorization" : Bearer my_secret_123
Body type     : JSON
Body          : {
                  "message": "{{ $json.message }}",
                  "meta": { "from": "{{ $json.from }}" }
                }
```

### Order of nodes

```
[Webhook trigger] → [Set/Func: build "message"] → [HTTP Request → CRM] → [NoOp / Stop]
```

On HTTP 200 → workflow completes. On non-2xx → n8n retries; the endpoint is **idempotent**, so retries are safe.

---

## 6. Importable n8n workflow (JSON)

Import via n8n UI → **Workflows** → **Import from JSON** (or copy this into a `.json` file and drag it in). Replace `YOUR_SECRET` and the URL.

```json
{
  "name": "WhatsApp → El Kayan CRM",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook-in"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1.1,
      "position": [0, 0],
      "webhookId": "whatsapp-in"
    },
    {
      "parameters": {
        "keepOnlySet": true,
        "assignments": {
          "assignments": [
            { "id": "1", "name": "message", "value": "={{ $json.body.message }}", "type": "string" }
          ]
        }
      },
      "name": "Build Message",
      "type": "n8n-nodes-base.set",
      "typeVersion": 2,
      "position": [220, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://crm.example.com/api/webhook/whatsapp",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ message: $json.message }) }}",
        "options": {}
      },
      "name": "Send to CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 2,
      "position": [440, 0]
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Build Message", "type": "main", "index": 0 }]] },
    "Build Message": { "main": [[{ "node": "Send to CRM", "type": "main", "index": 0 }]] }
  }
}
```

> **Note on auth:** create an n8n **Header Auth credential** (`Authorization` header, value `Bearer YOUR_SECRET`) and select it in the HTTP Request node instead of embedding the header inline.

---

## 7. WhatsApp / Meta side

The CRM does not talk to Meta directly — **n8n** is the middleman:

1. **Meta WhatsApp Cloud API** → you set up a webhook pointing to n8n's webhook URL so n8n receives incoming messages.
2. n8n extracts the text of the message (`entry[].changes[].value.messages[].text.body`) plus `from`, `timestamp`, `id` (`wamid`).
3. n8n transforms the text into `Name | Phone | Program | Status` (e.g. with a Function node) and calls the CRM.

If your sender simply types `خالد هشام | 01092919124 | برنامج المعلين | مشترك`, n8n can pass the text through unchanged.

---

## 8. Testing

### Test endpoint (no auth) — quickest sanity check
```
POST {BASE_URL}/api/webhook/dev/webhook-test
```
```json
{ "message": "أحمد علي | 01012345678 | برنامج المعلين | مشترك" }
```
Response:
```json
{ "success": true, "customer_id": "65f...", "action": "created" }
```

### cURL (real endpoint, with auth)
```bash
curl -X POST https://crm.example.com/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <secret>" \
  -d '{"message":"أحمد علي | 01012345678 | برنامج المعلين | مشترك"}'
```

### Verify idempotency
Send the exact same request twice → first returns `"action": "created"`, second returns `"action": "no_change"`.

---

## 9. Webhook Logs (admin UI)

Open **Webhook Logs** (`/webhook-logs.html`) to see every call:
- `source` (`n8n` / `dev`)
- `status` (`success` / `error`)
- `action` (`created` / `updated` / `no_change` / `failed`)
- `error_message`, `processing_time_ms`
- linked customer (name + phone)
- `created_at`

**Reprocessing:** failed logs can be re-run from the detail modal (POST `/api/webhook/logs/:id/reprocess`), which repeats the same payload.

---

## 10. Error handling & retries

| Case | HTTP | Body |
| --- | --- | --- |
| Invalid auth | `401` | `{ "success": false, "error": "Unauthorized" }` |
| Bad message format | `400` | `{ "success": false, "error": "Invalid message format. Expected: Name | Phone | Program | Status" }` |
| Server error | `500` | `{ "success": false, "error": "<message>" }` |
| Rate limited (>100 req/min/IP) | `429` | `{ "success": false, "error": "Too many requests" }` |

**n8n retry behavior:** enable "On Error → Retry" (e.g. 3 attempts) in n8n. Because the endpoint is idempotent (same message ⇒ `no_change`), retries never create duplicates.

---

## 11. Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `401 Unauthorized` | Secret mismatch. Check the `Authorization` header matches `WHATSAPP_WEBHOOK_SECRET`, and `WEBHOOK_AUTH_MODE` isn't `hmac`/`none`. |
| `400 Invalid message format` | `message` missing the 4 pipe-separated parts, or parts empty (name/phone required). |
| `500 Server error` | DB unreachable / validation failure. See the real error in Webhook Logs. |
| `429 Too many requests` | >100 req/min from the same IP — fine for normal retries, only hits on bursts/loops. |
| Customer name not updated | By design: existing names are never overwritten, only empty names get filled. |
| Duplicate customers | Matching is by normalized phone — check the normalized number in the log payload. |
| HMAC fails | Signature must be over the **raw body**; use Raw JSON body and don't let n8n reformat the payload. |
| `curl` works but n8n gets 401 | n8n reformatted the payload (HMAC) or header not sent — verify the exact header name/value. |

---

## 12. Security & limits

- **Use HTTPS** on the public `BASE_URL` so the secret isn't sent in cleartext.
- Prefer **HMAC** or at least a long random secret (e.g. `openssl rand -hex 32`).
- Rate limit: **100 requests/min per IP** (burst-safe for retries).
- Logs store full payloads — keep the log database access controlled.
- `WEBHOOK_AUTH_MODE=none` only for local dev.

---

## 13. Environment variables reference

```
WHATSAPP_WEBHOOK_SECRET=your_shared_secret   # required for auth
WEBHOOK_AUTH_MODE=bearer                     # bearer | hmac | both | none
```

---

**Related:** `docs/n8n-connection-simple.md` (quick start) · `docs/n8n-workflow.md` (original spec).