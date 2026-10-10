import {APP_PARENT_ORIGIN,isAppLoginChannel} from './app-embed';
export function appGeolocation():Pick<Geolocation,'getCurrentPosition'>{
 const bridge=(window as unknown as {webkit?:{messageHandlers?:{nowgo?:{postMessage:(data:unknown)=>void}}}}).webkit?.messageHandlers?.nowgo;
 if(!bridge&&window.parent===window)return navigator.geolocation;
 return {getCurrentPosition(success,error,options){
  const requestId=crypto.randomUUID();let complete=false;let timer:ReturnType<typeof setTimeout>;
  const finish=(payload:unknown)=>{if(complete||!payload||typeof payload!=='object')return;const data=payload as {requestId?:unknown;coords?:{latitude?:unknown;longitude?:unknown;accuracy?:unknown};code?:unknown};if(data.requestId!==requestId||!isAppLoginChannel(data.requestId))return;complete=true;clearTimeout(timer);window.removeEventListener('message',receive);window.removeEventListener('nowgo:location-result',native);const coords=data.coords;if(coords&&typeof coords.latitude==='number'&&typeof coords.longitude==='number'&&typeof coords.accuracy==='number'&&Number.isFinite(coords.latitude)&&Number.isFinite(coords.longitude)&&Number.isFinite(coords.accuracy)&&Math.abs(coords.latitude)<=90&&Math.abs(coords.longitude)<=180&&coords.accuracy>=0){const point={timestamp:Date.now(),coords:{latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy,altitude:null,altitudeAccuracy:null,heading:null,speed:null}} as GeolocationPosition;success(point)}else{const code=data.code===1?1:data.code===3?3:2;error?.({code,message:'Location unavailable',PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3} as GeolocationPositionError)}};
  const receive=(event:MessageEvent)=>{if(event.origin===APP_PARENT_ORIGIN&&event.source===window.parent&&event.data?.type==='nowgo:location-result')finish(event.data)};
  const native=(event:Event)=>{if(bridge)finish((event as CustomEvent).detail)};
  window.addEventListener('message',receive);window.addEventListener('nowgo:location-result',native);
  const timeout=Math.min(15000,Math.max(1000,options?.timeout??8000));timer=setTimeout(()=>finish({requestId,code:3}),timeout+1000);
  const payload={type:'nowgo:request-location',brand:location.hostname.split('.')[0],requestId,options:{enableHighAccuracy:options?.enableHighAccuracy===true,timeout,maximumAge:Math.min(60000,Math.max(0,options?.maximumAge??60000))}};
  if(bridge)bridge.postMessage(payload);else window.parent.postMessage(payload,APP_PARENT_ORIGIN);
 }};
}
