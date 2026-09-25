> 이전 구현 기록입니다. 현재 기준은 NOWGO_HOT_DESIGN_BASELINE_20260924.md입니다. HOT 별도 가입·로그인은 종료했고 통합회원 어댑터로 교체했습니다. 아래 이전 가입 동작을 현재 기능으로 취급하지 않습니다.

# 고객 DB·제보·레벨 구현 명세 — 2026-09-24

## 확정된 흐름

입력 항목은 닉네임·휴대폰 번호·비밀번호. 약관 및 필수 개인정보 수집·이용 동의는 각각 기록한다. 문자·카카오 마케팅 동의는 선택이며 기본 해제다. HOT 로그인은 NOWGO 점주 로그인 또는 매장 소유권을 의미하지 않는다. 이 시안의 D1 고객 계정은 NOWGO 운영 DB와 아직 통합되지 않았다. 실제 오픈 시 NOWGO 통합 고객 ID와 마이그레이션·중복 합치기 절차를 연결한다.

지도 열람은 로그인 없이 가능하다. 제보 폼 작성도 가능하지만 제출 API는 로그인 고객만 받는다. 전국 주소를 서버에서 좌표로 변환하고 필수 정보, 사진 형식·용량, 정확성·권리 동의, 제출 빈도, 같은 주소·상호·메뉴 중복을 검사한다. 조건을 통과한 신규 제보는 `published_unverified`로 자동 등록하고 지도 목록에 보인다. 사진도 함께 공개된다. 이는 점주의 공식 확인, 실제 영업 증명, 사진 내용·권리 보증이 아니다. 기존 가매장에 대한 연습 제보는 비공개다. 카카오 주소 API는 좌표 확인에만 사용한다. 실제 운영 여부·영업 상태·품절 정보의 진실 원천은 NOWGO다.

## 고객 테이블

| 테이블 | 주요 필드 | 역할 |
|---|---|---|
| customers | id, nickname, phone_e164, phone_verified_at, status, created_at | 통합 고객 연결 대상. 전화번호 중복 방지. 미인증 기본값 |
| customer_credentials | customer_id, password_hash, updated_at | 고객별 salted scrypt 해시. 원문 비밀번호 저장 금지 |
| customer_sessions | token_hash, customer_id, expires_at, created_at | 30일 세션. DB에는 토큰 해시. HTTPS HttpOnly/SameSite 쿠키 |
| customer_consents | customer_id, channel, scope, granted, version, created_at | 동의·철회 append-only 이력. channel=terms/privacy/sms/kakao |
| customer_store_links | customer_id, place_id, status, created_at | 매장별 단골 관계. 유일 고객×매장. 가입만으로 자동 생성하지 않음 |
| menu_reviews | 초기 개발 테이블, 사용 중단 | 신규 저장·조회 API 없음. 운영 이관 대상 아님 |
| contribution_ledger | customer_id, source_kind, source_id, points, verified_by, verified_at, revoked_at | 검증된 기여 원장. 같은 기여 중복 지급 방지. 공개 쓰기 API 없음 |
| auth_rate_limits | id, count, expires_at | 전화번호·IP 기반 로그인/가입 제한. 원문 IP 대신 해시 |
| taste_observation | session(customer ID), role, 메뉴·가격·주소·좌표, status, category, publication_key | 로그인 제보. 주소+상호+메뉴 정규화 고유 키 |
| menu_media | observation_id, session(customer ID), object_key, mime, moderation | 공개된 제보만 공개 사진 API에서 제공 |

고객 화면에는 닉네임과 마스킹 번호만 반환한다. 비밀번호 해시·원문 번호·세션 토큰을 제보/후기/마케팅 조회 응답에 노출하지 않는다. 비회원 저장·제보 이력은 가입/로그인 시 그 브라우저에서 로그인한 고객에게 이전한다. 운영 전 전화번호 소유 확인과 통합 고객 연결을 완료해야 한다. 미인증 번호를 단골 CRM의 기존 연락처와 자동 병합하지 않는다.

## 레벨

| 레벨 | 누적 확인 기여 | 혜택 |
|---|---:|---|
| 1 첫 한 접시 | 0점 | 제보·저장, 미니홈피 리뷰 연결 |
| 2 동네 발견자 | 30점 | 기여자 표시 |
| 3 한 끼 길잡이 | 100점 | 체험 모집 우선 신청: 파트너 확보 후 제공 |
| 4 동네 맛길지기 | 300점 | 정정 검토 우선 접수: 운영 검수 연결 후 제공 |

검증된 유효 기여 1건=10점을 권장한다. 실제 점수 지급은 검증 서비스가 원장에 남긴 기록에만 따른다. 현재 원장 읽기·레벨 계산을 구현했으며 검증 서비스와 지급 작업은 연결 전이다. 단순 글 작성, 긍정 후기, 좋아요, 지도 클릭으로 점수를 부여하지 않는다. 허위/삭제 기여는 원장 취소 후 레벨을 재계산한다. 레벨이 높아도 매장 영업·품절 수정 권한은 생기지 않는다. 사진만으로 방문 인증을 부여하지 않는다.

## NOWGO 공식 점주 연결 계약 — 운영 연결 필요

‘나우고 점주 가입하기’는 NOWGO로 이동하는 전환 링크다. 현재 NOWGO의 정확한 Free 가입 딥링크와 서버 API를 확인할 수 없어 루트 페이지로 연결한다. 자동 가입 완료, 소유권 승인 완료, 공식 상태 연동 완료로 표시하지 않는다.

