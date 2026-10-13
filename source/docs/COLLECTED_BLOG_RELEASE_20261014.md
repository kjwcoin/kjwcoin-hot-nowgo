# HOT blog-source release — 2026-10-14

This release includes 217 shop/menu/address facts with a matched map POI, selected from 1,492 blog-directory candidates. It preserves the 774 previously published identities and their menu facts. Exact normalized name/address duplicates are omitted at feed assembly. The new client explicitly requests `hot-source-blog-20261014-v1`; the previous 774 and older HTTP contracts remain available.

Public shop, menu and address facts are attributed through a per-row blog URL. Blog prose, photographs, ratings and private contact fields are not reproduced. These listings are not consumer reports, owner registrations, current-business checks, or an assertion of an open licence. They are excluded from search indexing pending further review.

217 rows have a single map POI matched using the same shop name and source address or business telephone. Matching coordinates and POI URLs are retained. 84 rows did not uniquely match, one lookup failed, and 1,190 rows could not be queried after the network policy blocked further map-provider access. Those 1,275 rows remain unpublished in the privately saved candidate package; they are not included in the release or map. No standalone public list UI was introduced.

The user requested red pins for this collection. A separate `markerColor` controls appearance; `ownerClaimVerified=false`, unclaimed ownership, null operating status, price, heat, image and current availability remain unchanged. Exact release validation prevents an arbitrary URL, changed shop/address, or client-supplied coordinates from entering this collection. Source write guards reserve all new shop/menu identities.

Verified locally with TypeScript, the production build, focused feed integrity, marker, filter, and rendered source-label tests. Live public counts and direct detail-page availability are checked after deployment.
