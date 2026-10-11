import {reply,validOrigin,failure} from '@/lib/server';
import {publicDb,verifiedUser} from '@/lib/supabase';
import {variantForHost} from '@/lib/site-config';

export async function GET(request:Request){
 try{
  const id=new URL(request.url).searchParams.get('menuId');
  if(!id||!/^[a-f0-9-]{36}$/i.test(id))return reply(request,{error:'매장을 다시 선택해 주세요.'},400);
  const auth=await verifiedUser(request);
  const {data,error}=await (auth?.client||publicDb()).rpc('ng_map_owner_join_request_state',{p_planet:variantForHost(request.headers.get('host')),p_menu:id});
  if(error)throw error;
  return reply(request,data);
 }catch(error){return failure(request,error)}
}
export async function POST(request:Request){
 if(!validOrigin(request))return reply(request,{error:'요청 출처를 확인해 주세요.'},403);
 try{
  const auth=await verifiedUser(request);
  if(!auth)return reply(request,{error:'로그인하고 점주 가입을 요청해 주세요.',code:'login_required'},401);
  let body:unknown;try{body=await request.json()}catch{return reply(request,{error:'매장을 다시 선택해 주세요.'},400)}
  const id=body&&typeof body==='object'&&'menuId'in body?body.menuId:null;
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))return reply(request,{error:'매장을 다시 선택해 주세요.'},400);
  const {data,error}=await auth.client.rpc('ng_map_request_owner_join',{p_planet:variantForHost(request.headers.get('host')),p_menu:id});
  if(error){if(error.message.includes('owner_already_registered'))return reply(request,{error:'이미 점주가 가입한 매장입니다.'},409);if(error.message.includes('store_not_found'))return reply(request,{error:'공개된 매장을 찾을 수 없어요.'},404);throw error}
  return reply(request,data);
 }catch(error){return failure(request,error)}
}
