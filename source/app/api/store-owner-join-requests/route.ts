import {READONLY_SOURCE_PUBLICATION} from '@/lib/readonly-source-listings';
import {sourcePreviewEnabled} from '@/lib/source-store-preview';
import {reply,validOrigin,failure} from '@/lib/server';
import {publicDb,verifiedUser} from '@/lib/supabase';
import {variantForHost} from '@/lib/site-config';
import {STORE_UUID,parseOwnerInformationRequestState} from '@/lib/sourced-store';

function enabled(request:Request){return !READONLY_SOURCE_PUBLICATION&&!sourcePreviewEnabled()&&process.env.NOWGO_UNCLAIMED_STORES_ENABLED==='true'&&variantForHost(request.headers.get('host'))==='hot'}
function rpcFailure(request:Request,error:{message:string}){
 if(error.message.includes('owner_already_registered'))return reply(request,{error:'이미 점주가 등록한 매장입니다.',code:'owner_already_registered'},409);
 if(error.message.includes('store_not_found'))return reply(request,{error:'공개된 매장을 찾을 수 없어요.',code:'store_not_found'},404);
 if(error.message.includes('request_rate_limited'))return reply(request,{error:'오늘 남긴 요청이 많아요. 나중에 다시 시도해 주세요.',code:'request_rate_limited'},429);
 return failure(request,error);
}
export async function GET(request:Request){
 if(!enabled(request))return reply(request,{error:'매장 요청 기능을 준비 중이에요.'},404);
 const params=new URL(request.url).searchParams,id=params.get('storeId');
 if(!id||!STORE_UUID.test(id)||params.getAll('storeId').length!==1||[...params.keys()].some(key=>key!=='storeId'))return reply(request,{error:'매장을 다시 선택해 주세요.'},400);
 try{
  const auth=await verifiedUser(request);
  const {data,error}=await (auth?.client||publicDb()).rpc('ng_map_store_owner_join_request_state',{p_planet:'hot',p_store:id});
  if(error)return rpcFailure(request,error);
  return reply(request,parseOwnerInformationRequestState(data));
 }catch(error){return failure(request,error)}
}
export async function POST(request:Request){
 if(!validOrigin(request))return reply(request,{error:'요청 출처를 확인해 주세요.'},403);
 if(!enabled(request))return reply(request,{error:'매장 요청 기능을 준비 중이에요.'},404);
 try{
  const auth=await verifiedUser(request);
  if(!auth)return reply(request,{error:'로그인하고 점주 영업정보를 요청해 주세요.',code:'login_required'},401);
  let body:unknown;try{body=await request.json()}catch{return reply(request,{error:'매장을 다시 선택해 주세요.'},400)}
  const row=body&&typeof body==='object'&&!Array.isArray(body)?body as Record<string,unknown>:null;
  if(!row||typeof row.storeId!=='string'||!STORE_UUID.test(row.storeId)||Object.keys(row).some(key=>key!=='storeId'))return reply(request,{error:'매장을 다시 선택해 주세요.'},400);
  const {data,error}=await auth.client.rpc('ng_map_request_store_owner_join',{p_planet:'hot',p_store:row.storeId});
  if(error)return rpcFailure(request,error);
  return reply(request,parseOwnerInformationRequestState(data));
 }catch(error){return failure(request,error)}
}
