# HOT owner and visitor authorization / RPC contract (approved 2026-10-16 KST)

Status: PRODUCT SPEC APPROVED; implementation and database changes NOT APPROVED BY THIS DOCUMENT. No production deployment.

## Source of truth — supersedes older 1–8 discussions

- HOT owner-declared menu heat **1..7 integers**. HOT visitor menu heat **1..7 integers**.
- Stage 7 label **극강의 매운맛**. Labels: 순한맛 / 살짝 매운맛 / 매콤한맛 / 확실히 매운맛 / 아주 매운맛 / 불같이 매운맛 / 극강의 매운맛.
- Flavor (맛의 결) is independent of heat: 얼큰한, 칼칼한, 달콤매콤한, 알싸한.
- SWEET and RICH keep their existing 1..5 rating scales; do not change them as part of HOT release.
- Visitor median is calculated per canonical menu from the latest valid rating per unique user. Odd sample -> middle; even -> arithmetic average (.5 possible); 0 ratings -> "평가 전"; n=1..2 -> provisional and display n. Owner-declared heat must never overwrite visitor ratings.
- Existing #48/#50 descriptions and PR #49 title referring to 1..8 are obsolete. Do not restore 8 merely to make legacy tests pass. Update legacy tests and historical specifications together.

## Access roles and entitlements

| Actor | Read public verified menu/status | Submit own report/rating | Manage store status | Manage store menus, heat/flavor, sold out | Billing management |
| --- | --- | --- | --- | --- | --- |
| Guest | Yes (subject to login gate) | No | No | No | No |
| Signed-in visitor | Yes | Yes, own only | No | No | No |
| Unverified store applicant | Public only | Visitor privileges | No | No | Start or inspect own subscription only if allowed |
| Verified owner with no active HOT plan | Yes | Visitor privileges | No | No | Start or inspect own subscription |
| Verified owner with active HOT plan | Yes | Own visitor ratings only | **Own store only** | **Own store only** | Own plan only |
| NOWGO admin | Explicitly separately authorized audited administration | No silent impersonation | Separate admin endpoint | Separate admin endpoint | Separate admin endpoint |

Required privilege check on **every mutating owner request**, not merely at dashboard entrance:
1. Verify Supabase identity with a trusted authenticated server session (reject expired or anonymous sessions).
2. Look up **server-verified** owner–store mapping. Never trust a self-set `user_metadata` role, request `storeId`, or client-side toggle.
3. Confirm the store is active/approved, belongs to HOT and has not been suspended.
4. Verify signed webhook/subscription ledger grants current **8,000 KRW per month HOT plan**. `ACTIVE` entitlement only while not expired; grace/trial require an explicit separate policy, not implicit permission.
5. For menu edits check canonical menu ID belongs to the verified store **and** HOT before write.
6. Apply RLS and least privilege to base tables. `authenticated` role alone is not ownership. Ensure INSERT/UPDATE and SELECT policies; UPDATE requires both USING and WITH CHECK.
7. No direct public write to other owners' stores, customers' ratings, subscription ledger or source-evidence table.

## RPC requirements (names describe API contract, NOT deployed functions)

Implement or reconcile against existing DB functions before creating replacements. Transactional functions must be atomic, idempotent where requested, and verify caller identity/ownership/subscription inside the database. Prefer SECURITY INVOKER with RLS. If SECURITY DEFINER is unavoidable, isolate in a nonexposed schema, restrict EXECUTE, validate auth.uid internally, audit and review with advisors.

