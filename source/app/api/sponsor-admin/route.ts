import {z} from 'zod';
import {verifiedUser} from '@/lib/supabase';
import {reply,validOrigin,failure} from '@/lib/server';

export const dynamic='force-dynamic';
const eventSchema=z.object({planet:z.enum(['hot','sweet','chewy']),sponsor:z.string().trim().min(1).max(100),title:z.string().trim().min(1).max(150),prize_type:z.enum(['discount','ticket','voucher']),prize_label:z.string().trim().min(1).max(150),eligibility:z.enum(['login','verified_activity']),win_rate:z.number().int().min(0).max(10000),starts_at:z.string().datetime(),ends_at:z.string().datetime()}).refine(x=>new Date(x.ends_at)>new Date(x.starts_at));
async function admin(req:Request){const auth=await verifiedUser(req);if(!auth)return null;const {data,error}=await auth.client.rpc('is_admin');return error||data!==true?null:auth.client}
export async function GET(req:Request){
 try{const db=await admin(req);if(!db)return reply(req,{error:'관리자 권한이 필요합니다.'},403);
  const [{data:events,error:eventError},{data:prizes,error:prizeError},{data:draws,error:drawError}]=await Promise.all([
   db.from('ng_sponsor_events').select('*').order('created_at',{ascending:false}),
   db.from('ng_sponsor_prizes').select('id,event_id,claimed_by'),
   db.from('ng_sponsor_draws').select('id,event_id,prize_id,local_day,created_at').order('created_at',{ascending:false}).limit(500)
  ]);
  if(eventError||prizeError||drawError)throw eventError||prizeError||drawError;
  return reply(req,{events:events||[],prizes:prizes||[],draws:draws||[]});
 }catch(e){return failure(req,e)}
}
export async function POST(req:Request){
 if(!validOrigin(req))return reply(req,{error:'요청 출처를 확인해 주세요.'},403);
 try{const db=await admin(req);if(!db)return reply(req,{error:'관리자 권한이 필요합니다.'},403);
  const body=await req.json();
  if(body.action==='create'){
   const parsed=eventSchema.safeParse(body.event);if(!parsed.success)return reply(req,{error:'이벤트 내용을 확인해 주세요.'},400);
   const {data,error}=await db.from('ng_sponsor_events').insert(parsed.data).select('id').single();if(error)throw error;
   return reply(req,{id:data.id},201);
  }
  if(body.action==='codes'){
   if(typeof body.eventId!=='string'||!Array.isArray(body.codes)||body.codes.length>500)return reply(req,{error:'코드는 한 번에 최대 500개까지 등록해 주세요.'},400);
   const codes=body.codes.map((x:unknown)=>String(x).trim());
   if(!codes.length||codes.some((x:string)=>!x||x.length>200)||new Set(codes).size!==codes.length)return reply(req,{error:'중복되거나 잘못된 코드가 있어요.'},400);
   const {data:event}=await db.from('ng_sponsor_events').select('status').eq('id',body.eventId).single();
   if(!event||event.status==='active')return reply(req,{error:'코드는 이벤트를 일시 중지한 뒤 등록해 주세요.'},400);
   const {error}=await db.from('ng_sponsor_prizes').insert(codes.map((code:string)=>({event_id:body.eventId,code})));if(error)throw error;
   return reply(req,{added:codes.length});
  }
  if(body.action==='status'){
   if(typeof body.eventId!=='string'||!['active','paused','draft'].includes(body.status))return reply(req,{error:'상태를 확인해 주세요.'},400);
   const {data:event}=await db.from('ng_sponsor_events').select('starts_at,ends_at').eq('id',body.eventId).single();if(!event)return reply(req,{error:'이벤트를 찾을 수 없어요.'},404);
   if(body.status==='active'){
    const {count,error:countError}=await db.from('ng_sponsor_prizes').select('id',{count:'exact',head:true}).eq('event_id',body.eventId).is('claimed_by',null);
    if(countError)throw countError;
    if(!count||new Date(event.ends_at)<=new Date())return reply(req,{error:'미사용 코드와 남은 행사 기간을 확인해 주세요.'},400);
   }
   const {error}=await db.from('ng_sponsor_events').update({status:body.status}).eq('id',body.eventId);if(error)throw error;
   return reply(req,{status:body.status});
  }
  return reply(req,{error:'요청을 확인해 주세요.'},400);
 }catch(e){return failure(req,e)}
}
