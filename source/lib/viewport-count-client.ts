export type ViewportBounds={south:number;north:number;west:number;east:number};
export type ViewportCountState={status:'loading'}|{status:'error'}|{status:'ready';count:number;complete:boolean};
type BoundsLike={getSouthWest:()=>{getLat:()=>number;getLng:()=>number};getNorthEast:()=>{getLat:()=>number;getLng:()=>number}};
export function readViewportBounds(value:unknown):ViewportBounds|null{
 try{
  const bounds=value as BoundsLike,sw=bounds.getSouthWest(),ne=bounds.getNorthEast();
  const result={south:sw.getLat(),north:ne.getLat(),west:sw.getLng(),east:ne.getLng()};
  if(!Object.values(result).every(Number.isFinite)||result.south>=result.north||result.west>=result.east||result.south< -90||result.north>90||result.west< -180||result.east>180)return null;
  return result;
 }catch{return null}
}
export function validViewportCount(value:unknown):{count:number;complete:boolean}|null{
 if(!value||typeof value!=='object')return null;
 const item=value as {count?:unknown;complete?:unknown};
 if(typeof item.count!=='number'||!Number.isSafeInteger(item.count)||item.count<0||typeof item.complete!=='boolean')return null;
 return {count:item.count,complete:item.complete};
}

/** Latest viewport wins. No cached value is carried into a different viewport. */
export function createViewportCounter(options:{getBounds:()=>unknown;query:string;onState:(state:ViewportCountState)=>void;request?:typeof fetch;schedule?:(callback:()=>void,ms:number)=>unknown;cancel?:(timer:unknown)=>void}){
 const request=options.request??fetch;
 const schedule=options.schedule??((callback:()=>void,ms:number)=>setTimeout(callback,ms));
 const cancel=options.cancel??((timer:unknown)=>clearTimeout(timer as ReturnType<typeof setTimeout>));
 let disposed=false,sequence=0,timer:unknown,deadline:unknown,controller:AbortController|undefined;
 const clearTimers=()=>{cancel(timer);cancel(deadline)};
 const refresh=()=>{
  if(disposed)return;
  const current=++sequence;controller?.abort();clearTimers();options.onState({status:'loading'});
  timer=schedule(()=>{
   let bounds:ViewportBounds|null;
   try{bounds=readViewportBounds(options.getBounds())}catch{bounds=null}
   if(!bounds){if(!disposed&&current===sequence)options.onState({status:'error'});return}
   const abort=new AbortController();controller=abort;
   deadline=schedule(()=>abort.abort(),10000);
   const params=new URLSearchParams(options.query);
   for(const [key,value] of Object.entries(bounds))params.set(key,String(value));
   void request('/api/map-store-count?'+params,{cache:'no-store',signal:abort.signal}).then(async response=>{
    if(!response.ok)throw new Error('Count unavailable');
    const result=validViewportCount(await response.json());
    if(!result)throw new Error('Invalid count');
    if(!disposed&&current===sequence)options.onState({status:'ready',...result});
   }).catch(()=>{if(!disposed&&current===sequence)options.onState({status:'error'})}).finally(()=>{if(current===sequence)cancel(deadline)});
  },250);
 };
 return {refresh,dispose:()=>{disposed=true;sequence++;clearTimers();controller?.abort()}};
}
