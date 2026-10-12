/** Search references only. No import, persistence, inferred menus, or ad integration. */
import 'server-only';

export type NaverSearchKind='local'|'blog';
export type NaverSearchItem={title:string;link:string;description:string;address?:string;roadAddress?:string;category?:string;telephone?:string;mapx?:string;mapy?:string;bloggername?:string;bloggerlink?:string;postdate?:string};
export type NaverSearchResult={kind:NaverSearchKind;items:NaverSearchItem[];total:number|null;provider:'NAVER API HUB'};
export class NaverSearchUnavailable extends Error{
 constructor(readonly code:'not_configured'|'upstream_unavailable'){super(code);this.name='NaverSearchUnavailable'}
}
export function naverSourceLink(value:unknown):string{
 if(typeof value!=='string')return '';
 try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?value:''}catch{return ''}
}
export async function naverHubSearch(kind:NaverSearchKind,query:string):Promise<NaverSearchResult>{
 if(kind!=='local'&&kind!=='blog')throw new RangeError('Invalid search kind');
 const normalized=query.trim();
 if(normalized.length<2||normalized.length>70)throw new RangeError('Search query length must be 2-70 characters');
 const id=process.env.NAVER_CLIENT_ID,secret=process.env.NAVER_CLIENT_SECRET;
 if(!id||!secret)throw new NaverSearchUnavailable('not_configured');
 const url=new URL('https://naverapihub.apigw.ntruss.com/search/v1/'+kind);
 url.searchParams.set('query',normalized);url.searchParams.set('display',kind==='local'?'5':'10');
 url.searchParams.set('start','1');url.searchParams.set('format','json');
 try{
  const response=await fetch(url,{headers:{'X-NCP-APIGW-API-KEY-ID':id,'X-NCP-APIGW-API-KEY':secret},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(7000)});
  if(!response.ok)throw new NaverSearchUnavailable('upstream_unavailable');
  const payload:unknown=await response.json();
  if(!payload||typeof payload!=='object'||!('items' in payload)||!Array.isArray(payload.items))throw new NaverSearchUnavailable('upstream_unavailable');
  const items=payload.items.slice(0,kind==='local'?5:10).map((raw:unknown):NaverSearchItem=>{
   if(!raw||typeof raw!=='object')throw new NaverSearchUnavailable('upstream_unavailable');
   const item=raw as Record<string,unknown>,out:NaverSearchItem={title:typeof item.title==='string'?item.title:'',description:typeof item.description==='string'?item.description:'',link:naverSourceLink(item.link)};
   // Keep provider wording/order. Render highlighted text safely in the separate UI.
   for(const key of ['address','roadAddress','category','telephone','mapx','mapy','bloggername','postdate'] as const)if(typeof item[key]==='string')out[key]=item[key];
   if(typeof item.bloggerlink==='string')out.bloggerlink=naverSourceLink(item.bloggerlink);
   return out;
  });
  const total='total' in payload&&typeof payload.total==='number'&&Number.isSafeInteger(payload.total)&&payload.total>=0?payload.total:null;
  return {kind,items,total,provider:'NAVER API HUB'};
 }catch{throw new NaverSearchUnavailable('upstream_unavailable')}
}
