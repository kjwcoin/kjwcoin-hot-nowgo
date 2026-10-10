import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {menuByPlaceId} from '@/lib/menu-catalog';
import {money} from '@/lib/menus';
import {siteConfig,variantForHost} from '@/lib/site-config';
import StoreStatus from '@/components/store-status';
import RegularFavorite from '@/components/regular-favorite';
import VisitActions from '@/components/activity/visit-actions';
import BookingActions from '@/components/booking-actions';
import AppNativeSession from '@/components/app-native-session';
import AppPlaceActions from '@/components/app-place-actions';
import './place.css';
export const dynamic='force-dynamic';
export const metadata={title:'매장·메뉴 | NOWGO',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{place?:string}>}){
 const [params,h]=await Promise.all([searchParams,headers()]);const variant=variantForHost(h.get('host')),theme=siteConfig(variant);if(!params.place||!/^[a-zA-Z0-9_-]{1,100}$/.test(params.place))notFound();const menu=await menuByPlaceId(params.place,variant);if(!menu||menu.isDemo)notFound();
 return <main className="app-place" data-flavor={variant}><AppNativeSession/><img className="app-place-photo" src={menu.image} alt={menu.name}/><div className="app-place-body"><p>{menu.shop}</p><h1>{menu.name}</h1><p className="app-place-price">{money(menu.price)} · {theme.heat[menu.heat-1]}</p><p>{menu.area}</p><StoreStatus menuId={menu.id} isDemo={false} ownerRegistered={menu.ownerRegistered}/><RegularFavorite placeId={menu.placeId} slug={menu.nowgoSlug} isDemo={false}/><VisitActions placeId={menu.placeId} isDemo={false}/><div className="app-place-booking"><BookingActions placeId={menu.placeId} isDemo={false} variant={variant} storeName={menu.shop}/></div><AppPlaceActions variant={variant}/><p className="app-place-note">{menu.verifiedOwner?'공식 매장 정보입니다. 방문 전에 현재 영업·품절 상태를 확인해 주세요.':'유저가 제보한 정보입니다. 현재 영업·품절 상태는 확인되지 않았습니다.'}</p></div></main>;
}
