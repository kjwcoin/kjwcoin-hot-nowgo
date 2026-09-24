# NOWGO · 맛잘알이 제보하는 핫한 맛부심

현재 설계·구현 범위는 [설계 기준](docs/NOWGO_HOT_DESIGN_BASELINE_20260924.md)을 확인하세요.

- 빨간 NOWGO 이미지 로고 하나로 통일. HOT/by/로고 슬로건 제거.
- HOT 독립 가입·로그인·비밀번호 수집 종료(410). NOWGO 통합회원 전용.
- 중앙 SSO 제공 API 미연결 상태에서는 준비 중 안내 및 제보 쓰기 차단. 지도·저장은 이용 가능.
- state/PKCE 일회용 code 교환, 암호화 access token, 중앙 userinfo 재검증. 새 0003 마이그레이션. 기존 고객 데이터는 보존.
- 정확한 매장/메뉴 및 만료를 검증하는 상태 어댑터. 중앙 연결 전 확인 필요.
- 검증: `node --experimental-strip-types --test tests/*.test.mjs`, `node node_modules/typescript/bin/tsc --noEmit`.

## 이전 시안 기록(현재 기능으로 해석하지 말 것)

# HOT by NOWGO · 서울 메뉴 지도

8단 프로모션 `/`, 전체 지도 `/map`, 필수 로그인 제보, 닉네임·전화번호·비밀번호 계정, 동의 이력과 기여 레벨, 가매장 구분, 이미지 로고 배지를 구현했다. 카카오는 지도·주소 좌표 변환만 담당한다. 매장 운영·소유권·품절의 원천은 NOWGO다. 리뷰는 NOWGO 매장 미니홈피에만 쌓이며 HOT에는 작성·본문 조회 API가 없다.

## 설정
- KAKAO_MAP_JAVASCRIPT_KEY: 공개 Web SDK 키. 등록된 사이트 origin에서만 사용. 실제 지도 타일을 미리보기에서 확인했다.
- KAKAO_MAP_REST_KEY: 서버 전용 주소 좌표 변환 키. 클라이언트 응답에 노출하지 않는다.
- NOWGO_PLACE_URLS: 확인된 실제 매장별 미니홈피 URL JSON. 가매장 연결 금지.
- NOWGO_REVIEW_URLS: 확인된 실제 매장별 리뷰 URL JSON. HTTPS nowgo.space/www.nowgo.space만 허용. 미설정은 매장 연결 준비 중.
- KAKAO_CHAT_URL: 공식 카카오 채널 URL. 현재 연결 전.
- D1 DB / R2 BUCKET: Sites에서 관리. 0000~0002 마이그레이션.

## 데이터 흐름
GET /api/menus는 공개된 미확인 고객 제보를 반환한다. 로그인한 제보는 동의, 주소, 필수값, 이미지 형식/2MB, 중복, 시간당 10건 제한을 통과하면 자동 공개한다. 주소 서비스 오류 시 공개하지 않고 재시도를 안내한다. 가매장 연습 제보는 비공개다. 본인 제보와 사진 삭제 가능. 점주 역할 선택만으로 공식 점주가 되지 않는다.

GET /api/customer/me는 마스킹된 내 계정·동의·레벨을 반환한다. signup/login/logout/consents는 동작한다. 비밀번호는 salted scrypt, 세션은 HttpOnly 쿠키와 서버 해시로 관리한다. reviews는 사용 중단한 초기 테이블이며 API 쓰기/삭제 410, 본문 조회 없음.

미니홈피 리뷰 링크는 GET /api/review-link/{placeId}에서 확인한 URL만 반환한다. 가매장과 미매핑 매장은 null. 리뷰 등록과 적립 완료를 HOT이 임의로 표시하지 않는다. 개발 명세는 docs/CUSTOMER_DB_AND_REPORT_POLICY.md 참고.

## 현재 연결 범위
지도 SDK는 연결됨. 로컬 환경의 서버 주소 API 외부 연결이 실패하여 자동 신규 등재의 외부 주소 단계는 통합 검증 미완료. 오류 시 저장하지 않는 처리를 검증했다. NOWGO 통합 인증·Free 가입 딥링크·공식 상태·리뷰 URL·리뷰 이벤트 API는 아직 제공되지 않아 운영 연동 전이다. 루트 전환 링크를 공식 매장 검색 완료로 오인하지 않는다.

전화번호 인증·비밀번호 복구·탈퇴·사진 재인코딩/EXIF 제거·콘텐츠 신고 운영·기여 검증·실제 마케팅 발송은 출시 전 작업이다. 번호 미인증 고객에게 광고하지 않는다. 현재 소유자 비공개 검수용이며 hot.nowgo.space DNS 및 NOWGO 운영 DB는 변경하지 않았다.

## 검증·빌드
node node_modules/typescript/bin/tsc --noEmit. Sites workflow로 빌드·게시. 자세한 결과는 VALIDATION.md.

## 사진 권리
- 떡볶이: Popo le Chien, CC0. https://commons.wikimedia.org/wiki/File:Tteokbokki.JPG
- 닭갈비: Hye-youngJung, CC0. https://commons.wikimedia.org/wiki/File:Dak-galbi.jpg
- 장칼국수: Tmannya, CC BY-SA 3.0. https://commons.wikimedia.org/wiki/File:Jangkalguksu.jpg
WebP는 크기·포맷만 변경. 장칼국수 변환본에도 CC BY-SA3.0 적용. https://creativecommons.org/licenses/by-sa/3.0/

