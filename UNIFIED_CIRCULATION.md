# NOWGO 통합회원 · HOT · 프로모션 순환 기준

작성일: 2026-09-24

## 한 문장 구조

프로모션에서 HOT로 유입되고, HOT에서 발견·저장·제보하며, 회원 확인은 NOWGO 중앙에서 한 번만 하고, 원래 보던 HOT 화면으로 돌아온다. 매장의 공식 영업·품절·소유권과 미니홈피는 NOWGO가 기준이며 HOT은 취향 발견과 근거 있는 제보를 담당한다.

## URL과 역할

| 주소 | 역할 | 핵심 이동 |
|---|---|---|
| `https://hot.nowgo.space/` | HOT 소비자 프로모션: “맛잘알이 제보하는 핫한 맛부심” | 맛지도 보기 → `/map`, 제보 → `/#report` |
| `https://hot.nowgo.space/map` | 검색·필터·메뉴 탐색 | 메뉴 상세, 저장, 제보, 출발 전 확인 |
| `https://www.nowgo.space/account/login` | 일반회원 중앙 소셜 로그인·가입 | 동의 완료 후 원래 HOT 경로로 복귀 |
| `https://www.nowgo.space/account/consent` | 닉네임·필수 약관·HOT 연결 승인 | 단회 코드 발급 후 HOT callback |
| `https://www.nowgo.space/account` | 통합회원 계정 관리 | HOT로 돌아가기 |
| `https://www.nowgo.space/p/[slug]` | 매장 미니홈피·공식 현재 상태·리뷰 | HOT 메뉴와 상호 이동 |
| `https://www.nowgo.space/promotion` | NOWGO 점주/플랫폼 프로모션 | HOT 소비자 경험 소개·맛지도 진입 |
| `https://www.nowgo.space/owner/login` | 점주 로그인·가입 | 사업자·매장 소유권 확인. 일반회원 가입만으로 점주 권한 부여 금지 |

## 사용자 왕복

1. SNS·검색·NOWGO 프로모션에서 HOT 프로모션 또는 `/map`으로 들어온다.
2. 비회원도 공개 메뉴를 검색·필터·열람한다.
3. 저장 또는 제보 제출처럼 회원 기능을 선택하면 HOT이 현재 경로·허용된 필터·해시와 PKCE 요청을 서버에 보관한다.
4. 브라우저는 NOWGO 중앙 로그인으로 이동한다. Google 또는 Kakao로 기존 계정에 로그인하거나 처음 가입한다.
5. 중앙에서 닉네임, 필수 이용약관·개인정보 동의, HOT에 최소 프로필을 전달한다는 연결 승인을 받는다.
6. NOWGO는 HOT의 정확히 등록된 callback으로 60초 단회 코드를 보낸다.
7. HOT 서버가 코드와 PKCE verifier를 교환하고, 이메일·전화번호·Supabase 토큰 대신 범위가 제한된 불투명 토큰을 받는다.
8. 사용자는 로그인 전에 보던 `/map`, 메뉴 상세 또는 `/#report`로 돌아온다. 같은 탭에 저장한 제보 초안을 복구하되 사진과 공개 동의는 다시 확인한다.
9. 제보가 검증 조건을 통과하면 HOT 활동 데이터로 기록된다. 공식 매장 상태로 자동 승격하지 않는다.
10. 메뉴의 “출발 전 가게 확인”은 확인된 매핑이 있을 때 NOWGO 미니홈피로 이동한다. 점주가 확정한 영업·품절 정보와 리뷰는 NOWGO가 원본이다.

## 데이터 책임

