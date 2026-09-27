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
