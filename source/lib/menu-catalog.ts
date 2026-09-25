import {publicDb,publicConfig} from './supabase';
import {menusFor,type Menu} from './menus';
import type {ExperienceKey} from './experience';

type MenuRow={id:string;place_id:string;menu:string;shop:string;price:number;heat:number;flavor:string;category:string;lat:number|null;lng:number|null;address:string;observed_at:string;verified_owner:boolean;nowgo_slug:string|null};
const convert=(x:MenuRow):Menu=>({id:String(x.id),placeId:String(x.place_id),name:String(x.menu),shop:String(x.shop),price:Number(x.price),heat:Number(x.heat),flavor:String(x.flavor),category:String(x.category),image:`/api/menu-photos/${x.id}`,lat:x.lat==null?null:Number(x.lat),lng:x.lng==null?null:Number(x.lng),area:String(x.address),description:x.verified_owner?'NOWGO에서 매장 관리 권한을 확인한 점주가 직접 알려준 메뉴입니다. 현재 영업·품절 상태는 따로 확인해 주세요.':'통합회원이 알려준 메뉴입니다. 가격과 영업 상태를 방문 전에 다시 확인해 주세요.',isDemo:false,reportedAt:String(x.observed_at),verifiedOwner:!!x.verified_owner,nowgoSlug:x.nowgo_slug?String(x.nowgo_slug):null});

export type MenuSearch={page?:number;query?:string;heat?:number;maxHeat?:number;flavor?:string;category?:string;budget?:number};

export async function communityMenus(key:ExperienceKey='hot',filters:MenuSearch={}){
 if(!publicConfig().ready)return {menus:[] as Menu[],hasMore:false};
 const requestedPage=filters.page??0;
 if(!Number.isSafeInteger(requestedPage)||requestedPage<0||requestedPage>100)return {menus:[] as Menu[],hasMore:false};
 const page=requestedPage,size=100;
 const keyword=(filters.query||'').replace(/[^\p{L}\p{N}\s]/gu,'').trim().slice(0,60);
 const heat=filters.heat??0,maxHeat=filters.maxHeat??0,budget=filters.budget??0;
 const {data,error}=await publicDb().rpc('ng_public_experience_menus_page',{
  p_experience:key,p_page:page,p_query:keyword||null,
  p_heat:Number.isInteger(heat)&&heat>=1&&heat<=5?heat:null,
  p_max_heat:Number.isInteger(maxHeat)&&maxHeat>=1&&maxHeat<=5?maxHeat:null,
  p_flavor:filters.flavor&&filters.flavor!=='전체'?filters.flavor:null,
  p_category:filters.category&&filters.category!=='전체'?filters.category:null,
  p_budget:Number.isInteger(budget)&&budget>=100&&budget<=1000000?budget:null
 });
 if(error)throw error;
 const rows=(data||[]) as MenuRow[];
 return {menus:rows.slice(0,size).map(convert),hasMore:rows.length>size};
}

export async function menuById(id:string,key:ExperienceKey='hot'):Promise<Menu|null>{
 const demo=menusFor(key).find(m=>m.id===id);if(demo)return demo;
 if(!publicConfig().ready||!/^[a-f0-9-]{36}$/.test(id))return null;
 const {data,error}=await publicDb().rpc('ng_public_experience_menus_page',{p_experience:key,p_id:id}).limit(1);
 if(error)throw error;
 return data?.[0]?convert(data[0] as MenuRow):null;
}

export async function menuByPlaceId(id:string,key:ExperienceKey='hot'):Promise<Menu|null>{
 const demo=menusFor(key).find(m=>m.placeId===id);if(demo)return demo;
 if(!publicConfig().ready||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return null;
 const {data,error}=await publicDb().rpc('ng_public_experience_menus_page',{p_experience:key,p_place_id:id}).limit(1);
 if(error)throw error;
 return data?.[0]?convert(data[0] as MenuRow):null;
}
