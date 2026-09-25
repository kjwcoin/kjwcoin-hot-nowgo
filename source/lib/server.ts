export function config(){const chat=process.env.KAKAO_CHAT_URL||'';return {kakaoKey:process.env.KAKAO_MAP_JAVASCRIPT_KEY||'',chatUrl:/^https:\/\/(pf\.kakao\.com|open\.kakao\.com)\//.test(chat)?chat:'',places:process.env.NOWGO_PLACE_URLS||'{}'}}
export function reply(_req:Request,data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export function validOrigin(req:Request){
 const origin=req.headers.get('origin');if(!origin)return true;
 const url=new URL(req.url);if(origin===url.origin)return true;
 const host=req.headers.get('host'),proto=req.headers.get('x-forwarded-proto')||url.protocol.slice(0,-1);
 return !!host&&/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)&&['http','https'].includes(proto)&&origin===`${proto}://${host}`;
}
export function failure(req:Request,e:unknown){console.error('RICH request failed',e);return reply(req,{error:'지금 저장에 연결할 수 없어요. 입력한 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.'},503)}
