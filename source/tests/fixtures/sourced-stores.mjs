// Synthetic contract fixtures only; never loaded into the production catalog.
export function sourceStore(n=1,extra={}){
 const sourceRef='data-go-kr-15000000-'+n;
 return {id:'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),slug:'source-store-'+n,sourceRef,name:'자료 식당 '+n,address:'서울특별시 중구 자료길 '+n,
  coordinates:{lat:37.55+n/1000,lon:126.98+n/1000},menus:[{id:sourceRef+':menu:1',name:'매운 닭발 '+n,price:null,heat:null,image:null,sourceTaste:null}],
  reportingState:'pending',indexable:false,ownership:'unclaimed',ownerClaimVerified:false,pinStatus:'gray',operatingStatus:null,currentMenuAvailability:null,
  source:{url:'https://www.data.go.kr/data/15000000/fileData.do',licenseName:'공공누리 제1유형',asOf:'2026-10-01',checkedAt:'2026-10-12T08:00:00Z'},...extra};
}
export const sixSources=Array.from({length:6},(_,index)=>sourceStore(index+1));
