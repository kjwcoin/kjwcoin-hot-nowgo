import {isKoreanCoordinate} from './korean-region.ts';
import {isValidGeoPoint,type GeoPoint} from './nearby-demo.ts';

export type LocationFailure='denied'|'timeout'|'unavailable'|'inaccurate'|'outside'|'unsupported';
export type LocationState='idle'|'locating'|'retrying'|'located'|LocationFailure;
type Result={point:GeoPoint;state:'located'}|{state:LocationFailure|'cancelled'};
type GeolocationSource=Pick<Geolocation,'getCurrentPosition'>;

export const locationStatusText:Record<LocationState,string>={
 idle:'내 위치를 확인하면 주변 15km의 메뉴를 볼 수 있어요.',
 locating:'내 위치를 확인하고 있어요. 위치 권한 창이 뜨면 허용해 주세요.',
 retrying:'위치 응답이 늦거나 부정확해 다시 확인하고 있어요.',
 located:'내 위치 기준 15km',
 denied:'위치 권한이 차단됐어요. 주소창의 사이트 설정과 기기 설정에서 위치를 허용한 뒤 다시 눌러 주세요.',
 timeout:'위치 확인 시간이 초과됐어요. 기기의 위치 서비스를 켜고 다시 시도해 주세요.',
 unavailable:'기기가 위치를 보내지 못했어요. 위치 서비스와 네트워크 연결을 확인해 주세요.',
 inaccurate:'위치 오차가 너무 커요. 기기의 정확한 위치 설정을 켠 뒤 다시 시도해 주세요.',
 outside:'국내 위치를 확인하지 못했어요. 기기의 위치 설정을 확인해 주세요.',
 unsupported:'이 환경에서는 위치를 확인할 수 없어요. 사이트를 Chrome 또는 Safari에서 직접 열어 주세요.',
};

// Keep the 5 km accuracy bound. A retry changes the acquisition options,
// never substitutes a guessed location or relaxes the land/region checks.
export async function requestCurrentLocation(geolocation:GeolocationSource,options:{isCurrent?:()=>boolean;onRetry?:()=>void}={}):Promise<Result>{
 const {isCurrent=()=>true,onRetry}=options;
 const attempt=(positionOptions:PositionOptions)=>new Promise<Result>(resolve=>{
  try{
   geolocation.getCurrentPosition(({coords})=>{
    const point={lat:coords.latitude,lng:coords.longitude};
    if(!isValidGeoPoint(point)||!Number.isFinite(coords.accuracy)||coords.accuracy<0||coords.accuracy>5000){resolve({state:'inaccurate'});return}
    if(!isKoreanCoordinate(point.lat,point.lng)){resolve({state:'outside'});return}
    resolve({state:'located',point});
   },error=>resolve({state:error.code===1?'denied':error.code===3?'timeout':'unavailable'}),positionOptions);
  }catch{resolve({state:'unavailable'})}
 });
 const first=await attempt({enableHighAccuracy:true,timeout:8000,maximumAge:60000});
 if(!isCurrent())return {state:'cancelled'};
 if(first.state==='located'||first.state==='denied')return first;
 onRetry?.();
 // A fresh precise fix can replace a stale/inaccurate result. Otherwise let
 // the browser try its normal provider when high accuracy is unavailable.
 const second=await attempt({enableHighAccuracy:first.state==='inaccurate'||first.state==='outside',timeout:15000,maximumAge:0});
 return isCurrent()?second:{state:'cancelled'};
}
