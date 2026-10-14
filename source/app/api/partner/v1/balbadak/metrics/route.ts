import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { publicConfig } from '@/lib/auth-config';
export const runtime = 'nodejs';
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};const MAX_BYTES=16*1024;
function json(data:unknown,status=200){return Response.json(data,{status,headers})}
async function body(req:Request){if(!req.body)return '';const r=req.body.getReader(),a:Uint8Array[]=[];let n=0;while(true){const {done,value}=await r.read();if(done)break;n+=value.byteLength;if(n>MAX_BYTES){await r.cancel();throw Error('large')}a.push(value)}return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(a.map(x=>Buffer.from(x))))}
function valid(secret:string,req:Request,raw:string){const t=req.headers.get('x-nowgo-timestamp')??'',s=req.headers.get('x-nowgo-signature')??'';if(!/^\d{10}$/.test(t)||!/^[a-f0-9]{64}$/i.test(s)||Math.abs(Math.floor(Date.now()/1000)-Number(t))>300)return false;const e=createHmac('sha256',secret).update(`${t}.${raw}`).digest(),a=Buffer.from(s,'hex');return e.length===a.length&&timingSafeEqual(e,a)}
export async function POST(req:Request){
 const secret=process.env.BALBADAK_WEBHOOK_SECRET;if(!secret)return json({error:'발바닥 관심 집계 수신이 아직 활성화되지 않았습니다.'},503);
 let raw='';try{raw=await body(req)}catch(e){return json({error:'본문이 16KB를 넘거나 읽을 수 없습니다.'},e instanceof Error&&e.message==='large'?413:400)}
 if(!valid(secret,req,raw))return json({error:'서명이 유효하지 않거나 만료되었습니다.'},401);
 let v:Record<string,unknown>;try{v=JSON.parse(raw)}catch{return json({error:'JSON 본문이 필요합니다.'},400)}
 const id=typeof v.source_store_id==='string'?v.source_store_id.trim():'';const day=typeof v.metric_date==='string'?v.metric_date:'';const updated=typeof v.updated_at==='string'?v.updated_at:'';
 const ints=['like_count','save_count','unique_interest_count','view_count'] as const;
 if(!id||id.length>120||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(updated)))return json({error:'source_store_id, metric_date, updated_at을 확인해 주세요.'},400);
 const counts:Record<string,number|null>={};for(const k of ints){const n=v[k];if(n===undefined){counts[k]=null;continue}if(!Number.isSafeInteger(n)||Number(n)<0||Number(n)>1000000000)return json({error:`${k}는 0 이상의 정수여야 합니다.`},400);counts[k]=Number(n)}
 if(counts.like_count===null||counts.save_count===null||counts.unique_interest_count===null)return json({error:'일별 좋아요, 저장, 중복 제외 관심 사용자 집계가 필요합니다.'},400);
 try{const config=publicConfig(),key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!config.ready||!key)return json({error:'파트너 수신 설정이 완료되지 않았습니다.'},503);const db=createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await db.from('hot_partner_store_metrics').upsert({source:'balbadak',source_store_id:id,metric_date:day,...counts,source_updated_at:updated},{onConflict:'source,source_store_id,metric_date'});if(error)throw error;
  return json({accepted:true,source_store_id:id,metric_date:day},202)
 }catch(e){console.error('HOT Balbadak metrics ingest failed',e);return json({error:'발바닥 관심 집계를 HOT에 등록하지 못했습니다.'},503)}
}
