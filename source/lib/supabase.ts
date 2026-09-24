import {createClient} from '@supabase/supabase-js';

export function publicConfig(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
 return {url,key,ready:!!url&&!!key};
}

export function publicDb(token?:string){
 const {url,key,ready}=publicConfig();
 if(!ready)throw new Error('NOWGO 회원 데이터 연결이 필요합니다.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:token?{headers:{Authorization:`Bearer ${token}`}}:undefined});
}

export async function verifiedUser(req:Request){
 const token=req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
 if(!token)return null;
 const client=publicDb(token);
 const {data,error}=await client.auth.getUser(token);
 return error||!data.user||data.user.is_anonymous?null:{user:data.user,client};
}