| 구분 | 권위 있는 원본 | 기본 저장 내용 |
|---|---|---|
| 중앙 사람 ID | Supabase Auth | `auth.users.id` UUID |
| 통합회원 프로필·상태 | NOWGO 중앙 Postgres | nickname, active/suspended/withdrawn |
| 약관 동의 | NOWGO 중앙 Postgres | 목적·버전·동의 여부·발생 시각·서비스 |
| 서비스 연결 | NOWGO 중앙 Postgres | client, 요청, 단회 코드, 제한 토큰, 속도 제한 |
| 매장·메뉴·점주 권한·공식 상태 | NOWGO 중앙 | store/menu ID, 소유권 승인, 공식 영업·품절 |
| HOT 저장·제보·사진·탐색 이벤트 | HOT 서비스 저장소 | 중앙 UUID의 안전한 참조, 근거, 출처, 검토 상태 |
| 고객의 원문 이메일·전화·소셜 토큰 | HOT에 저장하지 않음 | 필요 시 중앙의 별도 검증 결과만 최소 계약으로 사용 |

중앙 신규 테이블은 `ng_unified_members`, `ng_unified_consents`, `ng_unified_clients`, `ng_unified_rate_limits`, `ng_unified_requests`, `ng_unified_codes`, `ng_unified_tokens` 총 7개다. HOT에는 기존 `unified_sessions`, `menu_saves`, `taste_observation`, `menu_media`, `taste_events`가 있다.

중앙 UUID는 같은 사람을 서비스 사이에서 연결하지만, 일반회원·기여자·점주·운영자 권한은 별도로 판정한다. HOT 제보를 했거나 가입했다고 매장 소유권과 공식 정보 발행 권한이 생기지 않는다.

## 프로모션 두 곳의 구분

- HOT 프로모션은 먹고 싶은 메뉴를 발견하고 제보하게 만드는 소비자 유입 페이지다. “맛잘알이 제보하는 핫한 맛부심”을 이곳에 둔다.
- NOWGO `/promotion`은 점주와 플랫폼 가치를 설명하는 페이지다. HOT을 실제 소비자 유입 사례로 소개하고 HOT 맛지도로 보낸다.
- 헤더 로고에는 슬로건을 붙이지 않는다. 빨간 NOWGO 이미지 하나만 사용한다.
- 두 페이지가 서로 자동 전환되며 사용자를 돌리는 구조가 아니라, 문맥이 분명한 버튼으로 이동한다.

## 운영 완료 조건

현재 코드를 운영 완료로 해석하지 않는다. 아래를 모두 통과해야 순환이 열린다.

- 실제 `www.nowgo.space` 운영 소스에 중앙 로그인·동의·authorize/token/userinfo/revoke 코드 반영
- 운영 Supabase에 7개 테이블/RPC 마이그레이션 적용·검증
- HOT client ID와 해시 비밀 등록, callback을 `https://hot.nowgo.space/api/auth/callback`으로 정확히 제한
- HOT 운영 환경변수 설정과 세션 암호화 키 설정
- Vercel 이전 후 HOT 전용 데이터·사진 저장소 어댑터 연결. 원본 D1/R2를 쓸지 무손실 이전할지 명시
- 신규 회원·기존 회원·동의 거절·코드 재사용·로그아웃·정지/삭제 회원·원래 화면 복귀 E2E
- HOT↔미니홈피의 확인된 store/menu 매핑
- PC/모바일에서 프로모션→지도→가입→복귀→제보→미니홈피 실제 검증

## 현재 상태

- HOT 클라이언트 연결 코드와 중앙 가입/동의/API/마이그레이션 코드는 로컬에서 작성됨.
- 중앙 로컬 테스트는 15개 통과, 실제 개발 DB 동시성 테스트 1개는 환경변수가 없어 생략됨.
- HOT 원본 테스트는 16개 통과. 검색·예산 필터·메뉴 상세·목록 복귀·회원 안내창을 브라우저에서 확인함.
- 운영 DB 마이그레이션, 운영 중앙 배포, HOT 클라이언트 등록·환경설정, 실제 회원 왕복은 아직 완료되지 않음.
- 이 PR은 원본 소스 전달용이며 main이나 hot.nowgo.space에 자동 배포되지 않음.
