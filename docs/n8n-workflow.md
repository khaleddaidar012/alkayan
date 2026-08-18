# n8n → El Kayan Webhook Integration

## Overview

Incoming WhatsApp messages from Meta Business API are routed through **n8n**, which extracts the structured text and calls El Kayan's webhook endpoint. El Kayan parses the message, auto-creates or updates a customer, and logs every call.

## Webhook URL

```
POST {BASE_URL}/api/webhook/whatsapp
```

The same handler is also exposed at `/api/webhook/n8n` as an alias.

## Required Headers

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <WHATSAPP_WEBHOOK_SECRET>` |

### HMAC alternative (optional)

Set `WEBHOOK_AUTH_MODE=hmac` in the backend `.env` to require an HMAC-SHA256 signature instead of the Bearer token:

- Header: `X-Hub-Signature-256: sha256=<hex>`
- Computed as: `HMAC-SHA256(secret, raw request body)`

Set `WEBHOOK_AUTH_MODE=both` to accept either method.

## Expected JSON Payload

```json
{
  "message": "خالد هشام | 01092919124 | برنامج المعلين | مشترك",
  "meta": {
    "message_id": "wamid.HBgNMDExMTExMTExMTE=",
    "timestamp": 1700000000,
    "from": "01092919124"
  }
}
```

`meta` is optional and stored only for logging.

## Message Format

The `message` field must use the pipe-delimited format:

```
Name | Phone | Program | Status
```

| Field | Example | Notes |
| --- | --- | --- |
| Name | `خالد هشام` | Stored in `name_ar` (and `name` if empty) |
| Phone | `01092919124` | Normalized: digits only, country prefix detected |
| Program | `برنامج المعلين` | Stored in `program_name` |
| Status | `مشترك` | Mapped to the status system (see below) |

### Phone normalization

- `+201092919124` → `201092919124` (Egypt)
- `00201092919124` → `201092919124` (Egypt)
- `01092919124` → `201092919124` (Egypt)
- `0551234567` → `966551234567` (Saudi Arabia)
- `091234567` → `96891234567` (Oman)
- `0912345678` → `218912345678` (Libya)

Country is detected from the dial code prefix. The normalized phone number is the **primary key** for matching customers — no duplicates are created for the same normalized number.

### Status mapping

| Arabic (message) | System status |
| --- | --- |
| `مشترك` | Subscribed |
| `مهتم` | Interested |
| `غير مهتم` | Not Interested |
| `ملغي` / `ملغى` | Cancelled |
| `جديد` | New |
| `تم التواصل` | Contacted |
| `تم التحويل للهاتف` | Transferred to Phone |
| *(anything else)* | New (warning logged) |

## Behavior

1. **Create**: if no customer exists with the normalized phone → creates one with `source='whatsapp_webhook'`.
2. **Update**: if the customer exists → updates `program_name` and status; sets `name_ar`/`name` only if they were empty (existing names are **never overwritten**).
3. **Idempotent**: sending the exact same message again returns `action: "no_change"` (safe for n8n retries).
4. **Logging**: every call is stored in `webhook_logs` (payload, status, action, error, processing time, customer link).

## Response

```json
{ "success": true, "customer_id": "65f...", "action": "created" }
```

`action` is one of: `created` | `updated` | `no_change`.

Errors:

| Case | HTTP | Body |
| --- | --- | --- |
| Invalid auth | 401 | `{ "success": false, "error": "Unauthorized" }` |
| Invalid message format | 400 | `{ "success": false, "error": "Invalid message format..." }` |
| Server error | 500 | `{ "success": false, "error": "<message>" }` (n8n will retry) |
| Rate limit (>100 req/min/IP) | 429 | `{ "success": false, "error": "Too many requests" }` |

## n8n Workflow Configuration

1. **Webhook node** → set method `POST`, URL `{BASE_URL}/api/webhook/whatsapp`.
2. Add header `Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>` (shared secret).
3. Build the `message` string from WhatsApp message text using the pipe format.
4. Pass through `meta` (message_id, timestamp, from) if available.
5. On HTTP 200 with `success: true` → workflow completes.
6. On non-2xx → n8n retries automatically (safe, endpoint is idempotent).

## Testing

### Development test endpoint (no auth)

```
POST {BASE_URL}/api/webhook/dev/webhook-test
```

```json
{ "message": "أحمد علي | 01012345678 | برنامج المعلين | مشترك" }
```

Returns the same result object as the production endpoint but requires no authentication.

### cURL

```bash
curl -X POST http://localhost:5000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <secret>" \
  -d '{"message":"أحمد علي | 01012345678 | برنامج المعلين | مشترك"}'
```

### Verify in admin UI

Open **Webhook Logs** (`/webhook-logs.html`) → every call is listed with status, action, customer link and processing time. Failed logs can be **reprocessed** from the detail modal.

## Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `401 Unauthorized` | Wrong/missing `WHATSAPP_WEBHOOK_SECRET`; verify the Bearer header matches `.env` |
| `400 Invalid message format` | The `message` field is missing the 4 pipe-separated parts |
| `500 Server error` | DB unreachable or validation failure; the error is logged in webhook_logs |
| Customer name not updated | Existing customers keep their name — only empty names are filled |
| Duplicate customers | Matching is by normalized phone; verify the phone normalization result in webhook_logs payload |
| `429 Too many requests` | n8n burst exceeds 100 req/min per IP; the limit is generous for normal retries |

## Environment Variables (backend `.env`)

```
WHATSAPP_WEBHOOK_SECRET=your_shared_secret
WEBHOOK_AUTH_MODE=bearer   # bearer | hmac | both | none
```