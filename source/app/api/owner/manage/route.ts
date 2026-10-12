import {verifiedUser} from '@/lib/supabase';
import {reply,validOrigin} from '@/lib/server';
import {siteConfig,variantForHost} from '@/lib/site-config';
import {ownerSignupRequest} from '@/lib/owner-signup-bridge';
import {readOwnerForm,prepareOwnerPhoto,ownerError} from '@/lib/map-owner-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'점주 계정으로 로그인해 주세요.'},401);
 const url=new URL(request.url),storeId=url.searchParams.get('storeId');
 if(storeId&&!/^[0-9a-f-]{36}$/i.test(storeId))return reply(request,{error:'매장을 확인해 주세요.'},400);
 const link=url.searchParams.get('link');if(link&&!/^[0-9a-f-]{36}$/i.test(link))return reply(request,{error:'관리 주소를 확인해 주세요.'},400);
 const planet=variantForHost(url.hostname),args={p_planet:planet,p_store:storeId||null,p_link:link||null};
 let result=await auth.client.rpc('ng_map_dashboard_access',args);if(result.error)throw result.error;
 if(planet!=='hot'&&result.data?.storeId&&result.data.access?.code==='map_subscription_required'){
  try{const check=new URL('https://nowgo-prod.vercel.app/api/owner/subscription');check.searchParams.set('product','space_map');check.searchParams.set('planet',planet);await fetch(check,{headers:{Authorization:request.headers.get('authorization')!},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});const refreshed=await auth.client.rpc('ng_map_dashboard_access',args);if(!refreshed.error)result=refreshed}catch{}
 }
 if(planet==='hot'&&result.data?.storeId){
  const featured=await auth.client.from('ng_owner_featured_taste_menus').select('id').eq('owner_store_id',result.data.storeId).eq('planet','hot').maybeSingle();if(featured.error)throw featured.error;
  if(result.data.state)result.data.state.menus=(result.data.state.menus||[]).filter((m:{id:string})=>m.id===featured.data?.id);
 }
 return reply(request,result.data);
}catch(error){return ownerError(request,error)}}
export async function POST(request:Request){try{
 if(!request.headers.get('origin')||!validOrigin(request))return reply(request,{error:'같은 지도에서 요청해 주세요.'},403);
 const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'점주 계정으로 로그인해 주세요.'},401);
 const variant=variantForHost(new URL(request.url).hostname),theme=siteConfig(variant);
 if(request.headers.get('content-type')?.startsWith('multipart/form-data')){
  const form=await readOwnerForm(request),storeId=String(form.get('storeId')||''),name=String(form.get('name')||'').trim(),price=Number(form.get('price')),level=Number(form.get('level')),flavor=String(form.get('flavor')||''),category=String(form.get('category')||'');
  if(!/^[0-9a-f-]{36}$/i.test(storeId)||name.length<1||name.length>100||!Number.isInteger(price)||price<100||price>1000000||!Number.isInteger(level)||level<1||level>theme.heat.length||!theme.flavors.slice(1).some(f=>f===flavor)||!theme.categories.some(c=>c===category))return reply(request,{error:'메뉴 이름·가격·맛 단계와 결을 확인해 주세요.'},400);
  const permitted=await auth.client.rpc('ng_map_can_publish',{p_store:storeId,p_planet:variant});
  if(permitted.error)throw permitted.error;if(!permitted.data)return reply(request,{error:'매장 소유권·운영 권한 확인이 필요합니다.',code:'owner_management_unavailable'},403);
  let representative:string|null=null;if(variant==='hot'){const featured=await auth.client.from('ng_owner_featured_taste_menus').select('id').eq('owner_store_id',storeId).eq('planet','hot').maybeSingle();if(featured.error)throw featured.error;if(!featured.data)return reply(request,{error:'점주 가입에서 대표 매운 상품 1개를 먼저 등록해 주세요.'},409);representative=featured.data.id;}
  const bytes=await prepareOwnerPhoto(form.get('photo'));
  if(variant==='hot'){const canonical=new FormData();canonical.set('storeId',storeId);canonical.set('menuItemId',representative!);canonical.set('name',name);canonical.set('price',String(price));canonical.set('planet','hot');canonical.set('level',String(level));canonical.set('photo',new File([new Uint8Array(bytes)],'menu.webp',{type:'image/webp'}));await ownerSignupRequest(request,auth.user,'/api/owner/featured-menu',canonical);}
  const path=auth.user.id+'/'+storeId+'/'+variant+'/'+crypto.randomUUID()+'.webp';
  const upload=await auth.client.storage.from('ng-map-menu-photos').upload(path,bytes,{contentType:'image/webp',upsert:false});if(upload.error)throw upload.error;
  const result=await auth.client.rpc('ng_map_save_menu',{p_store:storeId,p_planet:variant,p_menu:representative,p_name:name,p_price:price,p_level:level,p_flavor:flavor,p_category:category,p_photo:path});
  if(result.error){await auth.client.storage.from('ng-map-menu-photos').remove([path]);throw result.error;}
  return reply(request,{ok:true,menuId:result.data,message:'사진과 메뉴를 지도에 등록했습니다.'});
 }
 const raw=await request.text();if(raw.length>4096)return reply(request,{error:'입력한 내용을 확인해 주세요.'},413);
 const body=JSON.parse(raw) as Record<string,unknown>,storeId=body.storeId;
 if(typeof storeId!=='string'||!/^[0-9a-f-]{36}$/i.test(storeId))return reply(request,{error:'매장을 확인해 주세요.'},400);
 let result;
 if(body.action==='status'&&typeof body.value==='string')result=await auth.client.rpc('ng_map_set_status',{p_store:storeId,p_planet:variant,p_value:body.value});
 else if(body.action==='soldout'&&typeof body.menuId==='string'&&typeof body.soldout==='boolean')result=await auth.client.rpc('ng_map_set_menu_soldout',{p_store:storeId,p_planet:variant,p_menu:body.menuId,p_soldout:body.soldout});
 else if(body.action==='taste'&&typeof body.menuId==='string'&&Number.isInteger(body.level)&&typeof body.flavor==='string'&&typeof body.category==='string')result=await auth.client.rpc('ng_map_set_menu_taste',{p_store:storeId,p_planet:variant,p_menu:body.menuId,p_level:body.level,p_flavor:body.flavor,p_category:body.category});
 else return reply(request,{error:'지원하지 않는 관리 기능입니다.'},400);
 if(result.error)throw result.error;return reply(request,{ok:true,message:'저장했습니다. 지도에 반영됩니다.'});
}catch(error){return ownerError(request,error)}}
