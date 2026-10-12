# Local regular-customer controls

`components/preview-regular-controls.tsx` is a preview-only component. Its parent owns the `saved` flag for the current `{id, name}` store fixture and supplies `onToggle`. Initialize that flag to `false`, keep it in component state only, and reset it when the selected fixture changes or the preview is remounted. Do not wire it to the production favorite mutation.

- Registration and removal call only `onToggle`. The list contains at most the current fixture; an unsaved fixture shows an explicit empty state.
- If the optional callback is absent, registration and removal are disabled, with an explicit explanation; no placeholder callback pretends a mutation succeeded.
- Opening, closing, reopening, and Escape only change the panel's local open state. The panel does not navigate or change browser history. Closing returns focus to its disclosure button.
- There are no auth, session, network, storage, XP award, or production favorite imports. This component intentionally does not invoke `RegularHomeLink`, `RegularFavorite`, `CustomerPanel`, or `useActivity`.
- The page states that registration is local, is not a real personal favorites list, and resets on refresh.
- “캐릭터 라벨” is displayed beside the existing character illustration, separately from account level. `CharacterArt` uses the existing HOT growth sprite (`/activity/characters-growth.webp`), with `index={0}` and the existing `RANKS[0].name` (탐험가). The label is explicitly “탐험가 · 캐릭터 미리보기”; it does not claim that the visitor owns this character or rank.
- Account level and EXP both show “로그인 후 확인”. There is no fabricated customer ID, nickname, XP value, or personal rank. A future authenticated integration must use that customer's verified `ActivitySnapshot` rather than a shared or fixture account.

Focused checks: `node --test tests/preview-regular-controls.test.mjs` and `node_modules/.bin/eslint components/preview-regular-controls.tsx tests/preview-regular-controls.test.mjs`.
