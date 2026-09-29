import {demoLandCandidates,hasVerifiedLandParcel,type GeoPoint} from './nearby-demo.ts';
import {isKoreanCoordinate} from './korean-region.ts';

export type DemoLocationState='loading'|'ready'|'empty'|'error';
type Geocoder={coord2Address:(lng:number,lat:number,callback:(results:unknown[],status:string)=>void)=>void};
type Lookup='land'|'empty'|'error';

export async function resolveDemoLand(origin:GeoPoint,geocoder:Geocoder,options:{isCurrent?:()=>boolean;timeoutMs?:number}={}):Promise<{points:GeoPoint[];state:DemoLocationState}>{
 const {isCurrent=()=>true,timeoutMs=2500}=options;
 if(!isKoreanCoordinate(origin.lat,origin.lng))return {points:[],state:'error'};
 const lookup=(point:GeoPoint)=>new Promise<Lookup>(resolve=>{
  const timer=setTimeout(()=>resolve('error'),timeoutMs);
  try{
   geocoder.coord2Address(point.lng,point.lat,(results,status)=>{
    clearTimeout(timer);
    const address=(results?.[0] as {address?:unknown}|undefined)?.address;
    resolve(status==='OK'?(hasVerifiedLandParcel(address)?'land':'empty'):status==='ZERO_RESULT'?'empty':'error');
   });
  }catch{clearTimeout(timer);resolve('error')}
 });
 const points:GeoPoint[]=[];
 let hadError=false;
 const candidates=demoLandCandidates(origin);
 for(let index=0;index<candidates.length&&points.length<3;index+=4){
  if(!isCurrent())return {points:[],state:'error'};
  const batch=candidates.slice(index,index+4);
  const results=await Promise.all(batch.map(async point=>{
   const first=await lookup(point);
   return first==='error'&&isCurrent()?lookup(point):first;
  }));
  if(!isCurrent())return {points:[],state:'error'};
  batch.forEach((point,i)=>{if(results[i]==='land'&&points.length<3)points.push(point)});
  hadError ||= results.includes('error');
  // Stop a provider outage after one retried batch instead of issuing 64 failing requests.
  if(results.every(result=>result==='error'))break;
 }
 return {points,state:points.length===3?'ready':hadError?'error':points.length?'ready':'empty'};
}
