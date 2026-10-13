-- Deny direct row access explicitly; aggregate and authenticated writes use guarded RPCs.
do $$declare relation text;begin
 foreach relation in array array['stores','taste_reports','owner_requests','status_reports'] loop
  if not exists(select 1 from pg_policies where schemaname='hot_source_community' and tablename=relation and policyname='rpc_only_no_direct_access') then
   execute format('create policy rpc_only_no_direct_access on hot_source_community.%I for all to public using (false) with check (false)',relation);
  end if;
 end loop;
end $$;
