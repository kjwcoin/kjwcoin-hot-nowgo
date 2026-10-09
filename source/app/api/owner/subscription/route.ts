import {verifiedUser} from '@/lib/supabase';
import {reply,validOrigin} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
import {MAP_SUBSCRIPTION_TERMS_VERSION} from '@/lib/map-subscription';
export const dynamic='force-dynamic';
async function proxy(request:Request){try{
 if(request.method==='POST'&&(!request.headers.get('origin')||!validOrigin(request)))return reply(request,{error:'요청 출처를 확인해 주세요.'},403);
 if(!await verifiedUser(request))return reply(request,{error:'점주 계정으로 로그인해 주세요.'},401);
 const url=new URL('https://nowgo-prod.vercel.app/api/owner/subscription');url.searchParams.set('product','space_map');const planet=variantForHost(new URL(request.url).hostname);url.searchParams.set('planet',planet);
 let body:string|undefined;
 if(request.method==='POST'){
  const raw=await request.text();if(raw.length>2048)return reply(request,{error:'요청이 너무 큽니다.'},413);
  const b=JSON.parse(raw);if(!b||typeof b!=='object'||!['start','refresh','cancel'].includes(b.action))return reply(request,{error:'요청을 확인해 주세요.'},400);
  if(b.action==='start'){
   if(b.consentAccepted!==true||b.consentVersion!==MAP_SUBSCRIPTION_TERMS_VERSION)return reply(request,{error:'월 8,000원 정기결제 동의를 확인해 주세요.'},400);
   const check=await fetch(url,{headers:{Authorization:request.headers.get('authorization')!},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
   const state=await check.json();if(!check.ok||state.provider!=='paddle'||state.ready!==true||state.isTest===true)return reply(request,{error:'결제를 준비 중입니다. 잠시 후 다시 확인해 주세요.'},503);
  }
  body=JSON.stringify({action:b.action,product:'space_map',planet,...(b.action==='start'?{consentAccepted:true,consentVersion:MAP_SUBSCRIPTION_TERMS_VERSION}:{})});
 }
 const response=await fetch(url,{method:request.method,headers:{Authorization:request.headers.get('authorization')!,Origin:url.origin,'Content-Type':'application/json'},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('invalid response');
 const data=await response.json();const message=String(data.error?.message??'구독 연결을 확인하지 못했어요.').replace(/paddle|패들/gi,'구독 서비스');return reply(request,response.ok?data:{error:message},response.status);
}catch{return reply(request,{error:'결제 연결을 확인하지 못했어요. 잠시 후 다시 확인해 주세요.'},503)}}
export const GET=proxy;
export const POST=proxy;

