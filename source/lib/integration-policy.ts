// Pure validation shared by trusted NOWGO integration boundaries and tests.
export function nowgoUrl(raw:unknown):URL|null {
 if(typeof raw!=='string')return null;
 try{const u=new URL(raw);return u.protocol==='https:'&&['nowgo.space','www.nowgo.space'].includes(u.hostname)&&!u.username&&!u.password&&!u.port?u:null}catch{return null}
}
export function returnPath(raw:unknown){
 if(raw==='#report')return '/suggestion#report';
 if(typeof raw!=='string'||raw.length>1500||!raw.startsWith('/')||raw.startsWith('//')||/[\\\u0000-\u0020]/.test(raw))return '/';
 try{const u=new URL(raw,'https://hot.local');if(u.origin!=='https://hot.local'||!(/^(?:\/|\/map|\/suggestion|\/place\/[-a-zA-Z0-9_]{1,100})$/.test(u.pathname)))return '/';
 // Keep only display/filter state; never carry another redirect or auth material.
 for(const k of [...u.searchParams.keys()])if(!['q','taste','spice','budget','menu'].includes(k))u.searchParams.delete(k);
 if(u.hash&&!/^#[a-zA-Z0-9_-]{1,80}$/.test(u.hash))u.hash='';
 const path=u.pathname==='/map'?'/':u.pathname;
 if(path==='/'&&['#report','#owner','#photo-credits','#discover'].includes(u.hash))return '/suggestion'+u.search+u.hash;
 if(path==='/'&&u.searchParams.has('menu'))return '/suggestion'+u.search+u.hash;
 return path+u.search+u.hash;}catch{return '/'}
}
export type OfficialStatus={linked:boolean;open:string;menu:string;checkedAt:string|null;source:string;fresh:boolean;url:string|null;validUntil:string|null};
export function resolveOfficialStatus(raw:unknown,placeId:string,menuId:string,now=Date.now()):OfficialStatus {
 const unknown:OfficialStatus={linked:false,open:'확인 필요',menu:'확인 필요',checkedAt:null,source:'NOWGO 매장 연결 준비 중',fresh:false,url:null,validUntil:null};
 if(!raw||typeof raw!=='object')return unknown;
 const d=raw as Record<string,unknown>,url=nowgoUrl(d.minihome_url);
 if(d.hot_place_id!==placeId||typeof d.place_id!=='string'||!d.place_id||!url||!/^\/p\/[^/]+\/?$/.test(url.pathname))return unknown;
 const out={...unknown,linked:true,url:url.toString(),source:'NOWGO · 최신 점주 확인 필요'};
 const checked=Date.parse(String(d.observed_at)),expires=Date.parse(String(d.expires_at));
 if(d.owner_verified!==true||d.source!=='owner'||!Number.isFinite(checked)||!Number.isFinite(expires)||checked>now||expires<=now||expires<=checked||now-checked>86400000||expires-checked>86400000)return out;
 const statuses:Record<string,string>={OPEN:'영업 중',BUSY:'영업 중 · 혼잡',TEMPORARY_CLOSED:'임시 휴무',SOLD_OUT:'재료 소진 마감',CLOSED:'영업 종료',PERMANENTLY_CLOSED:'폐업'};
 out.open=statuses[String(d.status)]||'확인 필요';out.checkedAt=new Date(checked).toISOString();out.source='NOWGO · 소유권 확인 점주';out.fresh=out.open!=='확인 필요';out.validUntil=new Date(expires).toISOString();
 // A restaurant being open never establishes that this particular dish is available.
 const m=d.menu as Record<string,unknown>|undefined;
 if(m&&m.hot_menu_id===menuId){const mc=Date.parse(String(m.observed_at)),me=Date.parse(String(m.expires_at));if(Number.isFinite(mc)&&Number.isFinite(me)&&mc<=now&&me>now&&me>mc&&me-mc<=86400000&&now-mc<=86400000){out.menu=m.status==='SOLD_OUT'?'품절':m.status==='AVAILABLE'?'주문 가능':'확인 필요';out.validUntil=new Date(Math.min(expires,me)).toISOString()}}
 return out;
}
