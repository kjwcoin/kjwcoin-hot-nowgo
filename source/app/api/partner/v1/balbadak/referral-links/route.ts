import { timingSafeEqual } from 'node:crypto';
import { signedReferralUrl } from '@/lib/partner-attribution';
const headers={'Cache-Control':'private, no-store',Vary:'Authorization','Content-Type':'application/json; charset=utf-8'};
function json(data:unknown,status=200){return Response.json(data,{status,headers})}
function authorized(req:Request){const expected=process.env.HOT_PARTNER_API_KEY,actual=req.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];if(!expected||!actual)return false;const a=Buffer.from(actual),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)}
export async function POST(request:Request){
 if(!process.env.HOT_PARTNER_API_KEY||!process.env.HOT_PARTNER_REFERRAL_SECRET)return json({error:'제휴 링크 API가 아직 활성화되지 않았습니다.'},503);
 if(!authorized(request))return json({error:'유효한 파트너 인증이 필요합니다.'},401);
 let value:unknown;try{value=await request.json()}catch{return json({error:'JSON 본문이 필요합니다.'},400)}
 if(!value||typeof value!=='object'||Array.isArray(value))return json({error:'source_store_id를 보내 주세요.'},400);
 const storeId=(value as Record<string,unknown>).source_store_id;
 if(typeof storeId!=='string'||!storeId.trim()||storeId.trim().length>120||!/^[A-Za-z0-9_-]+$/.test(storeId.trim()))return json({error:'source_store_id 형식이 올바르지 않습니다.'},400);
 const sourceStoreId=storeId.trim();
 try{return json({source_store_id:sourceStoreId,member_signup_url:signedReferralUrl(sourceStoreId,'user'),owner_signup_url:signedReferralUrl(sourceStoreId,'owner'),expires_in_seconds:30*24*60*60})}
 catch{return json({error:'제휴 링크를 만들 수 없습니다.'},503)}
}
