# HOT x Balbadak API v1

서비스 범위는 `hot.nowgo.space` 전용입니다. 발바닥이 제공하는 발자국 레코드와 제보를 HOT에 출처와 함께 저장하고, HOT의 공개 매운 메뉴를 파트너 화면에서 보여 준 뒤 통합회원/점주 가입으로 연결합니다.

## 합의 조건과 데이터 보호

- HOT 데이터 조회 응답에는 `store_id`, `store_name`, `menu_name`, `spicy_level`만 포함하고 가입 링크를 덧붙입니다. HOT/NOWGO의 기존 DB, 정규화/중복 판별 로직, 분류·파생 지표, 통합회원 데이터에 대한 소유권은 NOWGO에 남습니다.
- 발바닥의 매장 식별값은 물리 매장 ID가 아니라 **발자국 ID**이며 API의 `source_store_id`로 받습니다. 한 매장에 여러 발자국이 있을 수 있으므로 이름+좌표로 중복 후보를 찾되 자동 병합하지 않습니다.
- 발바닥 제보는 `hot_partner_reports`에 발바닥 출처와 `pending` 검토 상태로 등록합니다. member report, 회원 ID, HOT 포인트, 자동 공개와 분리합니다. 매장 매칭과 공개는 별도 확인합니다.
- v1은 사용자 식별정보, 위치 이력, 사진/영상, 방문 수, 카테고리, 대표 메뉴를 수집하지 않습니다. 발바닥은 주소를 좌표에서 변환해 선택 제공할 수 있습니다. 주소를 보내지 않으면 null로 유지합니다.
- 발바닥 제공 데이터는 발바닥 출처 자료로 표시하고, HOT 내 검증·표시·회원 유입 운영 목적에 필요한 기간과 범위에서만 사용합니다. NOWGO 기존 DB는 제공하거나 덤프하지 않습니다. 재판매, 제3자 재배포, 경쟁 DB 구성, 모델 학습, 무단 대량 복제 권리는 부여하지 않습니다.
- **정산 조건: 발바닥이 NOWGO에 성공한 점주 전환 1건당 100원 지급.** 성공은 서명된 발바닥 점주 링크 유입 후 HOT/NOWGO 점주 등록과 매장 확인이 완료된 경우로 계산하고, HOT 매장당 제휴 기간 중 최초 1회만 인정합니다.
- 명세를 제공한 Library PDF `나우고가 받을 데이터.pdf`는 협의안이며 서명된 최종 계약서로 확인되지 않았습니다. 위 범위는 사용자 지시를 기준으로 한 API 협의 규격입니다.

## 파트너 데이터 수신 범위

| 발바닥 제공 항목 | 수신 경로 | HOT 보관/처리 |
| --- | --- | --- |
| 발자국 ID, 매장명, 위도/경도, 등록/수정일 | `POST /stores` | 발자국 ID별 별도 레코드, 자동 병합 안 함 |
| 선택적 주소(좌표 변환) | `POST /stores` | `derived_address`; 파트너가 보내지 않으면 비움 |
| 좋아요 수, 저장 수, 중복 제외 관심 사용자 수 | `POST /metrics` | 날짜별 매장 집계 |
| 조회 수(신규 개발 후 가능) | `POST /metrics` | 없으면 null |
| 영업중/휴무/재료소진 현장 제보 | `POST /reports` | 별도 제보 큐, 검토 대기 |
| 사용자 식별정보/위치 이력/사진·영상 | 미수신 | v1 입력 거부 또는 무시, 저장하지 않음 |
| 주소 외 카테고리/대표 메뉴/방문 수 | 미수신 | 발바닥이 현재 미보유라고 안내한 범위 |

발바닥이 안내한 갱신: 상태 제보 webhook 발생 즉시(1분 이내), 관심 집계 하루 1회. 발바닥의 조회용 API 키와 호출 제한 60회/분은 발바닥 측에서 발급/운영합니다. HOT webhook 수신 측도 production key 발급 전에 60회/분 제한과 모니터링을 게이트웨이에 설정해야 합니다.

## 인증

모든 경로는 서버 간 호출입니다. 브라우저/모바일 앱 코드에 비밀값을 넣지 않습니다.

- HOT 조회/정산: `Authorization: Bearer <HOT_PARTNER_API_KEY>`
- 발바닥 webhook 수신: `X-Nowgo-Timestamp: <unix-seconds>`, `X-Nowgo-Signature: <hex HMAC-SHA256>`
- 서명 입력은 UTF-8 문자열 `<timestamp>.<exact raw request body>`, 비밀키는 `BALBADAK_WEBHOOK_SECRET`입니다. 5분이 지난 요청은 거절합니다.
- 점주 유입 링크 서명: `HOT_PARTNER_REFERRAL_SECRET`; 30일 HttpOnly 쿠키로 가입 흐름에 귀속하고 점주 등록 완료 후 전환 원장을 씁니다.
- 비밀값이 없으면 endpoint는 503으로 닫혀 있습니다. 키는 배포 비밀 저장소에만 넣고 파트너 교체/유출 시 회수합니다.

## 1. HOT 메뉴 읽기

`GET https://hot.nowgo.space/api/partner/v1/hot/menus?page=1&limit=50`

| 필드 | 형식 |
| --- | --- |
| `store_id` | HOT 공개 장소 참조 문자열 |
| `store_name` | 공개 매장명 |
| `menu_name` | 공개 메뉴명 |
| `spicy_level` | 정수 1-5 |
| `member_signup_url` | 발바닥 유입 표시의 통합 유저 가입 링크 |
| `owner_signup_url` | HOT가 서명한 발바닥 점주 전환 링크 |

