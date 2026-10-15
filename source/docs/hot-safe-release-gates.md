# HOT #48 / PR #49: safe implementation gate (2026-10-15)

**Never deploy production or mutate production DB as part of this checklist.** Draft implementation only.

## 1. Candidate eligibility / data rights
- Do not scrape NAVER Place or persist/relicense NAVER Search API responses without a separately verified contractual right.
- Candidate source must be merchant-submitted first-party menu data or independently licensed material.
- Require a *server-verified* permission grant: source ID, licensor identity, contract/consent version, covered fields, purpose (display vs resale), allowed retention, revocation, recorded timestamp. A client-provided `permissionReference` string is **not** sufficient authorization.
- Menu evidence must be menu-specific literal '매운맛' or a human-verified pepper icon used as a heat-level indicator. No keyword-only inferred stores.
- Never publish an unverified store's business status as live. Candidate map endpoint stays fail-closed until RLS and rights are independently tested.

## 2. Grey pins / verification state
- `candidate`: grey, label '미확인 후보 · 영업현황 확인불가'; never claim store is onboarded.
- `user_reported`: grey, label '제보자 등록매장 · 영업현황 확인불가'.
- `owner_verified`: existing verified-owner color and live status only if the merchant's authorization and recent status update are valid.
- Deduplicate candidates by a stable independently assigned ID and proximity/name review, not by NAVER place ID alone. Do not import without provenance.

## 3. Menu-specific 1–8 heat levels
- Each menu has its own rating group. Integer submissions 1..8 only.
- Authenticated users may insert/update **their own** one latest rating per menu.
- Community median: odd sample => middle value; even => arithmetic mean (may be x.5), count unique raters, n<3 provisional.
- Owner-declared level (1..8) is stored separately from visitor median. Merchant must not edit or delete visitor ratings.
- Test same-user upsert, cross-user denial, nonexistent menu denial, and all boundary values.

## 4. Owner 8,000 KRW / month feature gate
- The 8,000 KRW/month amount is a requested product spec, **not** proof that payment processing is enabled.
- Only verified merchant owner can modify their store's status, menus, new menu and declared heat level.
- Entitlement must be checked **server-side** from payment provider's verified webhook/subscription state; do not trust a client toggle or URL query.
- Design for billing lifecycle: trial/active/past_due/cancelled, replay-safe webhook idempotency, expiry, refund/cancellation, VAT policy, and audit logs.
- Check RLS for every write and ensure existing merchant data is preserved. No production billing or test charges without a separate validated integration.

## 5. Release gates
1. Code review + successful GitHub Actions tests on PR head (currently **not verified**).
2. Resolve PR branch conflicts with main without force pushes.
3. Development DB tests using disposable identities and full rollback; verify RLS and menu ID integrity.
4. Real logged-in E2E: menu rating, grey pin visibility, verified-owner gating, menu edits and entitlement.
5. Legal/source rights review; evidence sampling and retention policy.
6. Separate user request for production deployment.

## 6. Worker status
Issue #50 describes an automation *request*, not a running daemon. GitHub Actions job scheduling and logs must be observed before reporting an active worker. Run/retry only during KST 09:00–21:59, and never claim continuous background work.
