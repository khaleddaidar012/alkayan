# Connecting n8n to the CRM — Simple Guide

A simple, step-by-step guide to connect **n8n** to the El Kayan CRM so WhatsApp messages create/update customers automatically.

---

## How it works (in one line)

> n8n sends `Name | Phone | Program | Status` to the CRM webhook → CRM creates or updates the customer → every call is logged.

```
Meta/WhatsApp  →  n8n  →  POST /api/webhook/whatsapp  →  CRM (auto create/update customer)
```

---

## Step 1 — Enable the webhook secret (backend)

Open `backend/.env` and make sure these lines exist:

```
WHATSAPP_WEBHOOK_SECRET=your_shared_secret
WEBHOOK_AUTH_MODE=bearer
```

- `your_shared_secret` = any password-like string you choose.
- Keep it secret — n8n uses it to authenticate.

## Step 2 — Test the webhook first (optional but recommended)

Before touching n8n, test with a simple request:

```
POST http://localhost:5000/api/webhook/dev/webhook-test
```

Body (no auth needed on this test endpoint):

```json
{ "message": "أحمد علي | 01012345678 | برنامج المعلين | مشترك" }
```

Expected response:

```json
{ "success": true, "customer_id": "65f...", "action": "created" }
```

Check the result in the admin UI at **Webhook Logs** (`/webhook-logs.html`).

## Step 3 — Create the n8n workflow

1. Open n8n → **New Workflow**.
2. Add a **Webhook** node.
3. In the node settings set:
   - **HTTP Method:** `POST`
   - **Path / URL:** `{BASE_URL}/api/webhook/whatsapp`
     - e.g. `http://localhost:5000/api/webhook/whatsapp`
   - **Authentication (Headers):** add header:
     - `Authorization` = `Bearer your_shared_secret`
4. Make the webhook body contain the message. The CRM expects a JSON object:

   ```json
   {
     "message": "خالد هشام | 01092919124 | برنامج المعلين | مشترك",
     "meta": { "message_id": "wamid....", "from": "01092919124" }
   }
   ```

   `meta` is optional (used for logging only). The important part is `message`.

5. Add any node after it (e.g. **NoOp** or **HTTP Request**) so n8n completes the workflow — or just enable the workflow.

## Step 4 — The message format (very important)

The `message` field must have **4 parts separated by ` | `**:

```
Name | Phone | Program | Status
```

| Part | Example | Notes |
| --- | --- | --- |
| Name | `خالد هشام` | Saved as Arabic name (existing names are never overwritten) |
| Phone | `01092919124` | Normalized automatically (Egypt/Saudi/Oman/Libya) |
| Program | `برنامج المعلين` | Saved as program name |
| Status | `مشترك` | Mapped to the CRM status (see table below) |

### Status mapping (Arabic → CRM status)

| You write | CRM saves |
| --- | --- |
| `مشترك` | Subscribed |
| `مهتم` | Interested |
| `غير مهتم` | Not Interested |
| `ملغي` / `ملغى` | Cancelled |
| `جديد` | New |
| `تم التواصل` | Contacted |
| `تم التحويل للهاتف` | Transferred to Phone |
| anything else | New (logs a warning) |

## Step 5 — Enable and test the workflow

1. Click **Active** in n8n to enable the workflow.
2. Send a test WhatsApp message (or trigger the webhook manually in n8n).
3. Open the CRM → **Webhook Logs** → you should see a new log with `action: created` or `updated`.

---

## Good to know

- **No duplicates:** customers are matched by normalized phone number.
- **Idempotent:** sending the exact same message twice returns `no_change` — safe for retries.
- **Retries:** if the CRM returns an error (500), n8n can retry safely.
- **Rate limit:** max 100 requests/minute per IP.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `401 Unauthorized` | Wrong secret — check the `Authorization` header matches `.env` |
| `400 Invalid message format` | The `message` has fewer/more than 4 parts or no ` | ` separators |
| `500 Server error` | Check Webhook Logs for the real error |
| Customer name not updated | Existing names are kept on purpose — only empty names are filled |

## Environment variables summary

```
WHATSAPP_WEBHOOK_SECRET=your_shared_secret
WEBHOOK_AUTH_MODE=bearer   # bearer | hmac | both | none
```

> Full technical details: see `docs/n8n-workflow.md`