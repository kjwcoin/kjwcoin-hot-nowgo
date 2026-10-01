import {verifiedUser} from '@/lib/supabase';
import {reply,validOrigin} from '@/lib/server';
export const dynamic='force-dynamic';
async function proxy(request:Request){
 try{
  if(request.method==='POST'&&(!request.headers.get('origin')||!validOrigin(request)))return reply(request,{error:'요청 출처를 확인해 주세요.'},403);
  const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'이 지도에서 점주 계정으로 로그인해 주세요.'},401);
  const url=new URL('https://nowgo.space/api/map-owner');
  const storeId=new URL(request.url).searchParams.get('storeId');
  if(storeId){if(!/^[a-f0-9-]{36}$/i.test(storeId))return reply(request,{error:'매장을 확인해 주세요.'},400);url.searchParams.set('storeId',storeId);}
  const headers=new Headers({Authorization:request.headers.get('authorization')!,Origin:url.origin});
  const type=request.headers.get('content-type');if(type)headers.set('Content-Type',type);
  let body:ArrayBuffer|undefined;
  if(request.method==='POST'){
   const reader=request.body?.getReader();if(!reader)return reply(request,{error:'입력한 내용을 확인해 주세요.'},400);
   const chunks:Uint8Array[]=[];let size=0;
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>6*1024*1024){await reader.cancel();return reply(request,{error:'사진은 5MB 이하로 등록해 주세요.'},413);}chunks.push(value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}body=bytes.buffer;
  }
  const response=await fetch(url,{method:request.method,headers,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('invalid response');
  return reply(request,await response.json(),response.status);
 }catch{return reply(request,{error:'매장 관리 연결을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'},503);}
}
export const GET=proxy;
export const POST=proxy;
