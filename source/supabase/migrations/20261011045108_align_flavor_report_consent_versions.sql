DO $fix$
DECLARE
 item record;
 definition text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('hot_publish_report','2026-09-24-hot-v1','2026-10-01-hot-map-1900-v2'),
  ('sweet_publish_report','2026-09-25-sweet-v1','2026-10-01-sweet-map-1900-v2'),
  ('rich_publish_report','2026-09-25-rich-v1','2026-10-01-rich-map-1900-v2')
 ) AS versions(function_name,old_version,current_version)
 LOOP
  SELECT pg_get_functiondef(p.oid) INTO STRICT definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname=item.function_name AND pg_get_function_identity_arguments(p.oid)='report_id uuid';
  IF position(item.old_version in definition)>0 THEN
   EXECUTE replace(definition,item.old_version,item.current_version);
  ELSIF position(item.current_version in definition)=0 THEN
   RAISE EXCEPTION 'Unexpected consent check in %',item.function_name;
  END IF;
 END LOOP;
END
$fix$;

-- Original photos are optimized before upload; remove the former bucket-level 2 MB restriction.
UPDATE storage.buckets SET file_size_limit = NULL
WHERE id IN ('hot-report-photos','sweet-report-photos','rich-report-photos')
  AND file_size_limit = 2000000;
