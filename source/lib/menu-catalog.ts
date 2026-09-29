import {publicDb,publicConfig} from './supabase';
import {type Menu} from './menus';
import {siteConfig,type SiteVariant} from './site-config';
import {distanceKm,MAP_RADIUS_KM} from './nearby-demo';

const fields='id,place_id,menu,shop,price,heat,flavor,category,lat,lng,address,observed_at,verified_owner,nowgo_slug,photo_path';
type MenuRow={id:string;place_id:string;menu:string;shop:string;price:number;heat:number;flavor:string;category:string;lat:number|null;lng:number|null;address:string;observed_at:string;verified_owner:boolean;nowgo_slug:string|null;photo_path:string};
const convert=(x:MenuRow,featured=false):Menu=>({id:String(x.id),placeId:String(x.place_id),name:String(x.menu),shop:String(x.shop),price:Number(x.price),heat:Number(x.heat),flavor:String(x.flavor),category:String(x.category),image:featured?`${publicConfig().url}/storage/v1/object/public/owner-featured-menus/${x.photo_path.split('/').map(encodeURIComponent).join('/')}`:`/api/menu-photos/${x.id}`,lat:x.lat==null?null:Number(x.lat),lng:x.lng==null?null:Number(x.lng),area:String(x.address),description:featured?'점주가 선택한 대표 메뉴입니다. 현재 영업·품절 상태는 매장 미니홈피에서 확인해 주세요.':x.verified_owner?'NOWGO에서 매장 관리 권한을 확인한 점주가 직접 알려준 메뉴입니다. 현재 영업·품절 상태는 따로 확인해 주세요.':'통합회원이 알려준 메뉴입니다. 가격과 영업 상태를 방문 전에 다시 확인해 주세요.',isDemo:false,reportedAt:String(x.observed_at),verifiedOwner:!!x.verified_owner,nowgoSlug:x.nowgo_slug?String(x.nowgo_slug):null});

export type MenuSearch={page?:number;query?:string;heat?:number;maxHeat?:number;flavor?:string;category?:string;budget?:number;lat?:number;lng?:number;radiusKm?:number};

async function featuredMenus(filters:MenuSearch,variant:SiteVariant,keyword:string,point:{lat:number;lng:number}|null,radius:number){
 if((filters.page??0)>0 || filters.flavor&&filters.flavor!=='전체' || filters.category&&filters.category!=='전체')return [] as Menu[];
 let request=publicDb().from('owner_featured_public_menus').select(fields).eq('planet',variant);
 if(keyword)request=request.or(`menu.ilike.%${keyword}%,shop.ilike.%${keyword}%,address.ilike.%${keyword}%`);
 const heat=filters.heat??0,maxHeat=filters.maxHeat??0,budget=filters.budget??0;
 if(Number.isInteger(heat)&&heat>=1&&heat<=5)request=request.eq('heat',heat);
 if(Number.isInteger(maxHeat)&&maxHeat>=1&&maxHeat<=5)request=request.lte('heat',maxHeat);
 if(Number.isInteger(budget)&&budget>=100&&budget<=1000000)request=request.lte('price',budget);
 if(point){
  const latDelta=radius/111,lngDelta=radius/(111*Math.max(Math.cos(point.lat*Math.PI/180),0.2));
  request=request.gte('lat',point.lat-latDelta).lte('lat',point.lat+latDelta).gte('lng',point.lng-lngDelta).lte('lng',point.lng+lngDelta);
 }
 const {data,error}=await request.order('created_at',{ascending:false}).limit(100);
 if(error)throw error;
 return ((data||[]) as MenuRow[]).filter(row=>!point||row.lat!==null&&row.lng!==null&&distanceKm(point,{lat:row.lat,lng:row.lng})<=radius).map(row=>convert(row,true));
}