페이지 기본 50, 최대 50. 오직 공개된 `hot_public_menus` 행만 조회합니다. 현재 운영 DB 읽기 확인에서는 이 view가 0행이었으므로 공개 매뉴가 없으면 정상적으로 빈 배열입니다.

```json
{
  "data": [{
    "store_id": "nowgo-abc123",
    "store_name": "예시 식당",
    "menu_name": "매운 짬뽕",
    "spicy_level": 4,
    "member_signup_url": "https://hot.nowgo.space/account/join?type=user&source=balbadak&...",
    "owner_signup_url": "https://hot.nowgo.space/api/partner/v1/balbadak/referral?store_id=...&expires=...&sig=..."
  }],
  "pagination": {"page": 1, "limit": 50, "has_more": false},
  "data_source": "HOT / NOWGO"
}
```

## 2. 발자국 매장 등록/수정 webhook

`POST https://hot.nowgo.space/api/partner/v1/balbadak/stores`

필수값: `source_store_id`(발자국 ID), `store_name`, `latitude`, `longitude`, `registered_at`, `updated_at`. `address`는 좌표로 변환한 선택 필드입니다. 같은 발자국 ID는 수정하고, 서로 다른 발자국 ID는 같은 이름/근접 좌표라도 병합하지 않습니다. 오래된 수정 webhook이 최신 레코드를 덮지 않도록 `updated_at`이 더 오래된 업데이트는 무시합니다.

```json
{
  "source_store_id": "footprint-7788",
  "store_name": "예시 식당",
  "latitude": 37.12345,
  "longitude": 127.12345,
  "registered_at": "2026-10-01T11:00:00+09:00",
  "updated_at": "2026-11-01T10:30:00+09:00",
  "address": "선택값: 좌표에서 변환한 주소"
}
```

응답은 `202`와 `match_status: unmatched`입니다. `hot_partner_stores`에 저장해 HOT 매장 기준과 분리합니다. 이름+좌표 근접성은 중복 후보 판별 기준으로만 사용하고 자동 병합하지 않습니다.

## 3. 일별 관심 지표

`POST https://hot.nowgo.space/api/partner/v1/balbadak/metrics`

```json
{
  "source_store_id": "footprint-7788",
  "metric_date": "2026-11-01",
  "updated_at": "2026-11-02T00:10:00+09:00",
  "like_count": 12,
  "save_count": 8,
  "unique_interest_count": 17,
  "view_count": null
}
```

좋아요/저장 수는 일별 값, `unique_interest_count`는 같은 사용자를 중복 제외한 발바닥 집계값입니다. 조회수는 신규 개발 후 제공 가능할 때만 숫자로 보냅니다. 사용자별 기록은 받지 않습니다. 동일 발자국 ID와 날짜는 최신 `updated_at` 집계로 갱신합니다.

## 4. 상태 제보

`POST https://hot.nowgo.space/api/partner/v1/balbadak/reports`

```json
{
  "event_id": "balbadak-event-000123",
  "source_store_id": "footprint-7788",
  "store_name": "예시 식당",
  "report_type": "operating_status",
  "status_signal": "sold_out",
  "reported_at": "2026-11-01T10:30:00+09:00"
}
```

`status_signal` 허용값은 `open`, `closed`, `sold_out`입니다. 이벤트 중복은 `event_id`로 차단합니다. 응답 `201`은 신규 등록, `200`은 중복 재전송입니다. HOT에는 검토 대기 상태로 등록되며 회원 제보·포인트·공개 상태를 자동 변경하지 않습니다. `source_store_id`는 HOT `store_id`와 별도 ID입니다.

## 5. 월별 점주 정산

`GET https://hot.nowgo.space/api/partner/v1/balbadak/settlements?month=2026-11`

`month`는 `YYYY-MM`, 경계는 한국 표준시입니다. API는 서명된 전환 유입 링크와 owner signup completion을 확인하여 HOT 매장당 1회만 기록합니다.

```json
{
  "partner": "balbadak",
  "month": "2026-11",
  "currency": "KRW",
  "rate_per_conversion": 100,
  "approved_conversions": 12,
  "settlement_amount": 1200,
  "items": [{"referral_store_id":"nowgo-abc123","hot_store_id":"...","converted_at":"..."}],
  "settlement_status": "calculated"
}
```

관리자 대시보드 없이 API에서 월 건수와 금액을 계산합니다. 이 endpoint는 정산 계산만 하며 송금/세금계산서를 처리하지 않습니다. 월 마감, 이의 기간, 지급일, 세금 처리는 계약서에 적어야 합니다.

## 오류와 배포 조건

| HTTP | 뜻 |
| --- | --- |
| `200` | 조회 성공 또는 제보 중복 |
| `201` | 신규 제보 등록 |
| `202` | 매장/집계 수신 |
| `400` | 요청 형식 오류 |
| `401` | 인증/서명 오류 |
| `413` | 본문 16KB 초과 |
| `429` | gateway rate limit |
| `503` | secret/DB 미설정 또는 장애 |

배포 전에 계약서의 사용 범위·기간·삭제, 재판매 금지, 보안 통지, 책임 한도, 건당 100원 지급 주체/정의/정산일을 서면으로 확인합니다. staging에서 HMAC, 중복 webhook, out-of-order 업데이트, store candidate 미병합, KST 정산 경계와 100원 계산을 검증하고 gateway 제한을 설정한 뒤 production key를 발급합니다. 발바닥 제안 일정은 명세 확정 후 약 2주 개발, 2026년 11월 첫째 주 테스트입니다.

현재는 Git 브랜치 제안 코드입니다. Production DB migration, secret 설정, gateway 제한 및 배포는 하지 않았습니다.
