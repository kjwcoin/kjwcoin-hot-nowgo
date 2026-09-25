import {reply,validOrigin,failure,config} from '@/lib/server';
import {MENUS,FLAVORS,MENU_CATEGORIES} from '@/lib/menus';
import {communityMenus,menuById} from '@/lib/menu-catalog';
import {verifiedUser} from '@/lib/supabase';
import {isKoreanAddress,isKoreanCoordinate,isKoreanRegion} from '@/lib/korean-region';

type Ctx={params:Promise<{action:string}>};
const bucket='rich-report-photos';
const reject=(req:Request,error:string,status:number)=>reply(req,{error},status);
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');

export async function GET(req:Request,{params}:Ctx){
 const {action}=await params;
 try{
  if(action==='config'){const {kakaoKey,chatUrl}=config();return reply(req,{kakaoKey,chatUrl})}
  if(action==='menus'){const url=new URL(req.url),num=(name:string)=>Number(url.searchParams.get(name)||0);return reply(req,await communityMenus({page:num('page'),query:url.searchParams.get('q')||'',heat:num('heat'),maxHeat:num('maxHeat'),flavor:url.searchParams.get('flavor')||'',category:url.searchParams.get('category')||'',budget:num('budget'),lat:num('lat'),lng:num('lng'),radiusKm:num('radiusKm')||30}))}
  if(action!=='state')return reply(req,{},404);
  const auth=await verifiedUser(req);
  if(!auth)return reply(req,{saved:[],reports:[]});
  const [saves,reports]=await Promise.all([
   auth.client.from('rich_menu_saves').select('menu_id').eq('user_id',auth.user.id),
   auth.client.from('rich_taste_observations').select('id,menu,status,created_at').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(20)
  ]);
  if(saves.error||reports.error)throw saves.error||reports.error;
  return reply(req,{saved:saves.data?.map(x=>x.menu_id)||[],reports:reports.data||[]});
 }catch(e){return failure(req,e)}
}

