import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

type Override={kind:'open_status'|'congestion';value:unknown;set_at:string;expires_at:string|null};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const valueOf=(value:unknown)=>typeof value==='string'?value:typeof value==='object'&&value!==null&&typeof (value as Record<string,unknown>).status==='string'?(value as Record<string,unknown>).status as string:null;
const toStoreId=(placeId:string)=>/^nowgo-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(placeId)?.[1]||null;

Deno.serve(async req=>{
 if(req.method!=='GET')return json({error:'method_not_allowed'},405);
 const u=new URL(req.url),placeId=u.searchParams.get('hot_place_id')||'',menuId=u.searchParams.get('hot_menu_id')||'';
 if(!placeId||!menuId||placeId.length>100||menuId.length>100)return json({error:'invalid_request'},400);
 const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!serviceKey)return json({error:'misconfigured'},500);
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 let storeId=toStoreId(placeId);
 if(!storeId)for(const table of ['hot_taste_observations','sweet_taste_observations','rich_taste_observations']){
  const {data,error}=await db.from(table).select('nowgo_store_id').eq('menu_id',menuId).eq('place_id',placeId).not('nowgo_store_id','is',null).limit(1).maybeSingle();
  if(error)return json({error:'lookup_failed'},500);
  if(data?.nowgo_store_id){storeId=String(data.nowgo_store_id);break}
 }
 if(!storeId)return json({error:'store_not_linked'},404);
 const {data:store,error:storeError}=await db.from('stores').select('id,slug').eq('id',storeId).is('archived_at',null).maybeSingle();
 if(storeError)return json({error:'store_lookup_failed'},500);
 if(!store)return json({error:'store_not_found'},404);
 const now=new Date().toISOString();
 const {data:rows,error:overrideError}=await db.from('owner_overrides').select('kind,value,set_at,expires_at').eq('store_id',storeId).eq('active',true).in('kind',['open_status','congestion']).or(`expires_at.is.null,expires_at.gt.${now}`).order('set_at',{ascending:false});
 if(overrideError)return json({error:'override_lookup_failed'},500);
 const latest=new Map<string,Override>();for(const row of (rows||[]) as Override[])if(!latest.has(row.kind))latest.set(row.kind,row);
 const open=latest.get('open_status'),congestion=latest.get('congestion'),observedAt=open?.set_at||congestion?.set_at,expiresAt=open?.expires_at||new Date(Date.now()+3*60*1000).toISOString();
 return json({hot_place_id:placeId,hot_menu_id:menuId,place_id:store.id,minihome_url:`https://www.nowgo.space/p/${store.slug}`,owner_verified:true,source:'owner',status:valueOf(open?.value),observed_at:observedAt,expires_at:expiresAt,crowding:valueOf(congestion?.value),crowding_observed_at:congestion?.set_at,seating:null,menu:{hot_menu_id:menuId,status:'UNKNOWN'}});
});
