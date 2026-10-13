import records from '@/lib/readonly-source-records';
import {sourceTasteInput} from '@/lib/source-community';
import {publicDb,verifiedUser} from '@/lib/supabase';
import {reply,validOrigin,failure} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
const approved=new Set(records.map(row=>row.id));
function store(value:unknown){return typeof value==='string'&&approved.has(value)?value:null}
function rpcError(request:Request,error:{message:string}){
 if(error.message.includes('owner_report_requires_dashboard'))return reply(request,{error:'내 매장의 영업현황은 점주 전용 웹앱에서 등록해 주세요.'},403);
 if(error.message.includes('login_required'))return reply(request,{error:'로그인 후 참여해 주세요.',code:'login_required'},401);
 if(error.message.includes('request_rate_limited'))return reply(request,{error:'오늘 등록한 요청이 많아요. 잠시 후 다시 시도해 주세요.'},429);
 if(error.message.includes('source_store_not_found'))return reply(request,{error:'매장을 다시 선택해 주세요.'},404);
 if(error.message.includes('invalid_'))return reply(request,{error:'메뉴와 맛 정보를 확인해 주세요.'},400);
 return failure(request,error);
}
export async function GET(request:Request){
 if(variantForHost(request.headers.get('host'))!=='hot')return reply(request,{error:'HOT 지도를 이용해 주세요.'},404);
 const params=new URL(request.url).searchParams,id=store(params.get('storeId'));
 if(!id||params.getAll('storeId').length!==1)return reply(request,{error:'매장을 다시 선택해 주세요.'},400);
 try{const auth=await verifiedUser(request),client=auth?.client||publicDb();const [summary,status]=await Promise.all([client.rpc('ng_hot_source_community_state',{p_store:id}),client.rpc('ng_hot_source_status_state',{p_store:id})]);return summary.error||status.error?rpcError(request,(summary.error||status.error)!):reply(request,{...summary.data,statuses:status.data})}catch(error){return failure(request,error)}
}
export async function POST(request:Request){
 if(!request.headers.get('origin')||!validOrigin(request))return reply(request,{error:'같은 지도에서 참여해 주세요.'},403);
 if(variantForHost(request.headers.get('host'))!=='hot')return reply(request,{error:'HOT 지도를 이용해 주세요.'},404);
 try{
  const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'로그인 후 제보하거나 점주 가입을 요청해 주세요.',code:'login_required'},401);
  if(Number(request.headers.get('content-length')||0)>8192)return reply(request,{error:'입력 내용이 너무 길어요.'},413);
  let body:unknown;try{body=await request.json()}catch{return reply(request,{error:'입력 내용을 확인해 주세요.'},400)}
  const row=body&&typeof body==='object'&&!Array.isArray(body)?body as Record<string,unknown>:null,id=store(row?.storeId);
  if(!row||!id||!['taste','owner-request','status'].includes(String(row.action)))return reply(request,{error:'매장과 참여 종류를 확인해 주세요.'},400);
  if(row.action==='status'){if(!['permanent_closed','temporary_closed','ingredients_soldout'].includes(String(row.status))||row.observed!==true)return reply(request,{error:'직접 확인한 영업상태를 선택해 주세요.'},400);const status=await auth.client.rpc('ng_hot_source_status_submit',{p_store:id,p_status:row.status});if(status.error)return rpcError(request,status.error);const summary=await auth.client.rpc('ng_hot_source_community_state',{p_store:id});if(summary.error)return rpcError(request,summary.error);return reply(request,{...summary.data,...status.data})}
  let taste;try{taste=row.action==='taste'?sourceTasteInput(row):null}catch{return reply(request,{error:'메뉴·맛 단계·카테고리와 직접 먹어본 메뉴 동의를 확인해 주세요.'},400)}
  const {data,error}=await auth.client.rpc('ng_hot_source_community_submit',{p_store:id,p_action:row.action,p_menu:taste?.menu||'',p_heat:taste?.heat||null,p_flavor:taste?.flavor||'',p_note:taste?.note||'',p_consent:taste?.consent||false});
  if(error)return rpcError(request,error);const status=await auth.client.rpc('ng_hot_source_status_state',{p_store:id});return status.error?rpcError(request,status.error):reply(request,{...data,statuses:status.data});
 }catch(error){return failure(request,error)}
}
