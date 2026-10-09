import {verifiedUser} from '@/lib/supabase';
import {reply,validOrigin} from '@/lib/server';
import {variantForHost,siteConfig} from '@/lib/site-config';
import {ownerSignupRequest} from '@/lib/owner-signup-bridge';
import {readOwnerForm,prepareOwnerPhoto,ownerError} from '@/lib/map-owner-api';
import {isKoreanAddress,isKoreanCoordinate} from '@/lib/korean-region';
export async function POST(request:Request){try{
 if(!request.headers.get('origin')||!validOrigin(request))return reply(request,{error:'같은 지도에서 가입해 주세요.'},403);
 const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'카카오 또는 구글 계정으로 로그인해 주세요.'},401);
 const variant=variantForHost(new URL(request.url).hostname),theme=siteConfig(variant),form=await readOwnerForm(request),get=(key:string)=>String(form.get(key)||'').trim(),phone=get('phone').replace(/[-\s]/g,'');
 if(!/^01(?:0\d{8}|[16789]\d{7,8})$/.test(phone)||get('consent')!=='yes')return reply(request,{error:'휴대폰 번호와 필수 가입 동의를 확인해 주세요.'},400);
 let storeId=get('storeId');
 if(storeId&&get('resume')!=='yes'){
  const result=await auth.client.rpc('ng_map_register_contact',{p_phone:phone,p_planet:variant,p_store:storeId});if(result.error)throw result.error;return reply(request,{ok:true,...result.data});
 }
 const name=get('menu'),price=Number(get('price')),level=Number(get('level')),flavor=get('flavor'),category=get('category'),lat=Number(get('lat')),lng=Number(get('lng'));
 if(!get('shop')||!isKoreanAddress(get('address'))||!isKoreanCoordinate(lat,lng)||!name||name.length>100||!Number.isInteger(price)||price<100||price>1000000||!Number.isInteger(level)||level<1||level>5||!theme.flavors.slice(1).some(f=>f===flavor)||!theme.categories.some(c=>c===category))return reply(request,{error:'매장 위치·메뉴·가격·맛 정보를 확인해 주세요.'},400);
 const photo=await prepareOwnerPhoto(form.get('photo'));
 if(!storeId){
  const registered=await ownerSignupRequest(request,auth.user,'/api/nowgo/business-verification',{businessNumber:get('businessNumber').replace(/-/g,''),openingDate:get('openingDate').replace(/-/g,''),representativeName:get('representative'),representativePhone:phone,acceptedTerms:true,newStore:{name:get('shop'),address:get('address'),category:get('storeCategory')}});
  if(registered.status!=='approved'||!/^[0-9a-f-]{36}$/i.test(registered.storeId))throw Error('registration_unavailable');storeId=registered.storeId;
 }
 try{
  if(get('resume')==='yes'){
   const existing=await auth.client.from('ng_map_owned_menu_catalog').select('id').eq('owner_store_id',storeId).eq('planet',variant).limit(1);
   if(existing.error)throw existing.error;
   if(existing.data?.length){const contact=await auth.client.rpc('ng_map_register_contact',{p_phone:phone,p_planet:variant,p_store:storeId});if(contact.error)throw contact.error;return reply(request,{ok:true,storeId,...contact.data})}
  }
  const location=await auth.client.rpc('ng_map_confirm_signup_location',{p_store:storeId,p_lat:lat,p_lng:lng});if(location.error)throw location.error;
  const upload=new FormData();upload.set('storeId',storeId);upload.set('menuItemId','');upload.set('name',name);upload.set('price',String(price));upload.set('planet',variant);upload.set('level',String(level));upload.set('photo',new File([new Uint8Array(photo)],'menu.webp',{type:'image/webp'}));
  const featured=await ownerSignupRequest(request,auth.user,'/api/owner/featured-menu',upload);
  if(typeof featured.menuId!=='string')throw Error('menu_not_found');
  const path=auth.user.id+'/'+storeId+'/'+variant+'/signup/'+crypto.randomUUID()+'.webp';
  const stored=await auth.client.storage.from('ng-map-menu-photos').upload(path,photo,{contentType:'image/webp',upsert:false});if(stored.error)throw stored.error;
  const adopted=await auth.client.rpc('ng_map_adopt_signup_menu',{p_store:storeId,p_planet:variant,p_menu:featured.menuId,p_price:price,p_level:level,p_flavor:flavor,p_category:category,p_photo:path});
  if(adopted.error){await auth.client.storage.from('ng-map-menu-photos').remove([path]);throw adopted.error}
  const contact=await auth.client.rpc('ng_map_register_contact',{p_phone:phone,p_planet:variant,p_store:storeId});if(contact.error)throw contact.error;
  return reply(request,{ok:true,storeId,...contact.data});
 }catch{return reply(request,{error:'매장은 등록됐지만 사진·위치 연결을 완료하지 못했습니다. 입력한 내용으로 다시 이어서 등록해 주세요.',storeId,partial:true},503)}
}catch(error){if(error instanceof Error&&!['invalid_photo','photo_required','photo_too_large'].includes(error.message)&&!/^[a-z_]+$/.test(error.message))return reply(request,{error:error.message},503);return ownerError(request,error)}}
