# NOWGO HOT 실제 원본 소스 — Claude 전달 안내

## 결론

사용자의 선택은 **1번: 실제 원본 앱 소스를 이전**입니다. 현재 정적 시안에 기능을 새로 흉내 내는 작업이 아닙니다. 이 ZIP의 `source/`는 원래 ChatGPT Sites 앱의 React/TypeScript 소스, 스타일, 사진, 폰트, API, SQL 마이그레이션, 잠금파일을 포함합니다.

이 문서가 이전 README/VALIDATION의 과거 시안 설명보다 현재 상태를 우선합니다. 본 ZIP은 **원본 소스 내보내기**이며, Vercel 배포가 완료된 패키지가 아닙니다.

## 확정된 대상

- 운영 주소: `https://hot.nowgo.space`
- 사용자가 전달한 Vercel 프로젝트: `https://vercel.com/nowgo-s-projects/hot-nowgo`
- 사용자가 전달한 GitHub: `kjwcoin/kjwcoin-hot-nowgo`, `main`
- 원본 화면: `https://nowgo-hot-seoul.workspace-948032.chatgpt.site/`
- 원본 지도: 위 주소의 `/map`
- 원본 빨간 로고: `source/public/images/nowgo-red.png`
- 원본 기준 커밋: `883fbe687c1aa7af7ef6b1169335caf47e5a0881`
- 내보내기는 현재 작업 사본을 포함합니다. 기준 커밋 이후 통합회원 문구·복귀 경로·같은 탭의 제보 텍스트 임시보관 등 4개 파일 변경은 `WORKING_CHANGES.patch`에 별도로 기록했습니다.

## 디자인·기능 보존 기준

1. `components/map-explorer.tsx`, `components/hot-app.tsx`, `app/globals.css`의 원래 디자인을 기준으로 음식 사진, 여백, 타이포그래피, 메뉴 상세, 반응형 구성을 유지합니다.
2. 상단은 `components/brand.tsx`에 있는 빨간 NOWGO 이미지 하나만 사용합니다. HOT/by/상단 슬로건을 다시 붙이지 않습니다. 로고 원본을 자체 `/images/nowgo-red.png`로 제공합니다.
3. ‘맛잘알이 제보하는 핫한 맛부심’ 콘셉트는 프로모션 화면에 둡니다. 원본 현재 경로는 `/`가 프로모션, `/map`이 지도입니다. 운영 주소 루트에 지도를 열기로 정했다면 지도는 `/`, 프로모션은 `/promotion`으로 명시적으로 배치하고 내부 링크·제보 앵커·로그인 복귀 허용 경로를 함께 수정합니다. 임의로 프로모션을 삭제하지 않습니다.
4. 검색·맵기·맛·메뉴·예산 필터, 초기화, 메뉴 상세, 목록 복귀, 제보 이동, 회원 안내창의 실제 동작을 보존합니다.
5. 기존 DNS와 메인 NOWGO 운영 사이트는 유지합니다. 먼저 HOT 프로젝트의 현재 배포와 소스 연결을 확인하고 같은 프로젝트에 복구합니다.

## 바로 Vercel에 올릴 수 없는 이유와 이전 경계

원본은 Next App Router 형태의 React 앱을 **Vinext / Vite / Cloudflare Workers**에서 실행합니다. `pnpm build`도 현재는 이 환경용 빌드입니다. Vercel에서 Next.js를 선택하는 것만으로 이전이 끝나지 않습니다.

| 원본 의존성 | 파일 | Vercel 이전 시 필요한 작업 |
|---|---|---|
| Cloudflare 환경 바인딩 | `lib/server.ts`, `lib/unified-auth.ts`, API 일부 | 서버 환경변수/서비스 어댑터로 이전. 공개 값과 비밀 값을 분리 |
| D1 SQL | `db/`, `lib/server.ts`, 각 API | 사용자가 승인한 운영 저장소에 데이터 접근 구현. SQLite SQL을 PostgreSQL에 그대로 실행하지 않기 |
| R2 사진 저장소 | `bucket()` 및 사진 API | 서버 전용 객체 저장소 어댑터 구현. 사진 접근 권한 유지 |
| Vinext 빌드 플러그인 | `vite.config.ts`, `build/`, `scripts/` | Vercel용 Next.js 빌드로 전환하고 필요한 의존성·잠금파일 동기화 |
| Sites 인증 보조 코드 | `app/chatgpt-auth.ts` | 외부에서 보낸 `oai-authenticated-*` 헤더를 신뢰하는 방식으로 공개 서비스 인증을 구현하지 않기. 실제 사용처를 확인하고 플랫폼 전용 보조 코드는 제거/격리 |

