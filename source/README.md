# HOT by NOWGO

서울의 매운 메뉴를 발견하고 통합회원이 제보하는 사이트입니다. 메뉴 지도 `/`, 프로모션 `/suggestion`, HOT 통합회원 가입 `/account/join`, 제보 `/suggestion#report`를 제공합니다. 상단에는 빨간 NOWGO 이미지 로고만 표시하고 컨셉 문구는 프로모션 본문에 둡니다.

## HOT ↔ NOWGO

- HOT의 구글 가입은 NOWGO 운영 Supabase Auth의 `auth.users`를 그대로 사용합니다. 가입 완료 후 제보 작성 위치로 돌아옵니다. 사이트마다 브라우저 세션은 별도로 유지되지만 계정 ID는 동일합니다.
- 고객은 로그인, 필수 동의, 연락처·실제 메뉴·가격·직접 촬영/사용 권한 있는 사진을 제출합니다. 자료는 선승인 없이 고객 제보로 공개되며 현재 영업 상태의 보증은 아닙니다.
- 공식 점주는 같은 회원 ID로 NOWGO의 사업자 검증·매장 관리 권한 승인을 마친 뒤 HOT에서 해당 매장을 선택하고 사업자번호·연락처·가격·사진을 제출합니다. 공개 카드에는 점주 확인 여부를 표시하고 NOWGO 미니홈피로 이동합니다.
- 미확인 고객 제보와 가매장에는 NOWGO의 공식 영업·품절 상태를 추측해서 표시하지 않습니다. 리뷰는 NOWGO 미니홈피에만 작성합니다.

자세한 권한·저장·확장 구조는 [데이터 아키텍처](docs/HOT_NOWGO_DATA_ARCHITECTURE.md)를 참고하세요.

## 환경 변수

| 이름 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | NOWGO **운영** Supabase 프로젝트 URL (`tdkjdukblopypgoecuhh`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 같은 프로젝트의 공개 publishable 키. `service_role` 금지 |
| `KAKAO_MAP_JAVASCRIPT_KEY` | HOT 도메인이 허용된 카카오 지도 공개 웹 키 (선택: 미설정 시 카드 목록 사용) |
| `KAKAO_MAP_REST_KEY` | 서버에서 고객 주소를 좌표로 변환하는 키 (선택: 미설정 시 카드 목록에 등재) |
| `NOWGO_STATUS_API_URL`, `NOWGO_STATUS_API_TOKEN` | NOWGO의 점주 확인 영업 상태 API (선택: 없으면 `확인 필요` 표시) |

OAuth 허용 리디렉션 URL에는 `https://hot.nowgo.space/account/callback`을 정확히 추가해야 합니다. 미리보기 주소를 사용하면 해당 주소의 `/account/callback`도 허용해야 합니다. DNS는 HOT Vercel 프로젝트에 이미 연결되어 있습니다.

Vercel 프로젝트 `hot-nowgo`는 이 저장소에 연결하며 Root Directory는 `source`, Framework Preset은 Next.js로 설정합니다. `main` 병합 전에는 PR 브랜치의 Preview 배포에서 화면과 API를 확인합니다.

## 로컬 확인

`pnpm install --frozen-lockfile` 후 `pnpm build`; Node.js 22 이상. 인증 없는 화면과 API는 `pnpm dev`로 확인할 수 있습니다. DB는 `supabase/migrations`의 순서로 개발 프로젝트에서 검증하고 운영 프로젝트에 적용합니다. `node --experimental-strip-types --test tests/integration-policy.test.mjs`로 NOWGO 링크 신뢰 경계를 확인합니다.

업로드 사진은 비공개 Storage 버킷에 두고 공개 메뉴 사진 요청만 API로 전달합니다. 브라우저에는 service key나 사업자번호·연락처를 내려주지 않습니다. 현재 앱은 구글 OAuth를 사용합니다.