export async function POST(req:Request,{params}:Ctx){
 if(!validOrigin(req))return reject(req,'요청 출처를 확인해 주세요.',403);
 const {action}=await params;
 try{
  // Analytics are best-effort. Never write every impression into the membership database.
  if(action==='events')return reply(req,{recorded:false},202);
  const auth=await verifiedUser(req);
  if(!auth)return reject(req,'NOWGO 통합 로그인 후 이용해 주세요.',401);
  const {user,client}=auth;
  if(action==='state'){
   const p=await req.json() as {menuId:string;saved:boolean};
   if(typeof p.saved!=='boolean'||!await menuById(p.menuId))return reject(req,'메뉴를 다시 선택해 주세요.',400);
   const q=p.saved?client.from('rich_menu_saves').upsert({user_id:user.id,menu_id:p.menuId},{onConflict:'user_id,menu_id'}):client.from('rich_menu_saves').delete().eq('user_id',user.id).eq('menu_id',p.menuId);
   const {error}=await q;if(error)throw error;
   return reply(req,{saved:p.saved});
  }
  if(action!=='reports')return reply(req,{},404);
  if(Number(req.headers.get('content-length')||0)>3_000_000)return reject(req,'사진은 2MB 이하로 올려주세요.',413);
  const form=await req.formData(),get=(k:string)=>String(form.get(k)||'').trim();
  const id=get('requestId'),role=get('role');
  let shop=get('shop'),address=get('address');
  const menu=get('menu'),price=Number(get('price')),heat=Number(get('heat')),flavor=get('flavor'),observed=get('observedAt'),note=get('note'),category=get('category');
  const phone=get('phone').replace(/-/g,''),businessNumber=get('businessNumber').replace(/-/g,'');
  if(!/^01[016789][0-9]{7,8}$/.test(phone)||(role==='owner'&&!/^[0-9]{10}$/.test(businessNumber)))return reject(req,'연락처를 입력해 주세요. 사업자는 사업자번호와 전화번호가 모두 필요합니다.',400);
  const storeId=get('storeId');
  let ownerStore:{store_id:string;name:string;address:string;lat:number|null;lng:number|null}|undefined;
  if(role==='owner'){
   const {data:owned,error:storeError}=await client.rpc('rich_owned_stores');if(storeError)throw storeError;
   ownerStore=(owned||[]).find((s:{store_id:string})=>s.store_id===storeId);
   if(!ownerStore)return reject(req,'NOWGO에서 매장 관리 권한을 확인한 뒤 공식 점주로 제보해 주세요.',403);
   shop=ownerStore.name;address=ownerStore.address;
  }
  if(!/^[a-f0-9-]{36}$/.test(id)||!['customer','owner'].includes(role)||shop.length<2||shop.length>100||menu.length<2||menu.length>100||MENUS.some(x=>x.shop===shop)||!isKoreanAddress(address)||!Number.isInteger(price)||price<100||price>1000000||!Number.isInteger(heat)||heat<1||heat>5||!FLAVORS.slice(1).includes(flavor)||note.length>1000||!/^\d{4}-\d{2}-\d{2}$/.test(observed)||!Number.isFinite(Date.parse(observed))||new Date(observed)>new Date()||new Date(observed).toISOString().slice(0,10)!==observed||get('rights')!=='yes'||get('accuracy')!=='yes'||!MENU_CATEGORIES.includes(category))return reject(req,'대한민국 내 실제 가게 주소와 메뉴·가격·확인 날짜·사진 공개 동의를 확인해 주세요.',400);
  const photo=form.get('photo');
  if(!(photo instanceof File)||photo.size===0||photo.size>2_000_000)return reject(req,'JPG·PNG·WebP 사진을 2MB 이하로 첨부해 주세요.',400);
  const bytes=new Uint8Array(await photo.arrayBuffer());
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  if(!jpg&&!png&&!webp)return reject(req,'지원되는 이미지 파일을 올려주세요.',400);
  const mime=jpg?'image/jpeg':png?'image/png':'image/webp';
  const {data:prior,error:priorError}=await client.from('rich_taste_observations').select('id,status').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(priorError)throw priorError;if(prior)return reply(req,prior);
  let lat:number|null=null,lng:number|null=null;
  const pointLat=Number(get('lat')),pointLng=Number(get('lng'));
  if(get('lat')&&get('lng')&&isKoreanCoordinate(pointLat,pointLng)){lat=pointLat;lng=pointLng}
  if(ownerStore){lat=isKoreanCoordinate(ownerStore.lat,ownerStore.lng)?ownerStore.lat:null;lng=lat===null?null:ownerStore.lng}
  const restKey=process.env.KAKAO_MAP_REST_KEY;
  if(restKey&&!ownerStore){try{const geo=await fetch('https://dapi.kakao.com/v2/local/search/address.json?query='+encodeURIComponent(address),{headers:{Authorization:'KakaoAK '+restKey},signal:AbortSignal.timeout(5000)});if(geo.ok){const g=await geo.json() as {documents:{x:string;y:string;address?:{region_1depth_name:string}|null;road_address?:{region_1depth_name:string}|null}[]};if(g.documents?.length===1){const place=g.documents[0],region=place.address?.region_1depth_name||place.road_address?.region_1depth_name||'';const y=Number(place.y),x=Number(place.x);if(isKoreanRegion(region)&&isKoreanCoordinate(y,x)){lat=y;lng=x}}}}catch{}}
  const placeId=role==='owner'?'nowgo-'+storeId:'reported-'+(await sha(address+'|'+shop.replace(/\s/g,''))).slice(0,24);
  const path=id;
  const {error:insertError}=await client.from('rich_taste_observations').insert({id,user_id:user.id,role,nowgo_store_id:role==='owner'?storeId:null,phone,business_number:role==='owner'?businessNumber:null,place_id:placeId,menu_id:id,shop,menu,address,price,heat,flavor,category,observed_at:observed,note,lat,lng,photo_path:path,photo_mime:mime,status:'draft'});
  if(insertError){if(insertError.code==='23505')return reject(req,'같은 제보가 이미 접수되었어요.',409);if(insertError.code==='P0001')return reject(req,'한 시간에 10건까지 제보할 수 있어요.',429);throw insertError}
  const {error:uploadError}=await client.storage.from(bucket).upload(path,bytes,{contentType:mime,upsert:false});
  if(uploadError){await client.from('rich_taste_observations').delete().eq('id',id).eq('user_id',user.id);throw uploadError}
  const {data:status,error:publishError}=await client.rpc('rich_publish_report',{report_id:id});
  if(publishError){await client.storage.from(bucket).remove([path]);await client.from('rich_taste_observations').delete().eq('id',id).eq('user_id',user.id);throw publishError}
  return reply(req,{id,status},201);
 }catch(e){return failure(req,e)}
}

export async function DELETE(req:Request,{params}:Ctx){
 if(!validOrigin(req))return reply(req,{},403);
 if((await params).action!=='reports')return reply(req,{},404);
 try{
  const auth=await verifiedUser(req);if(!auth)return reject(req,'NOWGO 통합 로그인 후 이용해 주세요.',401);
  const {id}=await req.json() as {id:string};if(!/^[a-f0-9-]{36}$/.test(id))return reject(req,'제보 번호 오류',400);
  const {data,error}=await auth.client.from('rich_taste_observations').select('photo_path').eq('id',id).eq('user_id',auth.user.id).maybeSingle();
  if(error)throw error;if(!data)return reply(req,{deleted:true});
  const {error:deleteError}=await auth.client.from('rich_taste_observations').delete().eq('id',id).eq('user_id',auth.user.id);
  if(deleteError)throw deleteError;
  await auth.client.storage.from(bucket).remove([data.photo_path]);
  return reply(req,{deleted:true});
 }catch(e){return failure(req,e)}
}
