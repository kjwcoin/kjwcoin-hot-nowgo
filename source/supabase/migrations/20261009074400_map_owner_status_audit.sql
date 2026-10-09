-- Match the current audit schema while preserving canonical status and expiry.
create or replace function public.ng_map_set_status(p_store uuid,p_planet text,p_value text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_now timestamptz;v_expiry timestamptz;v_previous jsonb;v_next public.owner_overrides%rowtype;
begin
 if not coalesce(public.ng_map_can_publish(p_store,p_planet),false) then raise exception 'map_subscription_required' using errcode='42501';end if;
 if p_value is null or p_value not in ('open','temporary_closed','closed_for_day','ingredients_soldout','permanently_closed','break_time') then raise exception 'invalid_status';end if;
 perform 1 from public.stores where id=p_store and owner_id=auth.uid() and archived_at is null for update;
 if not found then raise exception 'owned_store_required' using errcode='42501';end if;
 v_now:=clock_timestamp();v_expiry:=v_now+interval '24 hours';
 if p_value<>'permanently_closed' then
  v_expiry:=(date_trunc('day',v_now at time zone 'Asia/Seoul')+interval '4 hours') at time zone 'Asia/Seoul';
  if v_expiry<=v_now then v_expiry:=v_expiry+interval '1 day';end if;
  v_expiry:=least(v_expiry,v_now+interval '24 hours');
 end if;
 select coalesce(jsonb_agg(to_jsonb(o)),'[]'::jsonb) into v_previous from public.owner_overrides o where store_id=p_store and kind='open_status' and active;
 update public.owner_overrides set active=false where store_id=p_store and kind='open_status' and active;
 insert into public.owner_overrides(store_id,kind,value,active,set_at,expires_at)
 values(p_store,'open_status',to_jsonb(p_value),true,v_now,v_expiry) returning * into v_next;
 insert into public.owner_status_audit_events(store_id,actor_id,kind,previous_states,next_state,occurred_at,received_at,valid_until)
 values(p_store,auth.uid(),'open_status',v_previous,to_jsonb(v_next),v_now,v_now,v_expiry);
 return jsonb_build_object('override',to_jsonb(v_next));
end $$;
