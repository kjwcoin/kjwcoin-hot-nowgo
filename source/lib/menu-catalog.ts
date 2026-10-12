import {publicDb,publicConfig} from './supabase';
import {type Menu} from './menus';
import {siteConfig,type SiteVariant} from './site-config';
import {distanceKm,MAP_RADIUS_KM} from './nearby-demo';

const fields='id,place_id,menu,shop,price,heat,flavor,category,lat,lng,address,observed_at,verified_owner,nowgo_slug,owner_store_id,soldout,map_menu_photo,photo_path';
type MenuRow={id:string;place_id:string;menu:string;shop:string;price:number;heat:number;flavor:string;category:string;lat:number|null;lng:number|null;address:string;observed_at:string;verified_owner:boolean;nowgo_slug:string|null;owner_store_id:string|null;soldout:boolean;map_menu_photo:boolean;photo_path:string|null};
const convert=(x:MenuRow):Menu=>({id:String(x.id),placeId:String(x.place_id),name:String(x.menu),shop:String(x.shop),price:Number(x.price),heat:Number(x.heat),flavor:String(x.flavor),category:String(x.category),image:x.map_menu_photo&&x.photo_path?publicConfig().url+'/storage/v1/object/public/ng-map-menu-photos/'+x.photo_path:x.owner_store_id?`${process.env.NEXT_PUBLIC_NOWGO_SITE_URL||'https://nowgo-space-home.vercel.app'}/featured-menu-photo/${encodeURIComponent(x.owner_store_id)}`:`/api/menu-photos/${x.id}`,lat:x.lat==null?null:Number(x.lat),lng:x.lng==null?null:Number(x.lng),area:String(x.address),description:x.verified_owner?'NOWGO에서 매장 관리 권한을 확인한 점주가 직접 알려준 메뉴입니다. 현재 영업·품절 상태는 따로 확인해 주세요.':'통합회원이 알려준 메뉴입니다. 가격과 영업 상태를 방문 전에 다시 확인해 주세요.',isDemo:false,soldout:!!x.soldout,reportedAt:String(x.observed_at),verifiedOwner:!!x.verified_owner,ownerRegistered:!!x.verified_owner,ownerClaimVerified:!!x.verified_owner,ownerStoreId:x.owner_store_id,nowgoSlug:x.nowgo_slug?String(x.nowgo_slug):null});

async function linkedMenus(rows:MenuRow[],variant:SiteVariant):Promise<Menu[]>{
 const reported=rows.filter(row=>row.place_id.startsWith('reported-'));
 if(!reported.length)return rows.map(convert);
 const {data,error}=await publicDb().rpc('ng_map_matched_report_owners',{p_planet:variant,p_menus:reported.map(row=>row.id)});
 if(error)throw error;
 type OwnerMatch={menu_id:string;store_id:string;slug:string};
 const matches=new Map<string,OwnerMatch>(((data||[]) as OwnerMatch[]).map(row=>[row.menu_id,row]));
 return rows.map(row=>{const match=matches.get(row.id);return match?{...convert(row),ownerRegistered:true,ownerClaimVerified:true,ownerStoreId:match.store_id,nowgoSlug:match.slug,description:'소비자가 제보한 메뉴이며 상호명·주소가 일치하는 점주의 매장과 연결됐어요. 현재 영업현황은 점주가 알려줘요.'}:convert(row)});
}

export type MenuSearch={page?:number;query?:string;heat?:number;maxHeat?:number;flavor?:string;category?:string;budget?:number;lat?:number;lng?:number;radiusKm?:number};

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
 const {data:counts,error:countError}=await publicDb().rpc('ng_map_store_report_counts',{p_planet:variant});
 if(countError)throw countError;
 const totals=new Map((counts||[]).map((row:{shop_key:string;address_key:string;report_count:number})=>[row.shop_key+'\0'+row.address_key,Number(row.report_count)]));
 const visible=rows.slice(0,size).filter(row=>!['나우고','나우고 카페'].includes(row.shop.trim()));
 const linked=await linkedMenus(visible,variant);
 return {menus:linked.map(menu=>{const scope=menu.shop.trim().toLocaleLowerCase()+'\0'+menu.area.replace(/\s/g,'').toLocaleLowerCase();return {...menu,reportCount:totals.get(scope)??0,reportCountScope:scope,reportCountIsMinimum:true}}),hasMore:rows.length>size};
}

export async function menuById(id:string,variant:SiteVariant='hot'):Promise<Menu|null>{

 if(!publicConfig().ready||!/^[a-f0-9-]{36}$/.test(id))return null;
 const {data,error}=await publicDb().from(siteConfig(variant).tables.menus).select(fields).eq('id',id).maybeSingle();
 if(error)throw error;
 return data&&!['나우고','나우고 카페'].includes(String(data.shop).trim())?(await linkedMenus([data as MenuRow],variant))[0]:null;
}

export async function menuByPlaceId(id:string,variant:SiteVariant='hot'):Promise<Menu|null>{

 if(!publicConfig().ready||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return null;
 const {data,error}=await publicDb().from(siteConfig(variant).tables.menus).select(fields).eq('place_id',id).order('created_at',{ascending:false}).limit(1);
 if(error)throw error;
 return data?.[0]&&!['나우고','나우고 카페'].includes(String(data[0].shop).trim())?(await linkedMenus([data[0] as MenuRow],variant))[0]:null;
}
