import {env} from 'cloudflare:workers';
export const db=()=>{if(!env.DB)throw new Error('DB unavailable');return env.DB};export const bucket=()=>{if(!env.BUCKET)throw new Error('Storage unavailable');return env.BUCKET};
export function config(){const e=env as unknown as Record<string,string>;const chat=e.KAKAO_CHAT_URL||'';return {kakaoKey:e.KAKAO_MAP_JAVASCRIPT_KEY||'',chatUrl:/^https:\/\/(pf\.kakao\.com|open\.kakao\.com)\//.test(chat)?chat:'',places:e.NOWGO_PLACE_URLS||'{}'}}
export function session(req:Request){const id=req.headers.get('cookie')?.match(/(?:^|;\s*)hot_session=([a-f0-9-]{36})(?:;|$)/)?.[1];return {id:id??crypto.randomUUID(),fresh:!id}}
export function reply(req:Request,data:unknown,status=200,sid?:string){const h=new Headers({'Cache-Control':'no-store'});if(sid)h.set('Set-Cookie',`hot_session=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${new URL(req.url).protocol==='https:'?'; Secure':''}`);return Response.json(data,{status,headers:h})}
export function validOrigin(req:Request){return !req.headers.get('origin')||req.headers.get('origin')===new URL(req.url).origin}
export function failure(req:Request,e:unknown){console.error('HOT request failed',e);return reply(req,{error:'지금 저장에 연결할 수 없어요. 입력한 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.'},503)}
