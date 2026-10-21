# HOT 메뉴별 매운맛 평가 DB 검증 후보

**현재 상태: SQL 후보 작성 완료, 실제 개발 DB 실행 결과 없음.** 아래 34개는 실행을 기다리는 검사 항목이며 통과 건수가 아닙니다. 개발·운영 DB에 이 migration을 적용하지 않았습니다.

## 파일과 계약

- Migration: [20261021030637_hot_menu_spice_verified_ratings.sql](../migrations/20261021030637_hot_menu_spice_verified_ratings.sql)
- 전체 rollback 검증: [hot_menu_spice_ratings_rollback.sql](./hot_menu_spice_ratings_rollback.sql)
- 저장: `hot_menu_spice_upsert(p_menu_id uuid, p_level integer)` 후 본인 `hot_menu_spice_ratings.level` 재조회.
- 집계: `hot_menu_spice_summary_for(p_menu_id uuid)` → 정확히 한 행의 `median_level`·`rating_count`.

검증 SQL은 `BEGIN` 안에 합성 fixture, 동일 migration 후보, 검증문을 포함하고 마지막에 `ROLLBACK`합니다. Migration을 수정하면 검증 파일에 포함된 후보도 함께 맞춰 검토해야 합니다. 점주 지정 heat와 회원 평가 중앙값은 분리하며 결제·구독 게이트는 변경하지 않습니다.

## 실행 전제

대상은 **Nowgo-dev `zohvqtmfxwubivbmkfhl`**입니다. 다른 DB 검증의 원복을 확인한 후 순차 실행하며, 운영에는 실행하지 않습니다. 현재 개발 DB에 평가 테이블이 있고 `ng_map_menu_details`가 없다는 환경 보호 조건이 있으므로, 스키마가 바뀌면 보호 조건을 제거하지 말고 대상과 전제를 다시 검토합니다.

먼저 `a0312026-` 합성 fixture가 없음을 확인하고 기존 함수 정의·소유자·권한·설정, 평가 테이블 RLS·정책·권한·인덱스, `nowgo_hot_private` 존재 여부를 읽기 전용으로 기록합니다. 호출 중단·무응답은 통과가 아닙니다. 정상 결과는 `assertion_count = 34`, `all_passed = true` 및 각 검사 이름을 포함해야 합니다. 32개 assert 호출 중 경계값 반복문이 세 번 실행되어 34개 항목이 됩니다.

## 검사 범위

| 범위 | 확인 항목 |
| --- | --- |
| 공개 메뉴 | HOT catalog UUID 허용, SWEET·없는 UUID·숨겨진 메뉴 거부 |
| 저장 | 본인 level 재조회, 수정·동일 요청 반복 시 한 회원 한 표 유지 |
| 단계·집계 | 0·8·음수·null 거부, 7 저장, 0~3개 표본, 짝수 중앙값 4.5·홀수 중앙값 6 |
| 권한 | anon·익명 Auth·subject 없는 호출 거부, 개별 행 및 직접 쓰기 차단, 타회원 행 RLS 차단 |
| 분리 | 점주 heat 7 보존, 회원 세 표의 고유성, 숨긴 메뉴의 공개 집계 비노출 |

## 추가 검증과 원복 확인

SQL 역할/JWT 설정은 실제 Auth 로그인이나 브라우저→API→DB 통합 검증을 대체하지 않습니다. 같은 SHA의 CI·배포 연결, 실제 API 저장·재조회·재시도 UI를 별도로 확인해야 합니다.

Fixture는 개발 catalog의 대표 메뉴 경로를 사용합니다. 운영 `ng_map_owned_menu_catalog` 우선 경로, 원본 체험 메뉴 경로, `ng_map_save_menu`·`ng_map_dashboard_access` 전체 점주 관리 계약은 이 검사로 통과 처리하지 않습니다. 실제 이미지 Storage, 독립 세션 동시성, 결제 연동도 별도입니다.

실행 후 별도 읽기 전용 조회로 합성 Auth 사용자와 트리거 생성 계정·역할·점주 계정, 점주·매장·사업자 확인·claim·메뉴·대표 메뉴·평가 행이 모두 0개인지 확인합니다. 함수·권한·RLS·인덱스 등 스키마 상태가 실행 전과 같고, 이전에 없던 public upsert·private 스키마와 새 migration 이력이 남지 않았는지 비교해야 합니다.

기준: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [트랜잭션 기반 DB 테스트](https://supabase.com/docs/guides/database/testing).

