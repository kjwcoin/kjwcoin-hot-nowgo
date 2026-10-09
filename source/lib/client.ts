import {browserDb,ensureUnifiedSession} from './supabase-browser';
export class ApiError extends Error {
 constructor(message:string,readonly status:number,readonly code?:string,readonly details?:Record<string,unknown>){super(message);this.name='ApiError'}
}
export async function api<T=Record<string,unknown>>(path:string,options?:RequestInit){
 const headers=new Headers(options?.headers);
 try{await ensureUnifiedSession();const {data}=await browserDb().auth.getSession();if(data.session?.access_token)headers.set('Authorization','Bearer '+data.session.access_token)}catch{}
 const r=await fetch(path,{...options,headers});const d=await r.json() as {error?:string;code?:string}&Record<string,unknown>;if(!r.ok)throw new ApiError(d.error||'잠시 후 다시 시도해 주세요.',r.status,d.code,d);return d as T
}
export function track(event:string,target:string){void api('/api/activity/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,target}),keepalive:true}).then(()=>window.dispatchEvent(new Event('nowgo-activity-change'))).catch(()=>{})}
export function uuid(){if(crypto.randomUUID)return crypto.randomUUID();return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^(crypto.getRandomValues(new Uint8Array(1))[0]&(15>>(Number(c)/4)))).toString(16))}
