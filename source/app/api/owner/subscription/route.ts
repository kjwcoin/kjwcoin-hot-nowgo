import {verifiedUser} from '@/lib/supabase';
import {reply,validOrigin} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
export const dynamic='force-dynamic';
async function proxy(request:Request){try{
 if(request.method==='POST'&&(!request.headers.get('origin')||!validOrigin(request)))return reply(request,{error:'요청 출처를 확인해 주세요.'},403);
 if(!await verifiedUser(request))return reply(request,{error:'점주 계정으로 로그인해 주세요.'},401);
 const url=new URL('https://nowgo.space/api/owner/subscription');url.searchParams.set('product','space_map');const planet=variantForHost(new URL(request.url).hostname);url.searchParams.set('planet',planet);
 let body:string|undefined;
 if(request.method==='POST'){
  const raw=await request.text();if(raw.length>2048)return reply(request,{error:'요청이 너무 큽니다.'},413);
  const b=JSON.parse(raw);if(!b||typeof b!=='object'||!['start','refresh','cancel'].includes(b.action))return reply(request,{error:'요청을 확인해 주세요.'},400);
  body=JSON.stringify({action:b.action,product:'space_map',planet,...(b.action==='start'?{consentAccepted:b.consentAccepted,consentVersion:b.consentVersion}:{})});
 }
 const response=await fetch(url,{method:request.method,headers:{Authorization:request.headers.get('authorization')!,Origin:url.origin,'Content-Type':'application/json'},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('invalid response');
 const data=await response.json();return reply(request,response.ok?data:{error:data.error?.message??'결제 연결을 확인하지 못했어요.'},response.status);
}catch{return reply(request,{error:'결제 연결을 확인하지 못했어요. 잠시 후 다시 확인해 주세요.'},503)}}
export const GET=proxy;
export const POST=proxy;

