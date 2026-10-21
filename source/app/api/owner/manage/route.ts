import {verifiedUser} from '@/lib/supabase';
import {reply,validOrigin} from '@/lib/server';
import {siteConfig,variantForHost} from '@/lib/site-config';
import {readOwnerForm,readOwnerJson,prepareOwnerPhoto,ownerError} from '@/lib/map-owner-api';
import {validOwnerTaste} from '@/lib/owner-taste-level';
import {isExplicitOwnerGrant} from '@/lib/owner-publish-permission';
import {ownerSaveReadbackMatches,type OwnerWriteExpectation} from '@/lib/owner-save-readback';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OWNER_STATUSES=new Set(['open','temporary_closed','closed_for_day','ingredients_soldout','permanently_closed','break_time']);
export async function GET(request:Request){try{
 const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'점주 계정으로 로그인해 주세요.'},401);
 const url=new URL(request.url),storeId=url.searchParams.get('storeId');
 if(storeId&&!UUID.test(storeId))return reply(request,{error:'매장을 확인해 주세요.'},400);
 const link=url.searchParams.get('link');if(link&&!UUID.test(link))return reply(request,{error:'관리 주소를 확인해 주세요.'},400);
 const planet=variantForHost(url.hostname),args={p_planet:planet,p_store:storeId||null,p_link:link||null};
 let result=await auth.client.rpc('ng_map_dashboard_access',args);if(result.error)throw result.error;
 if(result.data?.storeId&&result.data.access?.code==='map_subscription_required'){
  try{const check=new URL('https://nowgo-prod.vercel.app/api/owner/subscription');check.searchParams.set('product','space_map');check.searchParams.set('planet',planet);await fetch(check,{headers:{Authorization:request.headers.get('authorization')!},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});const refreshed=await auth.client.rpc('ng_map_dashboard_access',args);if(!refreshed.error)result=refreshed}catch{}
 }
 return reply(request,result.data);
}catch(error){return ownerError(request,error)}}
export async function POST(request:Request){try{
 if(!request.headers.get('origin')||!validOrigin(request))return reply(request,{error:'같은 지도에서 요청해 주세요.'},403);
 const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'점주 계정으로 로그인해 주세요.'},401);
 const variant=variantForHost(new URL(request.url).hostname),theme=siteConfig(variant);
 if(request.headers.get('content-type')?.startsWith('multipart/form-data')){
  const form=await readOwnerForm(request),storeId=String(form.get('storeId')||''),name=String(form.get('name')||'').trim(),price=Number(form.get('price')),level=Number(form.get('level')),flavor=String(form.get('flavor')||''),category=String(form.get('category')||'');
  if(!UUID.test(storeId)||name.length<1||name.length>100||!Number.isInteger(price)||price<100||price>1000000||!validOwnerTaste(variant,level)||!theme.flavors.slice(1).some(f=>f===flavor)||!theme.categories.some(c=>c===category))return reply(request,{error:'메뉴 이름·가격·맛 단계와 결을 확인해 주세요.'},400);
  const permitted=await auth.client.rpc('ng_map_can_publish',{p_store:storeId,p_planet:variant});
  if(permitted.error)throw permitted.error;if(!isExplicitOwnerGrant(permitted.data))return reply(request,{error:'이 지도의 구독과 매장 권한 확인이 필요합니다.',code:'map_subscription_required'},402);
  const bytes=await prepareOwnerPhoto(form.get('photo')),path=auth.user.id+'/'+storeId+'/'+variant+'/'+crypto.randomUUID()+'.webp';
  const upload=await auth.client.storage.from('ng-map-menu-photos').upload(path,bytes,{contentType:'image/webp',upsert:false});if(upload.error)throw upload.error;
  const result=await auth.client.rpc('ng_map_save_menu',{p_store:storeId,p_planet:variant,p_menu:null,p_name:name,p_price:price,p_level:level,p_flavor:flavor,p_category:category,p_photo:path});
  if(result.error){await auth.client.storage.from('ng-map-menu-photos').remove([path]);throw result.error;}
  // A failed readback must not remove the photo: the committed menu may still reference it.
  const check=await auth.client.rpc('ng_map_dashboard_access',{p_planet:variant,p_store:storeId,p_link:null});
  if(check.error)throw check.error;
  const expected:OwnerWriteExpectation={action:'register',menuId:result.data,name,price,level,flavor,category,photoPath:path};
  if(!ownerSaveReadbackMatches(check.data,storeId,expected,variant))return reply(request,{error:'등록 요청 후 저장값을 확인하지 못했습니다. 다시 등록하기 전에 메뉴 목록을 새로고침해 주세요.',code:'SAVE_UNVERIFIED',menuId:result.data},503);
  return reply(request,{ok:true,menuId:result.data,message:'메뉴 등록과 저장값 재조회를 확인했습니다.'});
 }
 const body=await readOwnerJson(request);
 const storeId=body.storeId;
 if(typeof storeId!=='string'||!UUID.test(storeId))return reply(request,{error:'매장을 확인해 주세요.'},400);
 // Re-check paid owner permission on every write, not just dashboard entry.
 // DB RPCs must independently enforce authenticated ownership and menu/store scope.
 const permitted=await auth.client.rpc('ng_map_can_publish',{p_store:storeId,p_planet:variant});
 if(permitted.error)throw permitted.error;
 if(!isExplicitOwnerGrant(permitted.data))return reply(request,{error:'이 지도의 구독과 매장 권한 확인이 필요합니다.',code:'map_subscription_required'},402);
 let result;
 let expected:OwnerWriteExpectation;
 if(body.action==='status'&&typeof body.value==='string'&&OWNER_STATUSES.has(body.value)){
  expected={action:'status',value:body.value};
  result=await auth.client.rpc('ng_map_set_status',{p_store:storeId,p_planet:variant,p_value:body.value});
 }else if(body.action==='soldout'&&typeof body.menuId==='string'&&UUID.test(body.menuId)&&typeof body.soldout==='boolean'){
  expected={action:'soldout',menuId:body.menuId,soldout:body.soldout};
  result=await auth.client.rpc('ng_map_set_menu_soldout',{p_store:storeId,p_planet:variant,p_menu:body.menuId,p_soldout:body.soldout});
 }else if(body.action==='taste'&&typeof body.menuId==='string'&&UUID.test(body.menuId)&&validOwnerTaste(variant,body.level)&&typeof body.flavor==='string'&&theme.flavors.slice(1).some(f=>f===body.flavor)&&typeof body.category==='string'&&theme.categories.some(c=>c===body.category)){
  expected={action:'taste',menuId:body.menuId,level:body.level as number,flavor:body.flavor,category:body.category};
  result=await auth.client.rpc('ng_map_set_menu_taste',{p_store:storeId,p_planet:variant,p_menu:body.menuId,p_level:body.level,p_flavor:body.flavor,p_category:body.category});
 }else return reply(request,{error:'지원하지 않는 관리 기능입니다.'},400);
 if(result.error)throw result.error;
 const check=await auth.client.rpc('ng_map_dashboard_access',{p_planet:variant,p_store:storeId,p_link:null});
 if(check.error)throw check.error;
 if(!ownerSaveReadbackMatches(check.data,storeId,expected,variant))return reply(request,{error:'저장 요청 후 저장값을 확인하지 못했습니다. 새로고침해 상태를 확인해 주세요.',code:'SAVE_UNVERIFIED'},503);
 return reply(request,{ok:true,message:'저장과 재조회를 확인했습니다.'});
}catch(error){return ownerError(request,error)}}
