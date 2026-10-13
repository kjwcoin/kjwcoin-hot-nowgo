# HOT 개발 DB 릴리스 차단 조건 — 2026-10-13 (QA only)

> **문서/조회용**. 운영 배포, DB 변경, 외부 데이터 수집, PR 병합 승인이 아니다.

## 검증 환경
- GitHub 브랜치: `qa/hot-spice-1to8-candidate-gate-20261012` (PR #49 브랜치와 별도)
- 읽기 전용 확인 DB: `Nowgo-dev` (운영 DB 아님)
- #48: 메뉴에 '매운맛' 텍스트 또는 검증된 매운맛 고추 표시가 있고 이용 권한을 검증한 후보만 가능
- #50: 작업 기록/중단 원인 관리. 상시 실행 워커를 구축하거나 가동한 것으로 판단하지 말 것.

## 확인된 차단 조건

1. 개발 DB의 `hot_menu_spice_ratings_level_check`는 `level BETWEEN 1 AND 7`인데 HOT API/검토용 DDL은 1..8이다. 기존 테이블에 `CREATE TABLE IF NOT EXISTS`를 실행해도 현재 체크 제약은 바뀌지 않는다. 승인된 개발 DB 전용 마이그레이션과 8점 저장 테스트 이전에 기능 완료로 표시 금지.
2. `hot_unverified_spicy_menu_candidates`는 anon/authenticated에 SELECT GRANT가 있고 RLS 정책도 `unverified` 및 `verified` 모두의 조회를 허용한다. API의 빈 응답은 Supabase 직접 조회를 차단하지 못한다. 공개 허가 증빙, 메뉴 원본 근거, 검수 기록, 비공개 기본 정책이 갖춰지기 전까지 **회색 핀 노출 금지**.
3. 개발 DB에서 `ng_map_dashboard_access`, `ng_map_can_publish`, `ng_map_save_menu`, `ng_map_set_menu_taste`를 확인하지 못했다. 점주 API 의존 RPC를 실제 대상 환경에서 확인해야 한다.
4. 점주 메뉴 API의 기존 1..5 단계는 다른 행성/레거시 맛 등급과 결부되어 있다. HOT 신규 점주 자가 매운맛 1..8을 레거시 컬럼에 그대로 섞지 말고 **별도 필드와 접근 정책**을 설계한다. 방문자 메뉴별 중앙값은 점주 자가 등급과 독립적으로 계산하고 점주가 방문자 값을 수정하지 못하게 한다.
5. PR #49는 Draft, 미병합, mergeable=false. Vercel 상태만으로 전체 CI/실제 DB 기능이 통과했다고 판단하지 않는다.

## QA 점검용 읽기 전용 SQL (Nowgo-dev에만 사용)

```sql
SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='public' AND t.relname='hot_menu_spice_ratings' AND c.contype='c';

SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname='public' AND tablename='hot_unverified_spicy_menu_candidates';

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name='hot_unverified_spicy_menu_candidates'
  AND grantee IN ('anon','authenticated');

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
 AND p.proname IN ('ng_map_dashboard_access','ng_map_can_publish',
                  'ng_map_save_menu','ng_map_set_menu_taste');
```

## 안전한 후속 작업 순서
1. 수집원 라이선스 및 개별 메뉴 사용/재게시 권리 확인. 공식 지역검색 API의 매장 검색 결과만으로 메뉴를 추정하지 않는다.
2. 개발 DB 전용 최소 마이그레이션/롤백 검토: 기존 데이터/제약/RLS 영향평가, 권한 회귀 테스트.
3. 고객 1..8 평가를 메뉴별/회원별로 저장하고 SQL 중앙값(홀/짝), n명, n<3 초기 표시와 UI를 연결해 통합 테스트.
4. 점주 구독 8,000원, 매장 소유권, 별도 자가 매운맛 등급과 상태 업데이트 권한을 검증한다. 결제 활성화는 별도 승인 및 테스트 후 진행.
5. 전체 테스트와 실제 Actions/병합 충돌을 해소한 다음 PR 리뷰. **운영 배포 금지**.
