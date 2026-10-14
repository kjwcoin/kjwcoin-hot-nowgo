import records from '@/lib/readonly-source-records';
import {readSourcedStoreBySlug} from '@/lib/sourced-store-page';
import {isReadonlySourceStoreId} from '@/lib/readonly-source-listings';
import {verifiedUser,publicDb} from '@/lib/supabase';
import {reply,validOrigin,failure} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
import {planetForVariant,type ActivitySnapshot} from '@/lib/activity/model';
import sharp from 'sharp';
import {menuById} from '@/lib/menu-catalog';
import {randomUUID} from 'node:crypto';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{action:string}>};
const message:Record<string,string>={LOGIN_REQUIRED:'통합 로그인 후 나의 기록을 만나보세요.',OUTSIDE_STORE:'매장 가까이에서 다시 위치를 확인해 주세요. 인증 반경은 150m예요.',GPS_NOT_FRESH:'정확한 현재 위치를 확인하지 못했어요. 위치 권한을 확인하고 다시 시도해 주세요.',STORE_LOCATION_REQUIRED:'이 매장은 정확한 위치 확인이 필요해요.',RATE_LIMIT:'조금 쉬었다가 다시 시도해 주세요.',OWNER_REQUIRED:'이 매장의 점주만 다른 손님의 기록을 확인할 수 있어요.',BAD_BADGE:'아직 획득하지 않은 훈장이에요.',CUSTOMER_TRUST_RESTRICTED:'신뢰 검토에 따른 접수 제한 기간이에요. 나의 신뢰에서 기간과 이의신청을 확인해 주세요.',CUSTOMER_TRUST_DUPLICATE:'같은 매장에 같은 상태를 30분 안에 다시 제보할 수 없어요.',TRUST_RESPONSE_CLOSED:'소명·이의신청 접수 기간이 끝났어요.',TRUST_FORBIDDEN:'이 기록을 처리할 권한이 없어요.',STORE_NOT_FOUND:'매장을 다시 선택해 주세요.',PHOTO_MISSING:'사진 저장을 확인하지 못했어요. 다시 첨부해 주세요.',BAD_DATE:'기록 날짜를 확인해 주세요.'};
export async function GET(req:Request,{params}:Ctx){
 try{const {action}=await params;if(action==='push-key'){const {data,error}=await publicDb().rpc('ng_planet_push_public_key');if(error)throw error;return reply(req,{key:data||''})}const auth=await verifiedUser(req);if(!auth)return reply(req,{error:message.LOGIN_REQUIRED},401);const planet=planetForVariant(variantForHost(req.headers.get('host')));
 if(action==='footprint-draft'){
 const id=new URL(req.url).searchParams.get('visitId');if(!id||!/^[a-f0-9-]{36}$/.test(id))return reply(req,{error:'발자국을 다시 선택해 주세요.'},400);
 const {data:visit,error}=await auth.client.from('ng_planet_visits').select('id,store_id,source_store_id,shop,menu,country,region,visited_on,status,note,taste,texture').eq('id',id).eq('user_id',auth.user.id).eq('planet',planet).maybeSingle();if(error)throw error;if(!visit)return reply(req,{error:'내 발자국을 찾지 못했어요.'},404);
 const {data:photo,error:photoError}=await auth.client.from('ng_planet_photos').select('path,bucket').eq('visit_id',id).eq('user_id',auth.user.id).eq('planet',planet).order('created_at',{ascending:false}).limit(1).maybeSingle();if(photoError)throw photoError;
 let photoUrl=null;if(photo){const bucket=photo.bucket||'planet-private';if(['planet-private','hot-report-photos','sweet-report-photos','rich-report-photos'].includes(bucket)){const signed=await auth.client.storage.from(bucket).createSignedUrl(photo.path,300);if(signed.error)throw signed.error;photoUrl=signed.data?.signedUrl||null}}
 let store=null;if(visit.store_id){const found=await auth.client.from('stores').select('id,name,address,slug').eq('id',visit.store_id).is('archived_at',null).maybeSingle();if(found.error)throw found.error;store=found.data}
 const record=records.find(row=>row.id===visit.source_store_id);let sourceStore=record?await readSourcedStoreBySlug(record.slug):null;
 if(sourceStore){const hidden=await auth.client.rpc('ng_hot_source_hidden_stores');if(hidden.error)throw hidden.error;if((hidden.data||[]).includes(sourceStore.id))sourceStore=null}
 return reply(req,{visit,store,sourceStore,photoUrl});
 }
 if(action==='trust'){const {data,error}=await auth.client.rpc('ng_customer_trust_snapshot');if(error)throw error;return reply(req,data);}
 if(action==='snapshot'){const [result,trust,details]=await Promise.all([
 auth.client.rpc('ng_planet_snapshot',{p_planet:planet}),
 auth.client.rpc('ng_customer_trust_snapshot'),
 auth.client.from('ng_planet_visits').select('id,source_store_id,challenge_title,challenge_result').eq('user_id',auth.user.id).eq('planet',planet)
 ]);if(result.error||trust.error||details.error)throw result.error||trust.error||details.error;const snapshot=result.data as ActivitySnapshot;
 const stateNames:Record<string,string>={notified:'신뢰 검토 안내 · 72시간 소명',confirmed:'신뢰 검토 완료 · 7일 내 이의신청',dismissed:'신뢰 검토 종결 · 차감 없음',reversed:'신뢰 차감 취소 · 점수 복원'};
 const notices=(trust.data.cases as {id:string;state:string;review_note:string|null;notice_read_at:string|null;notified_at:string|null;finalized_at:string|null;created_at:string}[]).filter(c=>c.state!=='pending').map(c=>({id:'trust:'+c.id,title:stateNames[c.state]||'신뢰 검토',body:c.review_note||'나의 신뢰에서 사유와 접수 기간을 확인해 주세요.',read_at:c.notice_read_at,created_at:c.finalized_at||c.notified_at||c.created_at}));
 const visitDetails=details.data;const detailById=new Map((visitDetails||[]).map(row=>[row.id,row]));snapshot.visits=snapshot.visits.map(visit=>({...visit,...detailById.get(visit.id)}));
 snapshot.notifications=[...notices,...snapshot.notifications].sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const buckets=new Set(['planet-private',...snapshot.photos.map(p=>p.bucket||'planet-private')]);
 const signedBuckets=await Promise.all([...buckets].map(async bucket=>{if(!['planet-private','hot-report-photos','sweet-report-photos','rich-report-photos'].includes(bucket))return null;const paths=snapshot.photos.filter(p=>(p.bucket||'planet-private')===bucket).map(p=>p.path);if(bucket==='planet-private')paths.push(...snapshot.reviews.filter(r=>r.path).map(r=>r.path!));if(!paths.length)return null;const {data:urls}=await auth.client.storage.from(bucket).createSignedUrls(paths,300);return {bucket,byPath:new Map(urls?.map(x=>[x.path,x.signedUrl])||[])};}));
 for(const signed of signedBuckets){if(!signed)continue;const {bucket,byPath}=signed;snapshot.photos=snapshot.photos.map(p=>(p.bucket||'planet-private')===bucket?{...p,url:byPath.get(p.path)||undefined}:p);if(bucket==='planet-private')snapshot.reviews=snapshot.reviews.map(r=>({...r,path:r.path?(byPath.get(r.path)||undefined):undefined}));}
 return reply(req,snapshot);}
 return reply(req,{error:'찾을 수 없는 기능이에요.'},404);
 }catch(e){return failure(req,e)}
}
export async function POST(req:Request,{params}:Ctx){
 if(!validOrigin(req))return reply(req,{error:'요청 출처를 확인해 주세요.'},403);
 try{const auth=await verifiedUser(req);if(!auth)return reply(req,{error:message.LOGIN_REQUIRED},401);const {action}=await params;const planet=planetForVariant(variantForHost(req.headers.get('host')));
 if(action==='footprint'){if(Number(req.headers.get('content-length')||0)>10000)return reply(req,{error:'입력 내용이 너무 길어요.'},413);const body=await req.json();const sourceId=body.sourceStoreId;if(sourceId&&!isReadonlySourceStoreId(sourceId))return reply(req,{error:'매장을 다시 선택해 주세요.'},400);const {data,error}=await auth.client.rpc('ng_planet_footprint',{p_planet:planet,p_data:body});return error?reply(req,{error:message[error.message]||'매장 이름·국가·날짜와 도전 기록을 확인해 주세요.'},400):reply(req,data,201);}
 if(action==='share'){const {data,error}=await auth.client.rpc('ng_planet_share',{p_planet:planet});if(error)throw error;return reply(req,{path:'/activity/share/'+data});}
 let body:Record<string,unknown>;
 if(action==='trust-response'||action==='trust-case'){if(Number(req.headers.get('content-length')||0)>10000)return reply(req,{error:'입력 내용이 너무 길어요.'},413);const b=await req.json();const result=action==='trust-response'?await auth.client.rpc('ng_customer_trust_respond',{p_case:b.caseId,p_note:b.note}):await auth.client.rpc('ng_customer_trust_request',{p_type:b.sourceType,p_source:b.sourceId,p_reason:b.reason,p_evidence:b.evidence});if(result.error)return reply(req,{error:message[result.error.message]||'확인 사유와 접수 기간을 확인해 주세요.'},400);return reply(req,{ok:true,data:result.data});}

 if(action==='photo'||action==='receipt'){
 if(Number(req.headers.get('content-length')||0)>3_000_000)return reply(req,{error:'사진은 2MB 이하로 올려주세요.'},413);
 const form=await req.formData();if(isReadonlySourceStoreId(form.get('storeId')))return reply(req,{error:'이 공공자료 소개 매장은 계정 연결을 준비 중이에요.',code:'source_registration_pending'},409);const photo=form.get('photo');if(!(photo instanceof File)||photo.size>2_000_000||photo.size===0)return reply(req,{error:'2MB 이하의 사진을 첨부해 주세요.'},400);
 let bytes:Buffer;try{bytes=await sharp(await photo.arrayBuffer(),{limitInputPixels:40_000_000}).autoOrient().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer()}catch{return reply(req,{error:'사진을 읽을 수 없어요. JPG·PNG·WebP로 올려주세요.'},400)}
 const id=randomUUID(),path=`${auth.user.id}/${planet}/${action==='photo'?'photos':'receipts'}/${id}.webp`;
 const {error:uploadError}=await auth.client.storage.from('planet-private').upload(path,bytes,{contentType:'image/webp'});if(uploadError)throw uploadError;
 body={id,path,visitId:form.get('visitId'),storeId:form.get('storeId'),receiptRef:form.get('receiptRef'),paidAt:form.get('paidAt')};const {data,error}=await auth.client.rpc('ng_planet_action',{p_planet:planet,p_action:action,p_data:body});if(error){await auth.client.storage.from('planet-private').remove([path]);return reply(req,{error:message[error.message]||'기록을 저장하지 못했어요. 입력 내용과 영수증 번호를 확인해 주세요.'},400)}return reply(req,data,201);
 }
 if(!['profile','gps','visit','event','context','status','review','read','push','push-off','revoke-share'].includes(action))return reply(req,{error:'찾을 수 없는 기능이에요.'},404);
 if(Number(req.headers.get('content-length')||0)>10000)return reply(req,{error:'입력 내용이 너무 길어요.'},413);
 body=await req.json();if(isReadonlySourceStoreId(body.storeId)||isReadonlySourceStoreId(typeof body.target==='string'?body.target.replace(/^nowgo-/i,''):null))return reply(req,{error:'이 공공자료 소개 매장은 계정 연결을 준비 중이에요.',code:'source_registration_pending'},409);if(action==='read'){const n=await auth.client.rpc('ng_customer_trust_notices_read');if(n.error)throw n.error;}if(action==='event'){const target=String(body.target||'');if(/^(nowgo-)?[a-f0-9-]{36}$/.test(target)){body.storeId=target.replace(/^nowgo-/,'')}else if(target.length<=150){const menu=await menuById(target,variantForHost(req.headers.get('host')));if(menu?.placeId.startsWith('nowgo-'))body.storeId=menu.placeId.slice(6)}}const {data,error}=await auth.client.rpc('ng_planet_action',{p_planet:planet,p_action:action,p_data:body});if(error)return reply(req,{error:message[error.message]||'입력 내용을 확인해 주세요.'},400);return reply(req,data);
 }catch(e){return failure(req,e)}
}
