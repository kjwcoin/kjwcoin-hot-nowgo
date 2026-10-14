# HOT partner read API

The endpoint exposes only menu records already published through HOT's public `hot_public_menus` view.

## Endpoint

`GET https://hot.nowgo.space/api/partner/v1/hot/menus?page=1&limit=100`

No API key is required. This is public discovery data already visible through HOT; the endpoint does not expose reporter IDs, contact details, business numbers, photos, notes, or unpublished reports. CORS is enabled for browser-based partner clients. Responses are CDN cacheable for 60 seconds.

## Response

```json
{
  "data": [
    {
      "store_id": "nowgo-00000000-0000-0000-0000-000000000000",
      "store_name": "매장명",
      "menu_name": "메뉴명",
      "spicy_level": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "has_more": false
  },
  "member_signup_url": "https://hot.nowgo.space/account/join?type=user&returnTo=%2F"
}
```

`store_id` is HOT's `place_id`. For a matched NOWGO store it uses `nowgo-<NOWGO store UUID>`; other public reports retain their existing source store identifier. `spicy_level` is the HOT 1–5 heat scale. Pages are 1-based; `limit` accepts 1–100.

The member signup URL takes visitors to HOT's user join flow, which uses the shared NOWGO account. The flow returns them to the HOT menu map.

## Errors

- `400`: invalid page or limit.
- `503`: the public catalog could not be read.

## Inbound Balbadak reports

This endpoint is read-only. Balbadak report ingestion needs a separate authenticated POST contract. HOT's existing report flow requires a NOWGO unified member session, required HOT consent, and the report fields/photo used by its publication checks. Do not post user IDs supplied by a client or bypass those checks. Define the Balbadak payload and whether incomplete reports should enter a private review queue before enabling inbound sync.

## Verification

Check the response from the deployed HOT host after the code is merged and deployed. The production `hot_public_menus` view was empty when this API was prepared, so the endpoint can return an empty `data` list until HOT has published menu records.
