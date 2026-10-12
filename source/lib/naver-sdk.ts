/* eslint-disable @typescript-eslint/no-explicit-any */
let sdkPromise:Promise<any>|null=null,attempt=0;
export function loadNaverSdk(key:string){
 if(sdkPromise)return sdkPromise;
 sdkPromise=new Promise((resolve,reject)=>{
  const scope=window as unknown as Record<string,any>,script=document.createElement('script'),callback='nowgoNaverMapsReady'+(++attempt);
  const clear=()=>{clearTimeout(timer);delete scope[callback]};
  const fail=(message:string)=>{clear();script.remove();reject(new Error(message))};
  const timer=setTimeout(()=>fail('NAVER Map SDK timed out'),10000);
  const ready=()=>{if(!scope.naver?.maps?.Map||!scope.naver.maps.Service){fail('NAVER Map SDK is unavailable');return}clear();resolve(scope.naver)};
  if(scope.naver?.maps?.Map&&scope.naver.maps.Service){ready();return}
  scope[callback]=ready;
  scope.navermap_authFailure=()=>{scope.dispatchEvent(new Event('nowgo:naver-auth-failed'));fail('NAVER map authorization failed')};
  script.src=`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}&submodules=geocoder&callback=${callback}`;
  script.async=true;
  // The base script's load event precedes asynchronous geocoder loading.
  // NAVER invokes callback only after all requested submodules have loaded.
  script.onerror=()=>fail('NAVER Map SDK load failed');document.head.appendChild(script);
 }).catch(error=>{sdkPromise=null;throw error});
 return sdkPromise;
}
