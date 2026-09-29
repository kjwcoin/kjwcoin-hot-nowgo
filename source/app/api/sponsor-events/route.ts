import {verifiedUser,publicDb} from '@/lib/supabase';
import {reply,validOrigin,failure} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
import {planetForVariant} from '@/lib/activity/model';

export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{
  const planet=planetForVariant(variantForHost(req.headers.get('host')));
  const {data,error}=await publicDb().from('ng_sponsor_events')
   .select('id,planet,sponsor,title,prize_type,prize_label,eligibility,starts_at,ends_at')
   .eq('planet',planet).eq('status','active').lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString())
   .order('ends_at',{ascending:true});
  if(error)throw error;
  const auth=await verifiedUser(req);
  const {data:draws,error:historyError}=auth?await auth.client.rpc('ng_sponsor_my_draws'):{data:[],error:null};
  if(historyError)throw historyError;
  return reply(req,{events:data||[],draws:draws||[]});
 }catch(e){return failure(req,e)}
}
export async function POST(req:Request){
 if(!validOrigin(req))return reply(req,{error:'요청 출처를 확인해 주세요.'},403);
 try{
  const auth=await verifiedUser(req);if(!auth)return reply(req,{error:'로그인 후 참여해 주세요.'},401);
  const {eventId}=await req.json();
  if(typeof eventId!=='string'||!/^[0-9a-f-]{36}$/i.test(eventId))return reply(req,{error:'이벤트를 다시 선택해 주세요.'},400);
  const planet=planetForVariant(variantForHost(req.headers.get('host')));
  const {data:event,error:lookupError}=await auth.client.from('ng_sponsor_events').select('planet').eq('id',eventId).single();
  if(lookupError||event?.planet!==planet)return reply(req,{error:'이 사이트의 이벤트가 아닙니다.'},404);
  const {data,error}=await auth.client.rpc('ng_sponsor_draw',{p_event_id:eventId});
  if(error){const messages:Record<string,string>={EVENT_CLOSED:'이벤트가 종료되었습니다.',ALREADY_DRAWN:'오늘은 이미 참여했어요. 내 혜택함에서 결과를 확인해 주세요.',ACTIVITY_REQUIRED:'이벤트 시작 후 방문 인증이나 채택된 제보를 남기면 참여할 수 있어요.',LOGIN_REQUIRED:'로그인 후 참여해 주세요.'};return reply(req,{error:messages[error.message]||'추첨을 완료하지 못했습니다.'},400)}
  return reply(req,data);
 }catch(e){return failure(req,e)}
}
