/** Server-only NAVER API HUB search adapter. Do not expose credentials or copy search results into permanent listings. */
import 'server-only';

export type NaverSearchKind='local'|'blog';
type SearchItem={title?:string;link?:string;description?:string;address?:string;roadAddress?:string;mapx?:string;mapy?:string;bloggername?:string;postdate?:string};
export async function naverHubSearch(kind:NaverSearchKind,query:string){
 const id=process.env.NAVER_CLIENT_ID,secret=process.env.NAVER_CLIENT_SECRET;
 if(!id||!secret)throw new Error('NAVER API HUB server credentials are not configured');
 const normalized=query.trim();
 if(normalized.length<2||normalized.length>70)throw new RangeError('Search query length must be 2-70 characters');
 const url=new URL('https://naverapihub.apigw.ntruss.com/search/v1/'+kind);
 url.searchParams.set('query',normalized);
 url.searchParams.set('display',kind==='local'?'5':'10');
 url.searchParams.set('start','1');
 url.searchParams.set('format','json');
 const response=await fetch(url,{headers:{'X-NCP-APIGW-API-KEY-ID':id,'X-NCP-APIGW-API-KEY':secret},cache:'no-store',signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw new Error('NAVER API HUB '+kind+' upstream HTTP '+response.status);
 const payload=await response.json() as {items?:SearchItem[];total?:number};
 return {kind,items:(payload.items||[]).map(item=>({
  title:String(item.title||'').replace(/<[^>]*>/g,''),
  description:String(item.description||'').replace(/<[^>]*>/g,''),
  link:String(item.link||''),address:String(item.roadAddress||item.address||''),
  mapx:item.mapx||null,mapy:item.mapy||null,postdate:item.postdate||null
 })),total:Number(payload.total||0)};
}
