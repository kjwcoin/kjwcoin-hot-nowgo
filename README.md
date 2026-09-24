# NOWGO HOT 원본 앱 전달 브랜치

이 브랜치는 기존 화면을 복원하기 위한 실제 React/TypeScript 원본 전달용입니다. 운영 main은 변경하지 않았습니다.

- 원본 앱 소스: [source/](source/)
- 이전 지침과 기능 현황: [START_HERE.md](START_HERE.md)
- 통합회원·프로모션·NOWGO 순환: [UNIFIED_CIRCULATION.md](UNIFIED_CIRCULATION.md)
- 파일 검증 목록: [EXPORT_MANIFEST.json](EXPORT_MANIFEST.json)
- 기준 커밋 이후 원본 작업 변경: [WORKING_CHANGES.patch](WORKING_CHANGES.patch)

`source/`가 원본 앱입니다. 저장소 루트의 기존 `index.html`, `assets/`, `vercel.json`은 기존 정적 시안이며 비교를 위해 남아 있습니다.

원본은 Vinext / Cloudflare Workers / D1 / R2 기반이므로 Vercel에 배포하려면 서버·데이터·사진 저장소 연결부를 이식해야 합니다. 단순히 이 브랜치를 main으로 병합하거나 root directory만 source로 바꿔 배포를 완료 처리하지 마세요.

먼저 START_HERE.md와 UNIFIED_CIRCULATION.md를 읽고 원래 UI/UX와 빨간 NOWGO 로고를 유지해 주세요. 검색·필터·상세·제보 진입과 회원 연결 상태를 실제 운영 주소에서 검증해야 합니다. 중앙 통합가입은 아직 운영 연결 전입니다.

작업 대상: 사용자 확인 Vercel `nowgo-s-projects/hot-nowgo`, GitHub `kjwcoin/kjwcoin-hot-nowgo`, 운영 `https://hot.nowgo.space`. 기존 DNS와 메인 NOWGO 사이트를 보존하세요.
