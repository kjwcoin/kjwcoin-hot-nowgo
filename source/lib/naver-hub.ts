/** Disabled compatibility adapter. Never read credentials or contact NAVER. */
import 'server-only';

export type NaverSearchKind='local'|'blog';
export type NaverSearchItem={title:string;link:string;description:string;address?:string;roadAddress?:string;category?:string;telephone?:string;mapx?:string;mapy?:string;bloggername?:string;bloggerlink?:string;postdate?:string};
export type NaverSearchResult={kind:NaverSearchKind;items:NaverSearchItem[];total:number|null;provider:'NAVER API HUB'};
export class NaverSearchUnavailable extends Error{
 constructor(readonly code:'disabled'){super(code);this.name='NaverSearchUnavailable'}
}
export function naverSourceLink(value:unknown):string{
 if(typeof value!=='string')return '';
 try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?value:''}catch{return ''}
}
export async function naverHubSearch(kind:NaverSearchKind,query:string):Promise<NaverSearchResult>{
 // Preserve the call signature while failing closed for every input.
 void kind;void query;
 throw new NaverSearchUnavailable('disabled');
}
