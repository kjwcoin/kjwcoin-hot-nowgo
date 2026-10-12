-- One product per store/auction; one winning slot per region/month.
-- Owners cannot set approval, payment verification or active exposure.
create table public.ng_hot_ad_auctions (
 id uuid primary key default gen_random_uuid(), region text not null check(length(btrim(region)) between 2 and 80),
 center_lat double precision not null check(center_lat between 33 and 39.6),
 center_lng double precision not null check(center_lng between 124 and 132),
 radius_km double precision not null default 15 check(radius_km between 1 and 15),
 starts_at timestamptz not null, ends_at timestamptz not null, deadline timestamptz not null,
 status text not null default 'open' check(status in ('open','awarded','active','canceled')),
 created_at timestamptz not null default now(), unique(region,starts_at),
 check(deadline<starts_at and ends_at>starts_at)
);
create table public.ng_hot_ad_bids (
 id uuid primary key default gen_random_uuid(),auction_id uuid not null references public.ng_hot_ad_auctions(id),
 owner_id uuid not null references auth.users(id),store_id uuid not null references public.stores(id),
 menu_id uuid not null references public.store_menu_items(id),budget integer not null check(budget between 8000 and 10000000),
 ramen_reference text not null check(ramen_reference in ('milder','similar','hotter')),
 terms_version text not null check(terms_version='2026-10-12-hot-local-auction-v1'),
 review_status text not null default 'pending' check(review_status in ('pending','approved','rejected')),reviewed_at timestamptz,reviewed_by uuid references auth.users(id),
 status text not null default 'pending' check(status in ('pending','selected','active','rejected','unpaid','canceled','refunded','refund_pending')),
 submitted_at timestamptz not null default now(),selected_at timestamptz,payment_due_at timestamptz,
 unique(auction_id,store_id)
);
create unique index ng_hot_ad_one_winner on public.ng_hot_ad_bids(auction_id) where status in ('selected','active');
create index ng_hot_ad_rank on public.ng_hot_ad_bids(auction_id,budget desc,submitted_at,id);
create index ng_hot_ad_owner on public.ng_hot_ad_bids(owner_id,submitted_at desc);
create table public.ng_hot_ad_orders (
 order_id text primary key,bid_id uuid not null unique references public.ng_hot_ad_bids(id),
 amount integer not null check(amount between 8800 and 11000000),
 payment_key text unique, paid_at timestamptz,refunded_at timestamptz,created_at timestamptz not null default now()
);
alter table public.ng_hot_ad_auctions enable row level security;
alter table public.ng_hot_ad_bids enable row level security;
alter table public.ng_hot_ad_orders enable row level security;
revoke all on public.ng_hot_ad_auctions,public.ng_hot_ad_bids,public.ng_hot_ad_orders from public,anon,authenticated;
grant select on public.ng_hot_ad_auctions,public.ng_hot_ad_bids,public.ng_hot_ad_orders to authenticated;
grant all on public.ng_hot_ad_auctions,public.ng_hot_ad_bids,public.ng_hot_ad_orders to service_role;
create policy hot_auction_read on public.ng_hot_ad_auctions for select to authenticated using(status='open' or exists(select 1 from public.ng_hot_ad_bids b where b.auction_id=ng_hot_ad_auctions.id and b.owner_id=(select auth.uid())) or (select public.is_admin()));
create policy hot_bid_read on public.ng_hot_ad_bids for select to authenticated using(owner_id=(select auth.uid()) or (select public.is_admin()));
create policy hot_order_read on public.ng_hot_ad_orders for select to authenticated using(exists(select 1 from public.ng_hot_ad_bids b where b.id=bid_id and b.owner_id=(select auth.uid())) or (select public.is_admin()));

create function public.ng_hot_ad_distance(lat1 double precision,lng1 double precision,lat2 double precision,lng2 double precision)
returns double precision language sql immutable set search_path='' as $$
 select 6371*2*asin(sqrt(least(1,power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2))));
$$;
revoke all on function public.ng_hot_ad_distance(double precision,double precision,double precision,double precision) from public;

