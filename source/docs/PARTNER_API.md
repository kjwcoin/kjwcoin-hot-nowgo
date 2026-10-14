# HOT x Balbadak partner API v1

This is a closed, server-to-server integration for `hot.nowgo.space`. It exposes the four requested HOT catalog fields, supplies separate unified-member and owner-signup links, and accepts minimal partner report events. No production access is enabled until partner secrets, database migration, rate limiting, attribution, and commercial terms are set.

## Commercial and data boundary

- Partner conversion fee: **KRW 100 per successful owner conversion**, as agreed by the parties.
- Define a successful conversion for settlement as one distinct store whose owner completes NOWGO unified-account registration and whose ownership claim is approved. Duplicate accounts, unverified leads, and non-owner user signups are not billable.
- The API returns a signed owner referral URL. HOT verifies it, stores a short-lived HttpOnly attribution cookie, and writes an approved conversion only after the owner registration flow succeeds. The settlement endpoint reports one conversion per HOT store, using Korea Standard Time (KST) month boundaries. Reversals are excluded. The event and link logic must be tested in staging before financial reliance.
- HOT/NOWGO pre-existing catalog, schema, matching/normalization logic, member base, and derived HOT scores remain HOT/NOWGO materials. Balbadak source reports remain Balbadak source data; HOT stores an attributed, limited-use partner copy. Each side grants only the limited license needed to display, validate, and operate this referral integration.
- No free, perpetual, exclusive, transferable, sublicensable, resale, bulk-redistribution, model-training, or competing-database rights are granted. Partner use is limited to displaying HOT records and linking users to HOT/NOWGO during the agreed term. Any additional fields, volume, duration, or reuse requires written agreement and compensation.
- Do not ingest reporter names, phone numbers, precise user location/history, photos, or free text through v1. The partner event is stored separately from member reports and gets no member identity, HOT points, or automatic public publication.
- On suspension or termination, revoke keys immediately and delete partner API caches/copies within 30 days, except records legally required to retain. HOT may retain its own pre-existing and independently collected data.

These are protective integration terms for negotiation and operations; they are not a substitute for counsel's review or an executed amendment.

## Authentication

All calls are server-to-server. Never place a partner secret in browser, mobile app, query string, repository, or PDF.

- Catalog: `Authorization: Bearer <HOT_PARTNER_API_KEY>`
- Report webhook: `X-Nowgo-Timestamp: <unix-seconds>` and `X-Nowgo-Signature: <hex HMAC-SHA256>`
- Signature input: UTF-8 bytes of `<timestamp>.<exact raw request body>` keyed by `BALBADAK_WEBHOOK_SECRET`.
- Signatures older than 5 minutes are rejected. Retries must keep the same `event_id` and may use a new timestamp/signature.
- No secret configured means the endpoint is closed (503). Rotate/revoke credentials on personnel changes or suspected exposure.

Before issuing a key, configure gateway throttling and alerts (initial proposal: 60 requests/minute per partner key; 429 with `Retry-After`). The application caps catalog pages at 50 rows; no totals, reporter data, addresses, coordinates, photos, scores, or internal member identifiers are returned.

## 1. Read the HOT catalog

`GET https://hot.nowgo.space/api/partner/v1/hot/menus?page=1&limit=50`

Response fields per row:

| Field | Type | Meaning |
| --- | --- | --- |
| `store_id` | string | HOT place identifier |
| `store_name` | string | Public store name |
| `menu_name` | string | Public menu name |
| `spicy_level` | integer 1-5 | HOT spicy level |
| `member_signup_url` | URL | HOT unified-user signup, tagged to Balbadak and store |
| `owner_signup_url` | URL | HOT owner signup, tagged to Balbadak and store |

Only rows already published in `hot_public_menus` are returned. `page` starts at 1; `limit` defaults to 50 and maximum is 50. HOT public catalog is currently empty in the production read check, so a successful call can return an empty `data` array until public records exist. No database enumeration beyond this allowlisted view is available.

Example response:

```json
{
  "data": [{
    "store_id": "nowgo-abc123",
    "store_name": "예시 식당",
    "menu_name": "매운 짬뽕",
    "spicy_level": 4,
    "member_signup_url": "https://hot.nowgo.space/account/join?type=user&source=balbadak&returnTo=%2F&source_store_id=nowgo-abc123",
    "owner_signup_url": "https://hot.nowgo.space/api/partner/v1/balbadak/referral?store_id=nowgo-abc123&expires=...&sig=..."
  }],
  "pagination": {"page": 1, "limit": 50, "has_more": false},
  "data_source": "HOT / NOWGO"
}
```

