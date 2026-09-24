'use client';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
let instance:SupabaseClient|null=null;
export function browserDb(){
 if(instance)return instance;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('NOWGO 통합회원 연결을 준비하고 있습니다.');
 instance=createClient(url,key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 return instance;
}
