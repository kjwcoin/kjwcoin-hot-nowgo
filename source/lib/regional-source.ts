import priorReviewed from '../data/hot-regional-source-registry.json' with {type:'json'};
import sejongReviewed from '../data/hot-sejong-eight-source-registry.json' with {type:'json'};
import nextSejongReviewed from '../data/hot-sejong-next30-source-registry.json' with {type:'json'};
import next64Reviewed from '../data/hot-sejong-next64-source-registry.json' with {type:'json'};
import next47Reviewed from '../data/hot-sejong-next47-source-registry.json' with {type:'json'};
import next38Reviewed from '../data/hot-sejong-next38-source-registry.json' with {type:'json'};
import busan23Reviewed from '../data/hot-busan-archive23-source-registry.json' with {type:'json'};
import final13Reviewed from '../data/hot-sejong-final13-source-registry.json' with {type:'json'};
import route7BusanReviewed from '../data/hot-route7-busan2-registry.json' with {type:'json'};
import route7Busan8Reviewed from '../data/hot-route7-busan8-registry.json' with {type:'json'};
import route7UlsanReviewed from '../data/hot-route7-ulsan1-registry.json' with {type:'json'};
import gangwonReviewed from '../data/hot-gangwon7-registry.json' with {type:'json'};
import jeonnamReviewed from '../data/hot-jeonnam5-registry.json' with {type:'json'};
import inlandReviewed from '../data/hot-gangwon-inland8-registry.json' with {type:'json'};
import countiesReviewed from '../data/hot-jeonnam-counties3-registry.json' with {type:'json'};
const reviewed=[...priorReviewed,...sejongReviewed,...nextSejongReviewed,...next64Reviewed,...next47Reviewed,...next38Reviewed,...busan23Reviewed,...final13Reviewed,...route7BusanReviewed,...route7Busan8Reviewed,...route7UlsanReviewed,...gangwonReviewed,...jeonnamReviewed,...inlandReviewed,...countiesReviewed];
import type {PublicSourcedStore,SourcedStoreRow} from './sourced-store.ts';
/** Only public, release-reviewed facts belong here. Research packets are never imported. */
export type RegionalSourceDisclosure={
 kind:'attributed-wiki-facts'|'individual-public-facts';
 publisher:string;attribution:string;changes:string;scopeNotice:string;
 licenseUrl:string|null;revisionUrl:string|null;historyUrl:string|null;
};
export type ReviewedRegionalStore=PublicSourcedStore & {
 registrationState:'source-only';
 source:PublicSourcedStore['source'] & {disclosure:RegionalSourceDisclosure};
};
export const reviewedRegionalSources=reviewed as unknown as ReviewedRegionalStore[];
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=1000):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v).toISOString().slice(0,10)===v;
const stamp=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function sameRegionalFact(a:unknown,b:unknown):boolean{
 if(a===b)return true;
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>sameRegionalFact(v,b[i]));
 return object(a)&&object(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&sameRegionalFact(a[k],b[k]));
}
const reviewedArchiveBuildingIds:Readonly<Record<string,string>>={"archive-sejong-95eab7c0b9fe50ede57c":"3611010800100850001000008","archive-sejong-21614eeb649bd8fa08ad":"4473031025101010009000001","archive-sejong-5b044f1fa40d22e1ffa7":"3611010400105660005000001","archive-sejong-6d1f210cd98d51480e97":"3611011000106570000000001","archive-sejong-ecb297ba1d7583e0ef83":"4415035021100510006016360","archive-sejong-31bbfc925520a92da351":"4473034035100410000027551","archive-sejong-1dcfdfe9098176411591":"3611033025107270000000001","archive-busan-2338d72a80d461e66947":"2620010600102490009018999","archive-busan-ddd19c33372745272702":"2620012000104590020017732","archive-busan-342df7c0db7bd5643852":"2611010500100270002008046","archive-busan-095ffc06e11ae71f5fa6":"2620012000100620060006168","archive-busan-ee8778a865f3759664fa":"2620011100101590003002081","archive-busan-0b5da8dac84c22ce34fa":"2638010100110250016016811","archive-busan-48120eb8588552d9dd04":"2638010600104680006005581","archive-busan-631fa074103baa514bd1":"2638010300105050007011006","archive-busan-102d0460f9c50897aa35":"2614010600104110000000001","archive-busan-442faaef5df2e5f7aad0":"2614011800100170005012010","archive-busan-1391c2316594001ba09c":"2638010300104940006009860","archive-busan-c4a7ca0fe2df67db9421":"2638010100102550038002646","archive-busan-659c4ea97559770374fb":"2617010200102320007015123","archive-busan-afd160fde8e751512a88":"2617010100102240001017317","archive-busan-a12bf26bd287ca021061":"2617010100103490001003286","archive-busan-6b07f8ab91890a072c8e":"2617010200100010117005224","archive-busan-3b261218b29ad425afc1":"2617010400108300267011935","archive-busan-eacb2b7a8059c41ecf65":"2617010100112100005010982","archive-busan-42e6c629b23327891df3":"2638010200103040031034749","archive-busan-3ad00a927d459ae192fb":"2623010700102730044019074","archive-busan-c151dff9a09c81f250d6":"2623010300101680402023157","archive-busan-c897e8bcfefa1f2d6d23":"2653010600105070012016133","archive-busan-7f030f51f6cc1e17fb6b":"2653010400105600026025839"};
const reviewedRoute7FactUrls:Readonly<Record<string,string>>={"route7-bu-001":"https://dining.ayo.pe.kr/restaurant/c2ba55c0f2344315d2a1f65866ad3ca5","route7-bu-002":"https://ykm.purpleo.kr/article/26160","route7-busan-next-004":"https://xnx.purpleo.kr/article/4664","route7-busan-next-005":"https://dining.ayo.pe.kr/restaurant/7a91a60f9d624f54ced4a57cbdf98ae2","route7-busan-next-007":"https://dining.ayo.pe.kr/restaurant/af897603a59a6d84e1497064cb2a4086","route7-busan-next-002":"https://wso.purpleo.kr/article/9408","route7-busan-next-003":"https://xnx.purpleo.kr/article/4656","route7-busan-next-008":"https://smi.purpleo.kr/article/36928","route7-busan-next-009":"https://dining.ayo.pe.kr/restaurant/4360a9d0ce94537b1c2f4ec6e29982c0","route7-busan-next-010":"https://findby.co.kr/details/46272-264104205192-st-652b09638c641f9e388933ae","route7-bu-003":"https://findby.co.kr/details/44456-311104307318-st-652b33eb8c641f9e389a4b6b","route7-taebaek-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2774517","route7-gangneung-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2871190","route7-donghae-first-001":"https://tkw.purpleo.kr/article/660","route7-goseong-first-001":"https://findby.co.kr/details/24755-518204502384-st-652b10eb8c641f9e388df51e","route7-sokcho-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2837253","route7-samcheok-first-001":"https://polle.com/place/2ylATi/\uc591\ubd84\uc2dd","route7-yangyang-first-001":"https://www.tel-co.net/food/spot/8798","jeonnam-local-mokpo-pomi-pyeonghwa":"https://findby.co.kr/details/58748-121103281086-st-6a4c292d67acb17848d2270f","jeonnam-local-suncheon-baekdusan":"https://smi.purpleo.kr/article/53117","jeonnam-local-naju-taegwang-main":"https://smi.purpleo.kr/article/52988","jeonnam-local-gwangyang-hanyang":"https://triple.guide/restaurants/a75b3dbb-42f0-43fa-9d45-bf13bc00f69e","jeonnam-local-yeosu-hankkune88":"https://triple.guide/restaurants/c1c7679b-2f23-4385-94aa-dc15218dcff4","gangwon-pyeongchang-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2788239","gangwon-jeongseon-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2779432","gangwon-wonju-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2774496","gangwon-hongcheon-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2686284","gangwon-yanggu-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2807125","gangwon-hoengseong-first-001":"https://www.ktourmap.com/spotDetails.jsp?contentId=2875629","gangwon-inje-first-001":"https://polle.com/place/2iCAGt/\uc6a9\ubc14\uc704\uc2dd\ub2f9","gangwon-cheorwon-first-001":"https://ktourmap.com/spotDetails.jsp?contentId=1987131","jeonnam-local-damyang-ssangkyo-main":"https://ssangkyomall.com/store/store1.html","jeonnam-local-gangjin-gapjin":"https://triple.guide/restaurants/de7c9d41-c465-4617-9c26-115d1f1d7750","jeonnam-local-jangheung-sakgeum":"https://triple.guide/restaurants/f98f2c01-130c-4419-89cb-2aefb674c9e9"};
/** Exact supported origins, not arbitrary HTTPS/HTML. Attribution is plain text only. */
function validReviewed(store:ReviewedRegionalStore):boolean{
 const {source,coordinates,menus}=store,d=source?.disclosure;
 if(!source||!d||source.fieldProvenance||!text(store.id)||!text(store.slug,80)||!text(store.name,100)||!text(store.address,300)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(store.id)||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store.slug)||!coordinates||!Number.isFinite(coordinates.lat)||!Number.isFinite(coordinates.lon)||coordinates.lat<33||coordinates.lat>39.6||coordinates.lon<124||coordinates.lon>132||!stamp(source.checkedAt)||!(source.asOf===null||date(source.asOf)||typeof source.asOf==='string'&&/^\d{4}$/.test(source.asOf))||!text(d.publisher,150)||!text(d.attribution)||!text(d.changes)||!text(d.scopeNotice)||!Array.isArray(menus)||menus.length<1||menus.length>10)return false;
 if(store.registrationState!=='source-only'||store.indexable!==true||store.reportingState!=='pending'||store.ownership!=='unclaimed'||store.ownerClaimVerified!==false||store.pinStatus!=='gray'||store.operatingStatus!==null||store.currentMenuAvailability!==null)return false;
 if(menus.some(m=>!text(m.id,120)||!m.id.startsWith(store.sourceRef+':menu:')||!text(m.name,100)||m.price!==null||m.heat!==null||m.image!==null||m.sourceTaste!==null||m.provenance!==undefined))return false;
 if(new Set(menus.map(m=>m.id)).size!==menus.length)return false;
 if(d.kind==='attributed-wiki-facts')return /^aks-gwangju-[a-z0-9-]+$/.test(store.sourceRef)&&source.url.startsWith('https://dh.aks.ac.kr/~gwangju/wiki/index.php/')&&source.licenseName==='CC BY-SA 4.0'&&d.licenseUrl==='https://creativecommons.org/licenses/by-sa/4.0/'&&d.historyUrl===source.url.replace('index.php/','index.php?title=')+'&action=history'&&typeof d.revisionUrl==='string'&&/^https:\/\/dh\.aks\.ac\.kr\/~gwangju\/wiki\/index\.php\?title=[^&]+&oldid=\d+$/.test(d.revisionUrl);
 const mirror=/^purpleo-(qbh|xnx|smi)-(\d+)$/.exec(store.sourceRef);
 const fmr=/^purpleo-fmr-(\d+)$/.exec(store.sourceRef);
 const building=/^jusoga-building-(\d{25})-[a-f0-9]{8}$/.exec(store.sourceRef);
 const archiveBuildingId=Object.hasOwn(reviewedArchiveBuildingIds,store.sourceRef)?reviewedArchiveBuildingIds[store.sourceRef]:undefined;
 const route7Url=Object.hasOwn(reviewedRoute7FactUrls,store.sourceRef)?reviewedRoute7FactUrls[store.sourceRef]:undefined;
 const supportedFactUrl=route7Url?source.url===route7Url:archiveBuildingId?source.url.startsWith(`https://jusoga.com/b/${archiveBuildingId}/`)&&!/[?#]/.test(source.url):fmr?source.url===`https://fmr.purpleo.co.kr/view/${fmr[1]}`:mirror?source.url===`https://${mirror[1]}.purpleo.kr/article/${mirror[2]}`:Boolean(building&&source.url.startsWith(`https://jusoga.com/b/${building[1]}/`)&&!/[?#]/.test(source.url));
 return d.kind==='individual-public-facts'&&supportedFactUrl&&source.licenseName===null&&d.licenseUrl===null&&d.revisionUrl===null&&d.historyUrl===null;
}
/** Registry approval binds every displayed field, including point, licence and caveats. */
export function parseReviewedRegionalStore(row:SourcedStoreRow,registry:readonly ReviewedRegionalStore[]=reviewedRegionalSources):ReviewedRegionalStore|null{
 try{
  if(!object(row.source_metadata))return null;const meta=row.source_metadata,rights=meta.rights;
  if(!object(rights)||rights.factsStorage!==true||rights.publicDisplay!==true||meta.planet!=='hot'||!object(meta.reporting)||meta.reporting.state!=='pending'||row.owner_id!==null||row.archived_at!==null||row.trust_disabled_at!==null||typeof row.owner_penalty_points!=='number'||row.owner_penalty_points>=30||!['DISCOVERED','PUBLISHED'].includes(String(row.publication_state)))return null;
  const expected=registry.find(s=>s.sourceRef===row.source_ref);if(!expected||!validReviewed(expected))return null;
  if(!Array.isArray(meta.menus)||meta.fieldProvenance!==undefined||meta.aliasBindings!==undefined||meta.revokedMenuIds!==undefined)return null;
  const menus=meta.menus.map(m=>{if(!object(m)||m.price!=null||m.priceKrw!=null||m.heat!=null||m.heatLevel!=null||m.image!=null||m.sourceTaste!=null||m.provenance!==undefined)throw Error('unreviewed_regional_menu');return{id:m.id,name:m.name,price:null,heat:null,image:null,sourceTaste:null}});
  const projected={id:row.id,slug:row.slug,sourceRef:row.source_ref,name:row.name,address:row.address,coordinates:{lat:row.lat,lon:row.lon},menus,reportingState:'pending',indexable:true,registrationState:'source-only',ownership:'unclaimed',ownerClaimVerified:false,pinStatus:'gray',operatingStatus:null,currentMenuAvailability:null,source:{url:meta.sourceUrl,licenseName:meta.licenseName,asOf:meta.sourceAsOf,checkedAt:meta.checkedAt,disclosure:meta.disclosure}};
  return sameRegionalFact(projected,expected)?structuredClone(expected):null;
 }catch{return null}
}
/** Quarantine only malformed new rows. Established stores are never removed/relabelled. */
export function appendRegionalSourceStores(base:readonly PublicSourcedStore[],rows:readonly SourcedStoreRow[],registry:readonly ReviewedRegionalStore[]=reviewedRegionalSources){
 const stores=[...base],acceptedRows:SourcedStoreRow[]=[],rejected:string[]=[],ids=new Set(base.map(s=>s.id)),refs=new Set(base.map(s=>s.sourceRef)),slugs=new Set(base.map(s=>s.slug));
 for(const row of rows){const parsed=parseReviewedRegionalStore({...row,owner_id:row?.owner_id??null,archived_at:row?.archived_at??null,trust_disabled_at:row?.trust_disabled_at??null,owner_penalty_points:row?.owner_penalty_points??0,publication_state:row?.publication_state??'DISCOVERED'},registry);if(!parsed||ids.has(parsed.id)||refs.has(parsed.sourceRef)||slugs.has(parsed.slug)){rejected.push(typeof row?.source_ref==='string'?row.source_ref:'invalid_record');continue}stores.push(parsed);acceptedRows.push(row);ids.add(parsed.id);refs.add(parsed.sourceRef);slugs.add(parsed.slug)}
 return{stores,rejected,acceptedRows};
}