The real field `store_id` should be treated as an opaque identifier and used only for the stated display and referral purpose. Do not infer internal schema from its value.

## 2. Send a Balbadak report to HOT

`POST https://hot.nowgo.space/api/partner/v1/balbadak/reports`

Headers: `Content-Type: application/json`, `X-Nowgo-Timestamp`, `X-Nowgo-Signature`.

```json
{
  "event_id": "balbadak-event-20261101-000123",
  "source_store_id": "balbadak-store-7788",
  "hot_store_id": "optional-HOT-canonical-store-uuid",
  "store_name": "예시 식당",
  "report_type": "spice",
  "menu_name": "매운 짬뽕",
  "spicy_level": 4,
  "reported_at": "2026-11-01T10:30:00+09:00",
  "report_count": 1
}
```

Allowed report types: `menu`, `spice`, `operating_status`, `visit`. Optional type-specific fields: `menu_name`, `spicy_level` (1-5), `status_signal` (`open`, `closed`, `sold_out`). `report_count` defaults to 1 and caps at 1,000,000. A `spice` report needs a menu and level; `menu` needs a menu; `operating_status` needs a signal. Payload max is 16 KB. Unknown/free-text/personal fields are rejected/ignored by the allowlist.

The event is stored in `hot_partner_reports` with `review_status=pending`. HOT deduplicates on (`source`, `event_id`). Response is `201` for a newly accepted event, `200` for a retry, both with `accepted: true`; review is separate. `source_store_id` is not interchangeable with HOT `store_id`; send `hot_store_id` only after an agreed, verified mapping. Unmatched reports remain attributed and pending.


## 3. Monthly conversion settlement

`GET https://hot.nowgo.space/api/partner/v1/balbadak/settlements?month=2026-11`

Uses the same catalog `Authorization: Bearer <HOT_PARTNER_API_KEY>`. Month boundaries use Korea Standard Time. The fee is fixed at **KRW 100 per approved owner conversion**. A conversion is counted once per distinct HOT store after a signed Balbadak owner referral leads to a successful HOT/NOWGO owner registration flow. Duplicate HOT stores are not counted twice. Ordinary unified-user signups and unverified leads are not billable. Reversed rows are excluded.

```json
{
  "partner": "balbadak",
  "month": "2026-11",
  "currency": "KRW",
  "rate_per_conversion": 100,
  "approved_conversions": 12,
  "settlement_amount": 1200,
  "items": [{"referral_store_id":"nowgo-abc123","hot_store_id":"00000000-0000-0000-0000-000000000001","converted_at":"2026-11-02T01:00:00Z"}],
  "settlement_status": "calculated"
}
```

This API calculates the amount; it does not itself issue an invoice or transfer payment. The parties should agree in writing on cutoff, statement dispute window, invoice/tax handling, and payment date.

## Errors

| Status | Meaning |
| --- | --- |
| `400` | Invalid fields or query |
| `401` | Missing/invalid credential or signature |
| `413` | Request body over 16 KB |
| `429` | Gateway rate limit (configure before key issuance) |
| `503` | Feature secret/database not configured or temporary failure |

## Deployment checklist

1. Confirm written agreement for the KRW 100 conversion event definition, monthly counting cutoff, attribution window, reversals, evidence, invoice/tax handling, minimum fee, and payment date.
2. Confirm limited-use data license, term, per-field scope, caching/retention, rights and consent for incoming source reports, security incident notice, deletion, liability cap, and suspension rights.
3. Apply the migration; configure `HOT_PARTNER_API_KEY`, `BALBADAK_WEBHOOK_SECRET`, and server-only `SUPABASE_SERVICE_ROLE_KEY` in deployment secrets.
4. Test signed referral landing, owner signup attribution, idempotent conversion recording, KST month boundaries, and the settlement endpoint in staging.
5. Configure rate limiting/monitoring, stage credentials, test duplicate report events and signature expiry, then issue the production key.

The branch implementation includes the settlement read endpoint and referral event persistence, but no production deployment, production secrets, database migration run, or staging validation. Do not begin production billing until the checklist passes.