create function public.ng_hot_ad_eligible(p_owner uuid,p_store uuid,p_menu uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_owner is not null and exists(
  select 1 from public.stores s join public.owners o on o.id=s.owner_id
  join public.ng_owner_featured_menus f on f.store_id=s.id and f.planet='hot' and f.menu_item_id=p_menu
  join public.store_menu_items m on m.id=f.menu_item_id and m.store_id=s.id and m.active
  where s.id=p_store and s.owner_id=p_owner and o.status='active' and s.archived_at is null
   and s.trust_disabled_at is null and coalesce(s.owner_penalty_points,0)<30
   and s.lat between 33 and 39.6 and s.lon between 124 and 132
   and exists(select 1 from public.ng_store_claims c where c.store_id=s.id and c.user_id=p_owner and c.status='approved')
 );
$$;
revoke all on function public.ng_hot_ad_eligible(uuid,uuid,uuid) from public,anon,authenticated;

create function public.ng_hot_ad_submit(p_auction uuid,p_store uuid,p_menu uuid,p_budget integer,p_reference text,p_terms text)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.ng_hot_ad_auctions%rowtype;v_id uuid;v_lat double precision;v_lng double precision;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not public.ng_hot_ad_eligible(auth.uid(),p_store,p_menu) then raise exception 'approved_owner_required' using errcode='42501';end if;
 select * into a from public.ng_hot_ad_auctions where id=p_auction for update;
 if not found or a.status<>'open' or now()>=a.deadline then raise exception 'auction_closed';end if;
 if p_budget is null or p_budget not between 8000 and 10000000 or p_reference is null or p_reference not in ('milder','similar','hotter') or p_terms is distinct from '2026-10-12-hot-local-auction-v1' then raise exception 'invalid_bid';end if;
 select lat,lon into v_lat,v_lng from public.stores where id=p_store;
 if public.ng_hot_ad_distance(a.center_lat,a.center_lng,v_lat,v_lng)>a.radius_km then raise exception 'outside_ad_region';end if;
 insert into public.ng_hot_ad_bids(auction_id,owner_id,store_id,menu_id,budget,ramen_reference,terms_version)
 values(p_auction,auth.uid(),p_store,p_menu,p_budget,p_reference,p_terms)
 on conflict(auction_id,store_id) do update set budget=excluded.budget,menu_id=excluded.menu_id,ramen_reference=excluded.ramen_reference,submitted_at=now(),review_status='pending',reviewed_at=null,reviewed_by=null
 where ng_hot_ad_bids.owner_id=auth.uid() and ng_hot_ad_bids.status='pending' returning id into v_id;
 if v_id is null then raise exception 'bid_locked';end if;
 return v_id;
end $$;
revoke all on function public.ng_hot_ad_submit(uuid,uuid,uuid,integer,text,text) from public,anon;
grant execute on function public.ng_hot_ad_submit(uuid,uuid,uuid,integer,text,text) to authenticated;

create function public.ng_hot_ad_create_auction(p_region text,p_lat double precision,p_lng double precision,p_month date)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_start timestamptz;v_id uuid;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'admin_required' using errcode='42501';end if;
 if p_month is null or p_month<>date_trunc('month',p_month)::date then raise exception 'month_start_required';end if;
 v_start:=p_month::timestamp at time zone 'Asia/Seoul';
 if v_start<=now()+interval '48 hours' then raise exception 'future_month_required';end if;
 insert into public.ng_hot_ad_auctions(region,center_lat,center_lng,starts_at,ends_at,deadline)
 values(btrim(p_region),p_lat,p_lng,v_start,(p_month+interval '1 month')::timestamp at time zone 'Asia/Seoul',v_start-interval '48 hours') returning id into v_id;
 return v_id;
end $$;
revoke all on function public.ng_hot_ad_create_auction(text,double precision,double precision,date) from public,anon;
grant execute on function public.ng_hot_ad_create_auction(text,double precision,double precision,date) to authenticated;

create function public.ng_hot_ad_award(p_auction uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.ng_hot_ad_auctions%rowtype;v_id uuid;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'admin_required' using errcode='42501';end if;
 select * into a from public.ng_hot_ad_auctions where id=p_auction for update;
 if not found or a.status in ('active','canceled') or now()<a.deadline or now()>=a.starts_at then raise exception 'auction_not_awardable';end if;
 if exists(select 1 from public.ng_hot_ad_bids where auction_id=p_auction and status='selected' and payment_due_at>now()) then raise exception 'winner_payment_pending';end if;
 update public.ng_hot_ad_bids set status='unpaid' where auction_id=p_auction and status='selected' and payment_due_at<=now();
 select id into v_id from public.ng_hot_ad_bids b where auction_id=p_auction and status='pending' and review_status='approved'
  and public.ng_hot_ad_eligible(b.owner_id,b.store_id,b.menu_id)
  and exists(select 1 from public.stores s where s.id=b.store_id and public.ng_hot_ad_distance(a.center_lat,a.center_lng,s.lat,s.lon)<=a.radius_km)
  order by budget desc,submitted_at,id limit 1;
 if v_id is null then raise exception 'no_eligible_bids';end if;
 update public.ng_hot_ad_bids set status='selected',selected_at=now(),payment_due_at=least(now()+interval '24 hours',a.starts_at) where id=v_id;
 update public.ng_hot_ad_auctions set status='awarded' where id=p_auction;
 return v_id;
end $$;
revoke all on function public.ng_hot_ad_award(uuid) from public,anon;
grant execute on function public.ng_hot_ad_award(uuid) to authenticated;

create function public.ng_hot_ad_checkout(p_bid uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.ng_hot_ad_bids%rowtype;o public.ng_hot_ad_orders%rowtype;a public.ng_hot_ad_auctions%rowtype;
begin
 select auction_id into b.auction_id from public.ng_hot_ad_bids where id=p_bid;
 select * into a from public.ng_hot_ad_auctions where id=b.auction_id for update;
 select * into b from public.ng_hot_ad_bids where id=p_bid and owner_id=auth.uid() for update;
 if not found or b.status not in ('selected','active') or not public.ng_hot_ad_eligible(auth.uid(),b.store_id,b.menu_id) then raise exception 'winning_owner_required' using errcode='42501';end if;
 if b.status='selected' and (b.payment_due_at<=now() or a.status<>'awarded') then raise exception 'payment_expired';end if;
 if b.status='selected' then update public.ng_hot_ad_bids set payment_due_at=greatest(payment_due_at,least(now()+interval '15 minutes',a.starts_at)) where id=b.id;end if;
 insert into public.ng_hot_ad_orders(order_id,bid_id,amount) values('hotad_'||b.id::text,b.id,b.budget+round(b.budget*0.1)::integer) on conflict(bid_id) do nothing;
 select * into o from public.ng_hot_ad_orders where bid_id=b.id;
 return jsonb_build_object('orderId',o.order_id,'amount',o.amount,'bidId',b.id,'paid',o.paid_at is not null,'startsAt',a.starts_at,'endsAt',a.ends_at);
end $$;
revoke all on function public.ng_hot_ad_checkout(uuid) from public,anon;
grant execute on function public.ng_hot_ad_checkout(uuid) to authenticated;

-- Only the payment verifier may call this after independently retrieving a DONE
-- provider payment with matching orderId, currency, amount and live credentials.
create function public.ng_hot_ad_confirm(p_order text,p_key text,p_amount integer)
returns void language plpgsql security definer set search_path='' as $$
declare o public.ng_hot_ad_orders%rowtype;b public.ng_hot_ad_bids%rowtype;a public.ng_hot_ad_auctions%rowtype;
begin
 if auth.role()<>'service_role' then raise exception 'payment_verifier_required' using errcode='42501';end if;
 select * into o from public.ng_hot_ad_orders where order_id=p_order;
 select auction_id into b.auction_id from public.ng_hot_ad_bids where id=o.bid_id;
 select * into a from public.ng_hot_ad_auctions where id=b.auction_id for update;
 select * into o from public.ng_hot_ad_orders where order_id=p_order for update;
 select * into b from public.ng_hot_ad_bids where id=o.bid_id for update;
 if o.order_id is null or o.amount is distinct from p_amount or p_key is null or length(p_key) not between 8 and 200 then raise exception 'payment_mismatch';end if;
 if o.paid_at is not null then if o.payment_key=p_key then return;else raise exception 'payment_mismatch';end if;end if;
 if b.status<>'selected' or a.status<>'awarded' or not public.ng_hot_ad_eligible(b.owner_id,b.store_id,b.menu_id) then raise exception 'ad_unavailable';end if;
 update public.ng_hot_ad_orders set payment_key=p_key,paid_at=now() where order_id=p_order;
 update public.ng_hot_ad_bids set status='active' where id=b.id;
 update public.ng_hot_ad_auctions set status='active' where id=a.id;
end $$;
revoke all on function public.ng_hot_ad_confirm(text,text,integer) from public,anon,authenticated;
grant execute on function public.ng_hot_ad_confirm(text,text,integer) to service_role;

create function public.ng_hot_ad_slot(p_lat double precision,p_lng double precision)
returns table(menu_id uuid,ramen_reference text) language sql stable security definer set search_path='' as $$
 select b.menu_id,b.ramen_reference from public.ng_hot_ad_bids b
 join public.ng_hot_ad_auctions a on a.id=b.auction_id join public.ng_hot_ad_orders o on o.bid_id=b.id
 join public.stores s on s.id=b.store_id
 where p_lat between 33 and 39.6 and p_lng between 124 and 132
  and a.status='active' and b.status='active' and o.paid_at is not null and o.refunded_at is null
  and now()>=a.starts_at and now()<a.ends_at and public.ng_hot_ad_eligible(b.owner_id,b.store_id,b.menu_id)
  and public.ng_hot_ad_distance(p_lat,p_lng,s.lat,s.lon)<=15
 order by b.budget desc,public.ng_hot_ad_distance(p_lat,p_lng,s.lat,s.lon),b.submitted_at,b.id limit 1;
$$;
revoke all on function public.ng_hot_ad_slot(double precision,double precision) from public;
grant execute on function public.ng_hot_ad_slot(double precision,double precision) to anon,authenticated;

create function public.ng_hot_ad_suspend(p_auction uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(public.is_admin(),false) then raise exception 'admin_required' using errcode='42501';end if;
 perform 1 from public.ng_hot_ad_auctions where id=p_auction for update;
 update public.ng_hot_ad_auctions set status='canceled' where id=p_auction;
 update public.ng_hot_ad_bids b set status=case when exists(select 1 from public.ng_hot_ad_orders o where o.bid_id=b.id and o.paid_at is not null and o.refunded_at is null) then 'refund_pending' else 'canceled' end
 where auction_id=p_auction and status in ('selected','active','pending');
end $$;
revoke all on function public.ng_hot_ad_suspend(uuid) from public,anon;
grant execute on function public.ng_hot_ad_suspend(uuid) to authenticated;

create function public.ng_hot_ad_review(p_bid uuid,p_approved boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(public.is_admin(),false) then raise exception 'admin_required' using errcode='42501';end if;
 if p_approved is null then raise exception 'review_required';end if;
 update public.ng_hot_ad_bids set review_status=case when p_approved then 'approved' else 'rejected' end,reviewed_at=now(),reviewed_by=auth.uid() where id=p_bid and status='pending';
 if not found then raise exception 'bid_locked';end if;
end $$;
revoke all on function public.ng_hot_ad_review(uuid,boolean) from public,anon;
grant execute on function public.ng_hot_ad_review(uuid,boolean) to authenticated;

create function public.ng_hot_ad_refund(p_order text,p_key text) returns void
language plpgsql security definer set search_path='' as $$
declare o public.ng_hot_ad_orders%rowtype;v_auction uuid;
begin
 if auth.role()<>'service_role' then raise exception 'payment_verifier_required' using errcode='42501';end if;
 select * into o from public.ng_hot_ad_orders where order_id=p_order and payment_key=p_key;
 if not found or o.paid_at is null then raise exception 'payment_mismatch';end if;
 select auction_id into v_auction from public.ng_hot_ad_bids where id=o.bid_id;
 perform 1 from public.ng_hot_ad_auctions where id=v_auction for update;
 update public.ng_hot_ad_orders set refunded_at=coalesce(refunded_at,now()) where order_id=p_order;
 update public.ng_hot_ad_bids set status='refunded' where id=o.bid_id;
 update public.ng_hot_ad_auctions set status='canceled' where id=v_auction;
end $$;
revoke all on function public.ng_hot_ad_refund(text,text) from public,anon,authenticated;
grant execute on function public.ng_hot_ad_refund(text,text) to service_role;