| RPC | Parameters | Verified result / failure |
| --- | --- | --- |
| `ng_map_dashboard_access` | `p_planet='hot', p_store uuid?, p_link uuid?` | Only own store dashboard access and `access.code` (owner verification, subscription). No sensitive data from other stores |
| `ng_map_can_publish` | `p_planet='hot', p_store uuid` | true iff verified owner + active valid HOT subscription + store permitted |
| `ng_map_set_status` | `p_planet='hot', p_store uuid, p_value valid status` | Persist status and update timestamp; reject foreign store, invalid status |
| `ng_map_save_menu` | `p_planet='hot',p_store uuid,p_menu uuid? ,p_name,p_price,p_level (1..7),p_flavor,p_category,p_photo` | Insert/edit canonical menu only for owned store; menu ID returned; input/photo checked; no overwrite of visitor rating |
| `ng_map_set_menu_taste` | `p_planet='hot',p_store uuid,p_menu uuid,p_level (1..7),p_flavor,p_category` | Update ONLY owner's declared taste for existing owned HOT menu; reject 0/8/noninteger |
| `ng_map_set_menu_soldout` | `p_planet='hot',p_store uuid,p_menu uuid,p_soldout boolean` | Save soldout and return committed value |
| `ng_map_register_contact` | `p_planet='hot',p_store uuid,p_phone` | Only owner during approved signup; do not expose contact publicly |
| `ng_map_confirm_signup_location` | `p_store uuid,p_lat,p_lng` | Only verified relevant owner; validate actual land coordinate and store association |
| `ng_map_adopt_signup_menu` | `p_planet='hot',p_store uuid,p_menu uuid,p_price,p_level (1..7),p_flavor,p_category,p_photo` | Atomic association, valid menu ownership, rollback-safe |
| `hot_menu_spice_summary_for` | `p_menu_id uuid` | `median_level, rating_count` aggregate only; no user IDs exposed |
| Visitor rating write | authenticated POST `/api/spice-ratings` `menuId,level (1..7)` | Upsert (menu,user) exactly once per user/menu; user cannot spoof user ID; real menu must exist |
| Report write | authenticated POST `/api/reports` with `heat 1..7`, `flavor` | Client cannot spoof author, receipt must be idempotent, published state separately controlled |

Mutating API success = committed transaction plus read-back value matching the input. Expose machine-readable errors: `AUTH_REQUIRED` (401), `OWNER_REQUIRED` or `OWNED_STORE_REQUIRED` (403), `SUBSCRIPTION_REQUIRED` (402 or explicit 403), `INVALID_INPUT` (400), `NOT_FOUND` (404), `WRITE_FAILED` (5xx); do not return generic success before data is persisted. Write audit log with actor, store, menu, action, request ID, timestamp, previous/next values (redact secrets). Avoid operations that leave orphaned photo uploads; cleanup and retry must be idempotent.

## Source provenance and grey-pin safety

- Only owner-supplied menu evidence or evidence separately licensed for the intended commercial use may be persisted/published. Client-provided permissionReference alone is not proof.
- Store candidate is grey with "미확인 후보 · 영업현황 확인불가" until verified. User-reported store grey with "제보자 등록매장 · 영업현황 확인불가". No invented live/availability status.
- Candidate listing stays disabled until provenance review and candidate-table RLS/anon access are verified.

## Environment separation and release gates

- Never call `nowgo-prod.vercel.app/api/owner/subscription` from development subscription paths unless explicitly configured in an isolated, proven read-only mode; never use real payment webhook/session during dev tests.
- Existing Nowgo-dev observations (2026-10-16): HOT rating DB check is 1..7, 0 visitor ratings; owner RPCs `ng_map_dashboard_access`, `ng_map_can_publish`, `ng_map_save_menu`, `ng_map_set_menu_taste`, `ng_map_set_status`, `ng_map_set_menu_soldout` were not found by signature inventory; legacy subscription constraint is 1,900 KRW and legacy product/price codes. Do not silently expand old plan or bypass payment.
- Release requires: product tests 7 allowed/8 denied in UI+API+DB; SWEET/RICH unchanged; real authenticated visitor save/read-back; two distinct users' ratings and median; foreign owner denied for all writes; expired/nonexistent subscription denied; verified subscriber own store status/menu save and read-back; RLS checks, photo cleanup test, empty candidate safely hidden, CI passing on PR head, conflict-free review, and separate explicit authorization before any production deployment or prod DB change.
- NO real candidate scraping, no production DB writes, no merges, no deployment under this contract.
