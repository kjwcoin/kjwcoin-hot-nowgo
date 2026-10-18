-- HOT candidate access hardening — review only; NEVER auto-apply to production.
-- Apply separately to Nowgo-dev only after review and backup.
-- Evidence (2026-10-18): anon/authenticated SELECT and an unverified-public-read policy.
-- Do not ingest candidate stores without licensed provenance.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.hot_unverified_spicy_menu_candidates') IS NULL THEN
    RAISE EXCEPTION 'hot_unverified_spicy_menu_candidates table is missing';
  END IF;
END
$$;

ALTER TABLE public.hot_unverified_spicy_menu_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hot_unverified_candidates_public_read
  ON public.hot_unverified_spicy_menu_candidates;
REVOKE SELECT ON TABLE public.hot_unverified_spicy_menu_candidates
  FROM PUBLIC, anon, authenticated;

-- Fail the transaction if either API role still has effective SELECT (e.g. via another grant).
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.hot_unverified_spicy_menu_candidates', 'SELECT')
     OR has_table_privilege('authenticated', 'public.hot_unverified_spicy_menu_candidates', 'SELECT') THEN
    RAISE EXCEPTION 'Public candidate table still readable after lockdown';
  END IF;
END
$$;
COMMIT;

-- Dev-only readback (execute separately):
-- SELECT rolname, has_table_privilege(rolname, 'public.hot_unverified_spicy_menu_candidates', 'SELECT')
-- FROM pg_roles WHERE rolname IN ('anon','authenticated');
-- SELECT policyname,cmd,roles,qual FROM pg_policies
-- WHERE schemaname='public' AND tablename='hot_unverified_spicy_menu_candidates';
