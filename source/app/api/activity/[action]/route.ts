import {verifiedUser,publicDb} from '@/lib/supabase';
import {reply,validOrigin,failure} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
import {planetForVariant,type ActivitySnapshot} from '@/lib/activity/model';
import sharp from 'sharp';
import {menuById} from '@/lib/menu-catalog';
import {randomUUID} from 'node:crypto';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{action:string}>};
const message:Record<string,string>={LOGIN_REQUIRED:'통합 로그인 후 나의 기록을 만나보세요.',OUTSIDE_STORE:'매장 가까이에서 다시 위치를 확인해 주세요. 인증 반경은 150m예요.',GPS_NOT_FRESH:'정확한 현재 위치를 확인하지 못했어요. 위치 권한을 확인하고 다시 시도해 주세요.',STORE_LOCATION_REQUIRED:'이 매장은 정확한 위치 확인이 필요해요.',RATE_LIMIT:'조금 쉬었다가 다시 시도해 주세요.',OWNER_REQUIRED:'이 매장의 점주만 다른 손님의 기록을 확인할 수 있어요.',BAD_BADGE:'아직 획득하지 않은 훈장이에요.',STORE_NOT_FOUND:'매장을 다시 선택해 주세요.',PHOTO_MISSING:'사진 저장을 확인하지 못했어요. 다시 첨부해 주세요.',BAD_DATE:'기록 날짜를 확인해 주세요.'};
export async function GET(req:Request,{params}:Ctx){
 try{const {action}=await params;if(action==='push-key'){const {data,error}=await publicDb().rpc('ng_planet_push_public_key');if(error)throw error;return reply(req,{key:data||''})}const auth=await verifiedUser(req);if(!auth)return reply(req,{error:message.LOGIN_REQUIRED},401);const planet=planetForVariant(variantForHost(req.headers.get('host')));
 if(action==='snapshot'){const {data,error}=await auth.client.rpc('ng_planet_snapshot',{p_planet:planet});if(error)throw error;const snapshot=data as ActivitySnapshot;
 const buckets=new Set(['planet-private',...snapshot.photos.map(p=>p.bucket||'planet-private')]);
 for(const bucket of buckets){if(!['planet-private','hot-report-photos','sweet-report-photos','rich-report-photos'].includes(bucket))continue;const paths=snapshot.photos.filter(p=>(p.bucket||'planet-private')===bucket).map(p=>p.path);if(bucket==='planet-private')paths.push(...snapshot.reviews.filter(r=>r.path).map(r=>r.path!));if(!paths.length)continue;const {data:urls}=await auth.client.storage.from(bucket).createSignedUrls(paths,300);const byPath=new Map(urls?.map(x=>[x.path,x.signedUrl])||[]);snapshot.photos=snapshot.photos.map(p=>(p.bucket||'planet-private')===bucket?{...p,url:byPath.get(p.path)||undefined}:p);if(bucket==='planet-private')snapshot.reviews=snapshot.reviews.map(r=>({...r,path:r.path?(byPath.get(r.path)||undefined):undefined}));}
 return reply(req,snapshot);}
 return reply(req,{error:'찾을 수 없는 기능이에요.'},404);
 }catch(e){return failure(req,e)}
}
export async function POST(req:Request,{params}:Ctx){
 if(!validOrigin(req))return reply(req,{error:'요청 출처를 확인해 주세요.'},403);
 try{const auth=await verifiedUser(req);if(!auth)return reply(req,{error:message.LOGIN_REQUIRED},401);const {action}=await params;const planet=planetForVariant(variantForHost(req.headers.get('host')));
 if(action==='share'){const {data,error}=await auth.client.rpc('ng_planet_share',{p_planet:planet});if(error)throw error;return reply(req,{path:'/activity/share/'+data});}
 let body:Record<string,unknown>;
 if(action==='photo'||action==='receipt'){
 if(Number(req.headers.get('content-length')||0)>3_000_000)return reply(req,{error:'사진은 2MB 이하로 올려주세요.'},413);
 const form=await req.formData();const photo=form.get('photo');if(!(photo instanceof File)||photo.size>2_000_000||photo.size===0)return reply(req,{error:'2MB 이하의 사진을 첨부해 주세요.'},400);
 let bytes:Buffer;try{bytes=await sharp(await photo.arrayBuffer(),{limitInputPixels:40_000_000}).autoOrient().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer()}catch{return reply(req,{error:'사진을 읽을 수 없어요. JPG·PNG·WebP로 올려주세요.'},400)}
 const id=randomUUID(),path=`${auth.user.id}/${planet}/${action==='photo'?'photos':'receipts'}/${id}.webp`;
 const {error:uploadError}=await auth.client.storage.from('planet-private').upload(path,bytes,{contentType:'image/webp'});if(uploadError)throw uploadError;
 body={id,path,visitId:form.get('visitId'),storeId:form.get('storeId'),receiptRef:form.get('receiptRef'),paidAt:form.get('paidAt')};const {data,error}=await auth.client.rpc('ng_planet_action',{p_planet:planet,p_action:action,p_data:body});if(error){await auth.client.storage.from('planet-private').remove([path]);return reply(req,{error:message[error.message]||'기록을 저장하지 못했어요. 입력 내용과 영수증 번호를 확인해 주세요.'},400)}return reply(req,data,201);
 }
 if(!['profile','gps','visit','event','context','status','review','read','push','push-off','revoke-share'].includes(action))return reply(req,{error:'찾을 수 없는 기능이에요.'},404);
 if(Number(req.headers.get('content-length')||0)>10000)return reply(req,{error:'입력 내용이 너무 길어요.'},413);
 body=await req.json();if(action==='event'){const target=String(body.target||'');if(/^(nowgo-)?[a-f0-9-]{36}$/.test(target)){body.storeId=target.replace(/^nowgo-/,'')}else if(target.length<=150){const menu=await menuById(target,variantForHost(req.headers.get('host')));if(menu?.placeId.startsWith('nowgo-'))body.storeId=menu.placeId.slice(6)}}const {data,error}=await auth.client.rpc('ng_planet_action',{p_planet:planet,p_action:action,p_data:body});if(error)return reply(req,{error:message[error.message]||'입력 내용을 확인해 주세요.'},400);return reply(req,data);
 }catch(e){return failure(req,e)}
}
