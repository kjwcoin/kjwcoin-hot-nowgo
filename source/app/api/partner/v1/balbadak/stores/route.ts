import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { publicConfig } from '@/lib/auth-config';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };
const MAX_BYTES = 16 * 1024;
function json(data: unknown, status = 200) { return Response.json(data, { status, headers }); }
async function readBody(request: Request) {
  if (!request.body) return '';
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_BYTES) { await reader.cancel(); throw Error('large'); } chunks.push(value); }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks.map(c => Buffer.from(c))));
}
function authenticated(secret: string, req: Request, raw: string) {
  const timestamp = req.headers.get('x-nowgo-timestamp') ?? '', sig = req.headers.get('x-nowgo-signature') ?? '';
  if (!/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(sig) || Math.abs(Math.floor(Date.now()/1000)-Number(timestamp))>300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest(), actual = Buffer.from(sig,'hex');
  return expected.length === actual.length && timingSafeEqual(expected,actual);
}
const text=(v:unknown,max:number)=>{if(typeof v!=='string'||v.length>max)return null;const s=v.trim();return s||null};
export async function POST(request: Request) {
  const secret=process.env.BALBADAK_WEBHOOK_SECRET;
  if(!secret)return json({error:'발바닥 매장 수신이 아직 활성화되지 않았습니다.'},503);
  let raw='';try{raw=await readBody(request)}catch(e){return json({error:'본문이 16KB를 넘거나 읽을 수 없습니다.'},e instanceof Error&&e.message==='large'?413:400)}
  if(!authenticated(secret,request,raw))return json({error:'서명이 유효하지 않거나 만료되었습니다.'},401);
  let v:Record<string,unknown>;try{v=JSON.parse(raw)}catch{return json({error:'JSON 본문이 필요합니다.'},400)}
  const source_store_id=text(v.source_store_id,120),store_name=text(v.store_name,160),registered_at=text(v.registered_at,40),updated_at=text(v.updated_at,40);
  const latitude=Number(v.latitude),longitude=Number(v.longitude);
  const address=v.address===undefined?null:text(v.address,300);
  if(!source_store_id||!store_name||!registered_at||!updated_at||(v.address!==undefined&&!address)||!Number.isFinite(Date.parse(registered_at))||!Number.isFinite(Date.parse(updated_at))||!Number.isFinite(latitude)||latitude< -90||latitude>90||!Number.isFinite(longitude)||longitude< -180||longitude>180)
    return json({error:'source_store_id, store_name, 좌표, 등록일, 수정일을 확인해 주세요.'},400);
  try{
    const config=publicConfig(),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!config.ready||!key)return json({error:'파트너 수신 설정이 완료되지 않았습니다.'},503);
    const db=createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {error}=await db.from('hot_partner_stores').upsert({source:'balbadak',source_store_id,store_name,latitude,longitude,source_created_at:registered_at,source_updated_at:updated_at,derived_address:address},{onConflict:'source,source_store_id'});
    if(error)throw error;
    return json({accepted:true,source_store_id,match_status:'unmatched'},202);
  }catch(e){console.error('HOT Balbadak store ingest failed',e);return json({error:'발바닥 매장 정보를 HOT에 등록하지 못했습니다.'},503)}
}
