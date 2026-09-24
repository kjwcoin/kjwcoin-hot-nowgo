import {publicDb,publicConfig} from './supabase';
import {MENUS,type Menu} from './menus';
export async function communityMenus():Promise<Menu[]>{
 if(!publicConfig().ready)return [];
 const {data,error}=await publicDb().from('hot_public_menus').select('id,place_id,menu,shop,price,heat,flavor,category,lat,lng,address,observed_at,verified_owner,nowgo_slug').order('created_at',{ascending:false}).limit(500);
 if(error)throw error;
 return (data||[]).filter(x=>String(x.address||'').includes('서해구')).map(x=>({id:String(x.id),placeId:String(x.place_id),name:String(x.menu),shop:String(x.shop),price:Number(x.price),heat:Number(x.heat),flavor:String(x.flavor),category:String(x.category),image:`/api/menu-photos/${x.id}`,lat:x.lat==null?null:Number(x.lat),lng:x.lng==null?null:Number(x.lng),area:String(x.address),description:x.verified_owner?'NOWGO에서 매장 관리 권한을 확인한 점주가 직접 알려준 메뉴입니다. 현재 영업·품절 상태는 따로 확인해 주세요.':'통합회원이 알려준 메뉴입니다. 가격과 영업 상태를 방문 전에 다시 확인해 주세요.',isDemo:false,reportedAt:String(x.observed_at),verifiedOwner:!!x.verified_owner,nowgoSlug:x.nowgo_slug?String(x.nowgo_slug):null}))
}
export async function allMenus(){return [...MENUS,...await communityMenus()]}
