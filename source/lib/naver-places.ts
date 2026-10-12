export type NaverPlace={name:string;address:string;category:string;lat:number;lng:number;source:'naver';heatVerified:false};
const plain=(value:unknown)=>String(value??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").slice(0,300);
export function naverPlace(item:Record<string,unknown>):NaverPlace|null{
 const lat=Number(item.mapy)/10000000,lng=Number(item.mapx)/10000000;
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<33||lat>39.6||lng<124||lng>132)return null;
 const name=plain(item.title),address=plain(item.roadAddress||item.address);
 if(!name||!address||!/음식|한식|분식|중식|일식|양식|아시아|카페/.test(plain(item.category)))return null;
 return {name,address,category:plain(item.category),lat,lng,source:'naver',heatVerified:false};
}
