# Reviewed public source-feed contracts

This boundary serves public, immutable, unclaimed HOT source facts only. It does not version or cache accounts, member activity, ownership, or mutable operating facts.

## Current behavior

The shared `lib/source-feed-contract.ts` defines `X-NOWGO-Source-Contract` and the only supported contract IDs:

- Missing header or `hot-source-130-v1`: the exact reviewed 130-record compatibility snapshot from `data/hot-source-listings.json`.
- `hot-source-588-v1`: the reviewed 588-record aggregate from `lib/readonly-source-records.ts`.
- Anything else, including empty, count, prefix, comma-separated, or guessed versions: HTTP 400 with `error: unsupported_source_feed_contract` and `complete: false`. There is no fallback catalog.

`complete: true` means complete for the selected contract. Internal calls to `readonlySourceStoreFeed()` and `readSourcedStoreFeed()` still default to current 588, so SSR, direct store pages, and count helpers keep their current release behavior. Only the public HTTP route maps a missing header to legacy 130.

The new client explicitly sends the current contract on both its conditional request and its one allowed unconditional 304 recovery. Its in-memory scope includes origin, planet, and contract. A successful 200 must echo the expected response contract. A matching 304 must have both the expected contract and the exact saved validator before the prior feed object is reused. Cold or mismatched 304 clears the untrusted snapshot and retries once without If-None-Match, retaining the contract header, original abort signal, timeout, and sequence. A second 304 or other failure stops.

Both supported contracts return their response contract header and use no-store. Validators include the contract, origin/Host, and complete serialized content; identical bodies in two contracts cannot share validators. Same-origin credentials remain enabled for protected previews. Any Cookie or Authorization request receives no validator and cannot return 304.

Existing strict registry checks and all-588 write reservations remain in force. Contract choice cannot make a source ID writable or permit unreviewed records.

## Pins, selection, and errors

Supported old-130 and new-588 requests preserve each existing store ID, menu ID, and source fact. Successful unchanged 304 preserves the exact current client object. A changed 200 replaces facts under stable IDs without duplicating stores.

Unknown-contract 400 follows the existing fail-closed error policy for both cold clients and clients that previously validated a feed: old facts clear, so an open source panel no longer has feed facts. It does not immediately retry, reload the page, invoke a security/login flow, reset drafts, or retain owner/account state. Normal existing 30-second visible polling and focus/visibility refresh behavior remain unchanged.

## What this compatibility layer does not solve

The unversioned default is specifically the supplied 7dd55042 130-record client contract. Earlier unversioned clients, including 105-record bundles, cannot identify their older parser using this header and are not claimed compatible. Existing 130 tabs keep 130 source facts; receiving all 588 requires the new bundle through normal navigation/reload chosen by the user. This change does not force reloads. Current server-rendered pages and count helpers continue to use the current release.

## Manual future release procedure

1. Freeze every contract that must remain supported into an explicit reviewed snapshot before changing the current aggregate. Do not repoint a previously published contract to an expanded current manifest.
2. Review the new source facts and corresponding compact client registry. Assign a new distinct contract ID in the shared module and an explicit server mapping. Do not introduce arbitrary count, prefix, or client-supplied record filtering.
3. Keep existing IDs and menu IDs stable. If a fact under an existing source identity changes, prove that each retained contract still passes its own strict registry. A conflicting old/new fact may require a separately frozen validator/registry for the old contract; this two-snapshot implementation must not be assumed to support that automatically. Never weaken allowlist validation to make it pass.
4. For a safety withdrawal, explicitly review which supported snapshots must remove the fact. A removal must produce an authoritative response and a changed content validator; legacy subset compatibility is covered by tests. Do not leave a withdrawn fact in an old contract accidentally.
5. Update the current client constant together with its reviewed parser/registry. Preserve the contract header on unconditional recovery and the contract component of client scope, ETag scope, and response validation.
6. Run the self-contained contract, conditional-request, write-guard, and selected-identity tests. Review intentional changes to the locked legacy DTO hash. Separately execute retained old compiled clients against the actual route responses and record which old versions are and are not supported.
7. Build and verify the integrated release. Exercise unversioned legacy 200, explicit current 200/304, cross-contract validator rejection, unknown 400, credentialed 200, and removal/error/race behavior before deployment. Remove an old contract only after an explicit compatibility decision; an unsupported contract must stay a clear error rather than silently receiving another feed.