현재 확인된 `cloudflare:workers` 직접 참조는 `db/index.ts`, `lib/server.ts`, `lib/unified-auth.ts`, `app/api/[action]/route.ts`, `app/api/place-status/[id]/route.ts`, `app/api/review-link/[id]/route.ts`입니다. 변환 시 전체 참조를 다시 검색하십시오.

API 계약·회원 권한·사진 권리·기존 데이터 보존이 중요합니다. UI 복구만 하고 저장/제보 성공을 가짜로 표시하면 안 됩니다. 운영 DB 변경이 필요하면 마이그레이션과 롤백을 검토하고 별도로 실행합니다. ZIP에는 실제 DB 레코드와 업로드된 사진 데이터가 없습니다.

## 환경 설정

`source/.env.example`은 이름과 비밀이 아닌 기본값만 포함합니다. 운영 키는 사용자 소유 프로젝트의 정상 설정 경로에서 재설정합니다. ZIP에는 `.env`, 인증 토큰, 세션 데이터, `.git`, `node_modules`, 빌드 결과가 없습니다. `.openai/hosting.json`은 논리 DB/BUCKET 바인딩만 남겼고 원래 Sites 프로젝트 ID를 제거했습니다. 기존 원본 사이트를 잘못 덮어쓰지 마십시오.

- Kakao JavaScript 키: 공개 SDK 키이며 `https://hot.nowgo.space`를 허용 origin에 등록해야 합니다. 서버 REST 키와 혼동하지 마십시오.
- Kakao REST 키: 신규 주소 검증용 서버 비밀입니다.
- NOWGO_AUTH_*: 실제 중앙 인증 서버에 HOT 클라이언트와 정확한 콜백 주소가 등록된 후 설정합니다.
- 중앙 인증 API, 공식 상태/리뷰 매핑, 세션 암호화 키를 추정하거나 가짜 값으로 준비 완료 처리하지 마십시오.

## 검증한 것과 아직 안 된 것

- 원본의 TypeScript 검사 통과.
- 원본 테스트 16개 통과. API 외부 서비스를 모두 연결한 E2E 결과는 아닙니다.
- 원본 브라우저 확인: 떡볶이 검색으로 결과 3→1, 초기화, 예산 1만 원 필터로 3→2, 카드 클릭 상세 진입, 목록 복귀, 통합회원 안내창 열기 정상.
- 지도 SDK는 확인 당시 미리보기에서 로딩 오류 안내가 표시됐습니다. 실제 운영 origin에서 지도 타일·마커를 별도로 검증해야 합니다.
- 통합회원 중앙 연결은 미완료입니다. 안내창은 동작하지만 실제 통합가입 완료를 의미하지 않습니다. 미연결 시 제보 제출은 차단합니다.
- 미리보기에서 실제 제보 신규 등재·사진 업로드·운영 DB 저장·중앙 로그인 왕복은 검증하지 않았습니다.
- `hot.nowgo.space` 실제 배포는 이 ZIP 생성으로 변경되지 않습니다.

## 실행 요청

이 소스를 기준으로 기존 UI/UX를 보존하여 위 Vercel 프로젝트로 이전해 주세요. 먼저 연결 저장소/브랜치/현재 배포 커밋을 확인하고 롤백 지점을 확보하세요. 원본 API와 서버 의존성을 지원하는 형태로 이식한 뒤 미리보기에서 PC·모바일 주요 흐름을 확인하세요. 사용자는 개발·반영·배포를 요청했습니다. 배포 후에는 실제 `hot.nowgo.space`에서 로고, 검색, 필터, 상세, 제보 진입, 회원 연결 상태를 확인하고 실제 반영 커밋과 남은 미연결 기능을 보고하세요.

DNS 수정, 새 디자인 제작, 기능 없는 정적 HTML 대체, 운영 데이터 초기화로 해결하지 마세요.
