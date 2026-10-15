# HOT public-source map entries

HOT consumes `https://www.nowgo.space/api/nowgo/hot/sourced-stores` through its same-origin `/api/sourced-stores` proxy. No additional credential or direct source-table connection is used. Enable `NOWGO_UNCLAIMED_STORES_ENABLED=true` only after the Space public feed is ready. A disabled, unavailable, malformed, or oversized feed is an explicit unavailable state, including the viewport total; it must not silently produce a catalog-only complete total.

The response is `{ stores, complete, asOf }`. The current source rollout is bounded at 5000 source stores. Space must fail or mark the response incomplete when its limit is reached; it must not silently truncate a complete feed. HOT validates each public DTO and drops nonpublic extra fields. A failed/partial viewport result is never cached as complete.

## Data and identity

- `PublicSourcedStore` remains separate from `Menu`. Source menu price, heat, and image are null, never zero, a taste stage, or a placeholder photo.
- Source ownership is either `unclaimed` / `ownerClaimVerified:false` / `gray`, or `verified` / `ownerClaimVerified:true` / `owner-verified`. All three must agree. Space derives claim proof; HOT does not infer it from a name, registration, or owner ID.
- Source-only stores remain visible after a verified claim while no verified owner-menu catalog is available. Their known source menus remain labeled as public-source facts and operational/menu availability remains unknown.
- Exact `nowgo-{store.id}` canonical place identity has priority. Only a unique normalized full name + full address may link legacy reports. Two explicit canonical IDs never merge through text.
- Existing consumer reports, their IDs, attribution, and real report totals are preserved. A source-only store does not gain a consumer report count.
- Missing source coordinates produce a list-only entry; no location is invented. A 15 km location filter excludes entries that lack coordinates.

## Map and filter behavior

Source pins link directly to `https://www.nowgo.space/p/{slug}`. An unclaimed source pin is gray regardless of the store name; a source marker changes color only with explicit verified claim proof. It never uses a taste-stage sprite or a numeric price. A real verified owner-menu group takes precedence over its matching source marker.

Keyword search can match known source store names, addresses, and menu names. Source entries do not satisfy selected price, heat, flavor, or category filters while those facts are unknown. This rule is shared by the list and viewport count.

The viewport count scans the existing public catalog separately from the capped menu list, adds matching source stores inside the actual bounds, and deduplicates with the same canonical-first identity rules. Its complete/partial state is separate from the displayed pins and list, which are limited to loaded data and, when enabled, the user's 15 km radius.

## Verification

Focused tests cover feed boundaries, six-source integration, claimed transitions, mixed consumer/owner duplicates, explicit-ID conflicts, source filters, missing coordinates, unavailable/partial counts, marker DOM, and rendered source cards/notices. Run:

`node --experimental-strip-types --test tests/sourced-store-*.test.mjs tests/viewport-store-count.test.mjs tests/viewport-count-client.test.mjs tests/menu-store-groups.test.mjs tests/map-store-count-route.test.mjs`

Use `tsc --noEmit` and the normal project build. For an isolated checkout whose `node_modules` is a symlink outside the checkout, use `npm run build -- --webpack`; Turbopack rejects that filesystem layout.

## Selected-menu customer reports

Mini-page menu actions link to `/suggestion?reportStore={store UUID}&reportMenu={canonical menu ID}#report`. The form resolves `/api/report-target`, whose server calls only the fixed Space public endpoint `/api/nowgo/hot/report-target`. Returned store/menu/place identifiers must exactly match the selection. Source menu IDs follow `data-go-kr-…:menu:N`; owned canonical menus are UUIDs. Missing, invalid, stale, or unavailable targets never fall back to a free-text report.

Selected mode is explicitly submitted with `selectionMode=selected`, `selectedMenuId`, and `storeId`, and is restricted to HOT customer reports. Store name, address, menu name, place identity, and coordinates come from the server resolver. The request UUID stays separate from the canonical `menu_id`; retries compare the saved immutable report fields before returning any receipt. Only receipt ID/status are returned, not the private stored contact fields used for that comparison.

The selected form requires the customer to choose heat, category, and flavor, rather than preselecting an opinion. Existing required actual price, photo, contact, observation date, and consent checks remain. Free-text creation and correction keep their previous independent report identity and are not automatically aggregated under a canonical menu.

URL changes and browser Back cancel stale target resolution. A repeated click on the same selection retains its form. A submission that completes after navigation may refresh report history but cannot reset or replace the newer form. Login return links preserve canonical selection; restored selected drafts may restore only authored report fields, never authoritative labels.

The Space resolver and database publication guard remain authoritative for current target validity and excluding target owners from customer aggregation. Local tests mock all network/database/storage calls; no deployment or live database validation is implied.

## Canonical customer median display

Source cards load `/api/menu-heat` once when their summary section becomes visible, batching that store's known source menu IDs. The HOT proxy forwards only validated store/menu identifiers to `https://www.nowgo.space/api/nowgo/hot/menu-heat`, with a five-second deadline, no credentials, and redirects disabled. Queries allow one store, at most 50 repeated menu IDs, and an 8192-character URL bound.

Only `state: ready`, `coverage: canonical_selected_reports_only`, `scale: 5`, and exact complete per-menu coverage may display statistics. Every dish retains its own median and participant count. Five chili segments show the exact half-step median, so 2.5 fills two segments and half the third; sample count never controls chili fill. A confirmed zero sample uses `medianHeat: null`, with no numeric zero median. Pending, errors, 429, malformed responses, and missing menu coverage remain unknown.

These summaries do not modify the public-source menu's null heat field, map filters, pin ownership, or viewport store counts. Legacy/free-text catalog heat is labeled as individual-reported heat with menu median unaggregated. Owner-declared and demo heat are explicitly identified as declarations/examples, not customer medians. HOT never fetches raw report history or maps historical report IDs/names into these summaries.