NOWGO 운영팀에서 아래 신뢰 가능한 서버 계약을 제공하면 연결한다.

1. HOT 고객 ID ↔ NOWGO 통합 고객 ID를 인증된 일회용 code 교환으로 매핑. 전화번호만으로 매핑 금지.
2. 공식 `place_id`와 매장 소유권 승인 상태, 계정/권한 철회 상태, Free 플랜 생성 결과 조회.
3. 권한이 승인된 매장만 점주 상태 수정. customer_id·place_id를 서버가 교차 확인. 프런트의 owner=true 등은 무시.
4. 영업 상태와 메뉴별 품절: status, source, observed_at, expires_at, revision을 받는다. 만료·연결 실패·폐업·소유권 철회 시 즉시 확인 필요 또는 적절한 종료 상태.
5. 변경 이벤트는 서명 검증·이벤트 ID 중복 방지·역순 revision 방지·타임스탬프 재생 방지 후 반영.
6. `/go/[place_id]`의 NOWGO 승인 미니홈피 URL은 서버 설정을 통해 연결. 알 수 없는 매장과 가매장은 공식 영업 사실로 취급하지 않는다.

## 단골마케팅 발송 대상 조건 — 현재 발송 기능 없음

고객 active AND 전화번호 인증 완료 AND 해당 채널 최신 동의=true AND 매장 광고라면 해당 매장 관계·수신 근거 유효 AND 수신 거부/차단 아님. 예약 당시뿐 아니라 실제 발송 직전 다시 검사한다. 플랫폼 혜택 동의를 개별 점주의 광고 동의로 확장하지 않는다. Kakao 발송은 별도의 채널·상품별 수신 자격 확인이 필요하다. 고객 연락처 전체를 점주에게 내려주지 않고 서버가 허용된 대상에게만 발송한다.

미인증 고객, 수신 철회 고객, 단순 HOT 가입자에게는 자동 광고를 보내지 않는다. 현재는 consent 이력과 관계 DB만 준비됐으며 메시지는 전송하지 않는다.

## 공개 출시 전 필수 연결

- NOWGO 운영 인증·통합 ID/소유권/Free 가입·실시간 상태 API
- 번호 인증, 번호 변경, 비밀번호 복구, 본인 재인증 후 계정 탈퇴와 미디어 삭제
- NOWGO 미니홈피 리뷰 연결·기여 확인/철회 이벤트 및 신고·소명 창구
- 개인정보처리방침의 실제 책임자·연락처·위탁/국외이전·파기 정책
- 만료 세션·만료 인증 제한 행 정리 작업, 실제 트래픽 CPU/요금 검증

이 체크리스트 때문에 내부 검수용 계정·후기 동작을 숨기지는 않는다. 다만 이 시안을 운영 고객 모집 완료 서비스로 오인하지 않도록 앱 안내와 약관에 현재 범위를 표시한다.

## 법무 초안

사이트 `/terms`에 12개 조항과 필수/선택 수집 동의를 반영했다. 허위 제보는 정정·삭제·비공개·이용 제한의 사유가 될 수 있으나 무조건적 벌금, 부당한 책임 전가, 회사 고의·중과실 면책을 두지 않는다. 운영 공개 전 법률 검토와 실제 운영 절차 확정이 필요한 초안이다.

근거: 개인정보 보호법 제15조 https://www.law.go.kr/LSW//lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334813 ; 약관법 제7·8조 https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1025032399 ; 비밀번호 저장 https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html .

## 리뷰의 단일 원장: NOWGO 매장 미니홈피

HOT에는 리뷰 작성 폼·리뷰 본문/사진 저장·리뷰 목록을 두지 않는다. 기존 개발용 `/api/customer/review` 쓰기·삭제는 410으로 종료하고 내 계정 응답에서도 리뷰를 제외했다. 가매장은 리뷰를 받지 않는다. 실제 제보라도 NOWGO 공식 매장과 매핑 전에는 “매장 연결 준비 중”을 표시한다.

운영자가 확인한 매장별 리뷰 URL만 서버 환경변수 `NOWGO_REVIEW_URLS` JSON 객체에 등록한다. 키는 HOT place_id, 값은 해당 NOWGO 미니홈피 리뷰 URL이다. HTTPS nowgo.space 또는 www.nowgo.space만 허용하고 루트 주소·외부 주소·가매장은 차단한다. 리뷰 탭 경로를 추측하지 않는다. 현재 확인된 리뷰 URL이 없어 준비 중 상태다.

이동 후 NOWGO 인증과 리뷰 정책에 따라 작성·조회·수정·삭제한다. HOT 계정 로그인은 NOWGO 로그인 완료를 뜻하지 않는다. HOT 레벨로 리뷰 작성 권한을 제한하지 않는다. 인증 사진 역시 미니홈피에만 보관한다.

향후 리뷰 기여 연동은 NOWGO 서버의 서명된 이벤트로 처리한다. 필요 필드: event_id, review_id, canonical_customer_id, place_id, status, verification_status, revision, occurred_at. HOT은 본문·사진 없이 기여 식별자와 점수 원장만 저장한다. 계정 연결·매장 매핑 확인, 서명/재생 검증, 이벤트 중복 및 역순 차단 후 검증된 리뷰 1건당 1회 반영한다. 수정으로 재지급하지 않으며 삭제/허위 판정은 취소한다. 클릭·URL 쿼리·브라우저의 완료 신호로 적립하지 않는다. 이 이벤트 수신과 통합 계정 연결은 미구현이며 현재 자동 적립하지 않는다.
