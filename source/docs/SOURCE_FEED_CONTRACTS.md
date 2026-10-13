# Reviewed public source-feed contracts

This boundary serves public, reviewed, unclaimed HOT source facts only. It does not version or cache accounts, member activity, ownership, or mutable operating facts.

## Current behavior

The shared `lib/source-feed-contract.ts` defines `X-NOWGO-Source-Contract` and the only supported contract IDs:

- Missing header or `hot-source-130-v1`: the unaffected 99-record subset of the original 130-record identity set from `data/hot-source-listings.json`.
- `hot-source-588-v1`: the unaffected 414-record subset of the reviewed 588-record aggregate from `lib/readonly-source-records.ts`.
- `hot-source-591-v1`: the unaffected 417-record subset of the original 591-record aggregate.
- `hot-source-591-v2`: the same 417 publishable records; 174 menu-less identities are excluded.
- `hot-source-946-v1`: 772 publishable records in its reviewed identity set.
- `hot-source-948-v1`: 774 publishable records in its reviewed identity set.
- `hot-source-774-v1`: current menu-only release, 774 records.
- Anything else, including empty, count, prefix, comma-separated, or guessed versions: HTTP 400 with `error: unsupported_source_feed_contract` and `complete: false`. There is no fallback catalog.

`complete: true` means complete for the selected contract. Internal calls to `readonlySourceStoreFeed()` and `readSourcedStoreFeed()` default to current 774, so SSR, direct store pages, and count helpers keep their current release behavior. Only the public HTTP route maps a missing header to legacy 130.

The new client explicitly sends the current contract on both its conditional request and its one allowed unconditional 304 recovery. Its in-memory scope includes origin, planet, and contract. A successful 200 must echo the expected response contract. A matching 304 must have both the expected contract and the exact saved validator before the prior feed object is reused. Cold or mismatched 304 clears the untrusted snapshot and retries once without If-None-Match, retaining the contract header, original abort signal, timeout, and sequence. A second 304 or other failure stops.

All supported contracts return their response contract header and use no-store. Validators include the contract, origin/Host, and complete serialized content; identical bodies in two contracts cannot share validators. Same-origin credentials remain enabled for protected previews. Any Cookie or Authorization request receives no validator and cannot return 304.

Existing strict registry checks and historical source write reservations remain in force. Contract choice cannot make a source ID writable or permit unreviewed records.

## Pins, selection, and errors

All public contracts exclude the 174 menu-less records, including from datasets, compact registry, detail routes and sitemap. Only opaque historical store/menu/alias IDs remain in a server-only guard module. The parser rejects all empty-menu rows. The three affected historical contract bodies change their content ETags; old validators cannot reuse stale menu-less responses. Successful unchanged 304 preserves the exact current client object. A changed 200 replaces facts under stable IDs without duplicating stores.

Unknown-contract 400 follows the existing fail-closed error policy for both cold clients and clients that previously validated a feed: old facts clear, so an open source panel no longer has feed facts. It does not immediately retry, reload the page, invoke a security/login flow, reset drafts, or retain owner/account state. Normal existing 30-second visible polling and focus/visibility refresh behavior remain unchanged.

## What this compatibility layer does not solve

The unversioned default is specifically the supplied 7dd55042 130-record client contract. Earlier unversioned clients, including 105-record bundles, cannot identify their older parser using this header and are not claimed compatible. Before a rights withdrawal, existing 130 tabs could keep their 130-source subset; receiving the current 774 requires the current bundle through normal navigation/reload chosen by the user. This change does not force reloads. Current server-rendered pages and count helpers continue to use the current release.

## Manual future release procedure

1. Freeze every contract that must remain supported into an explicit reviewed snapshot before changing the current aggregate. Do not repoint a previously published contract to an expanded current manifest.
2. Review the new source facts and corresponding compact client registry. Assign a new distinct contract ID in the shared module and an explicit server mapping. Do not introduce arbitrary count, prefix, or client-supplied record filtering.
3. Keep existing IDs and menu IDs stable. If a fact under an existing source identity changes, prove that each retained contract still passes its own strict registry. A conflicting old/new fact may require a separately frozen validator/registry for the old contract; this two-snapshot implementation must not be assumed to support that automatically. Never weaken allowlist validation to make it pass.
4. For a safety withdrawal, explicitly review which supported snapshots must remove the fact. A removal must produce an authoritative response and a changed content validator; legacy subset compatibility is covered by tests. Do not leave a withdrawn fact in an old contract accidentally.
5. Update the current client constant together with its reviewed parser/registry. Preserve the contract header on unconditional recovery and the contract component of client scope, ETag scope, and response validation.
6. Run the self-contained contract, conditional-request, write-guard, and selected-identity tests. Review intentional changes to the locked legacy DTO hash. Separately execute retained old compiled clients against the actual route responses and record which old versions are and are not supported.
7. Build and verify the integrated release. Exercise unversioned legacy 200, explicit current 200/304, cross-contract validator rejection, unknown 400, credentialed 200, and removal/error/race behavior before deployment. Remove an old contract only after an explicit compatibility decision; an unsupported contract must stay a clear error rather than silently receiving another feed.

## 2026-10-13 authorized menu-rights withdrawal

Exactly 174 source-only identities retain their independently licensed SBIZ names, addresses, coordinates, IDs and gray pins, with `menus: []`. The compact client registry records these identities with `menuKey: null`; the withdrawn menu record and its original name, URL, source IDs and provenance have been removed. There is no fallback dish, price, image, rating or branch-sale claim. Genuine customer-report data and paths are unchanged.

The affected counts are 31 of 130, 174 of 588 and 174 of 591. Historical v1 contracts return only the unaffected 99, 414 and 417 rows respectively. Current 591-v2 returns all 591 identities, with 174 empty menu arrays. All old contract bodies intentionally change and therefore receive new content ETags. Their feed review watermark includes the withdrawal review at 2026-10-13T13:31:00.000Z, while original identity/coordinate source dates stay intact. `complete` means complete for the selected reviewed contract, including its explicit compatibility withdrawals.

Historical compiled clients require one reviewed menu and reject any feed containing a menu-less row. Their v1 contracts therefore deliver only unchanged unaffected rows. Baseline-parser verification accepts all three reduced bodies, so unaffected source pins remain visible after the next refresh while withdrawn rows disappear. A normal page reload/navigation to the new bundle requests 591-v2 and restores all 591 identities, including the 174 menu-less cards and pins. No dish sentinel or fallback menu is fabricated. There is no claim that withdrawn old response bodies remain immutable or that old bundles can retain all pins without a reload. Old in-memory content cannot be retroactively erased before the browser refreshes; a content-derived ETag prevents the server from approving a stale body with 304.

Historical source menu IDs remain in a server-only `revokedMenuIds` reservation alongside unchanged aliases. Removing display facts does not authorize report edits, writes, registrations or ownership actions. Store-name keyword matches remain valid SBIZ identity matches; no menu-name search field survives for the affected stores.
