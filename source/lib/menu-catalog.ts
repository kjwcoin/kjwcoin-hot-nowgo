import {publicDb,publicConfig} from './supabase';
import {MENUS,type Menu} from './menus';

const fields='id,place_id,menu,shop,price,heat,flavor,category,lat,lng,address,observed_at,verified_owner,nowgo_slug';
type MenuRow={id:string;place_id:string;menu:string;shop:string;price:number;heat:number;flavor:string;category:string;lat:number|null;lng:number|null;address:string;observed_at:string;verified_owner:boolean;nowgo_slug:string|null};
const convert=(x:MenuRow):Menu=>({id:String(x.id),placeId:String(x.place_id),name:String(x.menu),shop:String(x.shop),price:Number(x.price),heat:Number(x.heat),flavor:String(x.flavor),category:String(x.category),image:`/api/menu-photos/${x.id}`,lat:x.lat==null?null:Number(x.lat),lng:x.lng==null?null:Number(x.lng),area:String(x.address),description:x.verified_owner?'NOWGO에서 매장 관리 권한을 확인한 점주가 직접 알려준 메뉴입니다. 현재 영업·품절 상태는 따로 확인해 주세요.':'통합회원이 알려준 메뉴입니다. 가격과 영업 상태를 방문 전에 다시 확인해 주세요.',isDemo:false,reportedAt:String(x.observed_at),verifiedOwner:!!x.verified_owner,nowgoSlug:x.nowgo_slug?String(x.nowgo_slug):null});

export type MenuSearch={page?:number;query?:string;heat?:number;maxHeat?:number;flavor?:string;category?:string;budget?:number;lat?:number;lng?:number;radiusKm?:number};

export async function communityMenus(filters:MenuSearch={}){
 if(!publicConfig().ready)return {menus:[] as Menu[],hasMore:false};
 const requestedPage=filters.page??0;
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>=0?Math.min(requestedPage,10000):0,size=100;
 let request=publicDb().from('sweet_public_menus').select(fields);
 const keyword=(filters.query||'').replace(/[^\p{L}\p{N}\s]/gu,'').trim().slice(0,60);
 if(keyword)request=request.or(`menu.ilike.%${keyword}%,shop.ilike.%${keyword}%,address.ilike.%${keyword}%`);
 const heat=filters.heat??0,maxHeat=filters.maxHeat??0,budget=filters.budget??0;
 if(Number.isInteger(heat)&&heat>=1&&heat<=5)request=request.eq('heat',heat);
 if(Number.isInteger(maxHeat)&&maxHeat>=1&&maxHeat<=5)request=request.lte('heat',maxHeat);
 if(filters.flavor&&filters.flavor!=='전체')request=request.eq('flavor',filters.flavor);
 if(filters.category&&filters.category!=='전체')request=request.eq('category',filters.category);
 if(Number.isInteger(budget)&&budget>=100&&budget<=1000000)request=request.lte('price',budget);
 const lat=filters.lat,lng=filters.lng,radius=Math.min(Math.max(filters.radiusKm??30,1),100);
 const hasPoint=Number.isFinite(lat)&&Number.isFinite(lng)&&lat!>=33&&lat!<=39.6&&lng!>=124&&lng!<=132;
 if(hasPoint){
  const latDelta=radius/111;
  const lngDelta=radius/(111*Math.max(Math.cos((lat!*Math.PI)/180),0.2));
  request=request.gte('lat',lat!-latDelta).lte('lat',lat!+latDelta).gte('lng',lng!-lngDelta).lte('lng',lng!+lngDelta);
 }
 const {data,error}=await request.order('created_at',{ascending:false}).range(page*size,page*size+size);
 if(error)throw error;
 let rows=(data||[]) as MenuRow[];
 if(hasPoint){
  const toRad=(v:number)=>v*Math.PI/180;
  const d=(x:MenuRow)=>{
   if(x.lat==null||x.lng==null)return Infinity;
   const dLat=toRad(Number(x.lat)-lat!),dLng=toRad(Number(x.lng)-lng!);
   const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat!))*Math.cos(toRad(Number(x.lat)))*Math.sin(dLng/2)**2;
   return 6371*2*Math.asin(Math.sqrt(a));
  };
  rows=rows.filter(x=>d(x)<=radius).sort((a,b)=>d(a)-d(b));
 }
 return {menus:rows.slice(0,size).map(convert),hasMore:rows.length>size};
}

export async function menuById(id:string):Promise<Menu|null>{
 const demo=MENUS.find(m=>m.id===id);if(demo)return demo;
 if(!publicConfig().ready||!/^[a-f0-9-]{36}$/.test(id))return null;
 const {data,error}=await publicDb().from('sweet_public_menus').select(fields).eq('id',id).maybeSingle();
 if(error)throw error;
 return data?convert(data as MenuRow):null;
}

export async function menuByPlaceId(id:string):Promise<Menu|null>{
 const demo=MENUS.find(m=>m.placeId===id);if(demo)return demo;
 if(!publicConfig().ready||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return null;
 const {data,error}=await publicDb().from('sweet_public_menus').select(fields).eq('place_id',id).order('created_at',{ascending:false}).limit(1);
 if(error)throw error;
 return data?.[0]?convert(data[0] as MenuRow):null;
}