export async function communityMenus(filters:MenuSearch={},variant:SiteVariant='hot'){
 if(!publicConfig().ready)return {menus:[] as Menu[],hasMore:false};
 const requestedPage=filters.page??0;
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>=0?Math.min(requestedPage,10000):0,size=100;
 let request=publicDb().from(siteConfig(variant).tables.menus).select(fields);
 const keyword=(filters.query||'').replace(/[^\p{L}\p{N}\s]/gu,'').trim().slice(0,60);
 if(keyword)request=request.or(`menu.ilike.%${keyword}%,shop.ilike.%${keyword}%,address.ilike.%${keyword}%`);
 const heat=filters.heat??0,maxHeat=filters.maxHeat??0,budget=filters.budget??0;
 if(Number.isInteger(heat)&&heat>=1&&heat<=5)request=request.eq('heat',heat);
 if(Number.isInteger(maxHeat)&&maxHeat>=1&&maxHeat<=5)request=request.lte('heat',maxHeat);
 if(filters.flavor&&filters.flavor!=='전체')request=request.eq('flavor',filters.flavor);
 if(filters.category&&filters.category!=='전체')request=request.eq('category',filters.category);
 if(Number.isInteger(budget)&&budget>=100&&budget<=1000000)request=request.lte('price',budget);
 const radius=Math.min(Math.max(filters.radiusKm||MAP_RADIUS_KM,1),MAP_RADIUS_KM);
 const lat=filters.lat,lng=filters.lng;
 const point=typeof lat==='number'&&typeof lng==='number'&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=33&&lat<=39.6&&lng>=124&&lng<=132?{lat,lng}:null;
 if(point){
  const latDelta=radius/111,lngDelta=radius/(111*Math.max(Math.cos(point.lat*Math.PI/180),0.2));
  request=request.gte('lat',point.lat-latDelta).lte('lat',point.lat+latDelta).gte('lng',point.lng-lngDelta).lte('lng',point.lng+lngDelta);
 }
 const {data,error}=await request.order('created_at',{ascending:false}).range(page*size,page*size+size);
 if(error)throw error;
 const rows=((data||[]) as MenuRow[]).filter(row=>!point||row.lat!==null&&row.lng!==null&&distanceKm(point,{lat:row.lat,lng:row.lng})<=radius);
 const featured=await featuredMenus(filters,variant,keyword,point,radius);
 return {menus:[...featured,...rows.slice(0,size).map(row=>convert(row))],hasMore:rows.length>size};
}

export async function menuById(id:string,variant:SiteVariant='hot'):Promise<Menu|null>{
 const demo=siteConfig(variant).menus.find(m=>m.id===id);if(demo)return demo;
 if(!publicConfig().ready||!/^[a-f0-9-]{36}$/.test(id))return null;
 const {data:featured,error:featuredError}=await publicDb().from('owner_featured_public_menus').select(fields).eq('planet',variant).eq('id',id).maybeSingle();
 if(featuredError)throw featuredError;
 if(featured)return convert(featured as MenuRow,true);
 const {data,error}=await publicDb().from(siteConfig(variant).tables.menus).select(fields).eq('id',id).maybeSingle();
 if(error)throw error;
 return data?convert(data as MenuRow):null;
}

export async function menuByPlaceId(id:string,variant:SiteVariant='hot'):Promise<Menu|null>{
 const demo=siteConfig(variant).menus.find(m=>m.placeId===id);if(demo)return demo;
 if(!publicConfig().ready||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return null;
 const {data:featured,error:featuredError}=await publicDb().from('owner_featured_public_menus').select(fields).eq('planet',variant).eq('place_id',id).limit(1);
 if(featuredError)throw featuredError;
 if(featured?.[0])return convert(featured[0] as MenuRow,true);
 const {data,error}=await publicDb().from(siteConfig(variant).tables.menus).select(fields).eq('place_id',id).order('created_at',{ascending:false}).limit(1);
 if(error)throw error;
 return data?.[0]?convert(data[0] as MenuRow):null;
}
