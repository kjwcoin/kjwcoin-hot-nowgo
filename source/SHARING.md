# Approved sharing cards

The owner requested on 2026-09-26 that the KakaoTalk and message-preview artwork and copy remain fixed unless explicitly requested. HOT 01, SWEET 02 and RICH 03 are the approved artwork, including the corrected logos.

- `config/social-previews.json` is the single source for sharing copy and URLs.
- Keep every existing `/og/` image URL working. Do not delete assets during UI or feature work.
- `scripts/verify-social-previews.mjs` checks the approved manifest and image hashes before builds.
- Root and home metadata use `socialMetadata`. Complete metadata is sent in the initial HTML for preview crawlers.
- Only an explicit owner request to change sharing artwork/copy should update the manifest approval hash.
- After an intentional change, verify the public HTML and a nonempty image response with KakaoTalk and Applebot user agents. A successful deploy alone is not a sharing check.
