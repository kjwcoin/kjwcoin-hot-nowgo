'use client';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {publicConfig} from './auth-config';
let instance:SupabaseClient|null=null;
export function browserDb(){
 if(instance)return instance;
 const {url,key}=publicConfig();
 if(!url||!key)throw new Error('NOWGO 통합회원 연결을 준비하고 있습니다.');
 instance=createClient(url,key,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
 return instance;
}

// Restore the existing unified login through a same-site, origin-checked endpoint.
// Tokens travel in the response body, never in a URL or shared-domain cookie.
let restoring:Promise<void>|null=null;
export async function ensureUnifiedSession(){
 const db=browserDb();
 const {data}=await db.auth.getSession();
 if(data.session||!['hot.nowgo.space','sweet.nowgo.space','rich.nowgo.space'].includes(location.hostname))return;
 if(!restoring)restoring=(async()=>{
  let session:{access_token?:string;refresh_token?:string}|null=null;
  for(const origin of ['https://nowgo.space','https://www.nowgo.space']){
   const response=await fetch(origin+'/api/auth/map-session',{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(response.ok){session=await response.json();break}
   if(response.status!==401)return;
  }
  if(!session)return;
  if(!session.access_token||!session.refresh_token)return;
  // A login completed while the shared-session request was in flight takes precedence.
  if((await db.auth.getSession()).data.session)return;
  const {error}=await db.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
  if(error)throw error;
 })().finally(()=>{restoring=null});
 await restoring;
}
