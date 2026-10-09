import type {User} from '@supabase/supabase-js';

// Space's existing registration API reads an SSR cookie. This adapts the map's
// already verified Bearer session; Space validates the same JWT again.
export async function ownerSignupRequest(request:Request,user:User,path:string,body:unknown,method='POST'){
 if(!/^\/api\/(nowgo\/business-verification|owner\/featured-menu)$/.test(path))throw Error('invalid_bridge_path');
 const token=request.headers.get('authorization')?.slice(7);if(!token)throw Error('login_required');
 const payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()) as {exp:number};
 const session={access_token:token,refresh_token:'',token_type:'bearer',expires_in:Math.max(0,payload.exp-Math.floor(Date.now()/1000)),expires_at:payload.exp,user:{id:user.id,aud:user.aud,role:user.role,email:user.email,app_metadata:user.app_metadata,user_metadata:{}}};
 const value='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),key='sb-tdkjdukblopypgoecuhh-auth-token';
 const parts=value.length<=3180?[key+'='+value]:Array.from({length:Math.ceil(value.length/3180)},(_,i)=>key+'.'+i+'='+value.slice(i*3180,(i+1)*3180));
 const multipart=body instanceof FormData;
 const response=await fetch('https://nowgo.space'+path,{method,headers:{Origin:'https://nowgo.space',Cookie:parts.join('; '),Authorization:'Bearer '+token,...(multipart?{}:{'Content-Type':'application/json'})},body:multipart?body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!response.headers.get('content-type')?.includes('application/json'))throw Error('registration_unavailable');
 const data=await response.json();if(!response.ok)throw Error(typeof data.error==='string'?data.error:data.error?.message||'매장 등록 연결을 확인해 주세요.');return data;
}
