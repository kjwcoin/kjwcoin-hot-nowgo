import {sourceIsPrimaryPin,type MapStoreGroup} from './map-sourced-stores.ts';
import {storePinMenu} from './menu-store-groups.ts';
import {isKoreanCoordinate} from './korean-region.ts';

export const STORE_CLUSTER_MIN_LEVEL=6;
export const STORE_CLUSTER_GRID_PX=80;
export type StoreMapPoint={key:string;group:MapStoreGroup;lat:number;lng:number;isDemo:boolean};
export type StoreMapDisplay=
 | {kind:'store';key:string;point:StoreMapPoint}
 | {kind:'cluster';key:string;members:readonly StoreMapPoint[];lat:number;lng:number;count:number};
type Bounds={south:number;north:number;west:number;east:number};
type Pixel={x:number;y:number};

/** Use the existing pin's coordinates and identity, never reports or invented positions. */
export function positionedStoreGroups(groups:readonly MapStoreGroup[],selectedId?:string):StoreMapPoint[]{
 return groups.flatMap(group=>{
  if(sourceIsPrimaryPin(group)&&group.source?.coordinates){
   const {lat,lon:lng}=group.source.coordinates;
   // Public sources permit latitude through 39.6; do not narrow them to the catalog's 39 ceiling.
   return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=33&&lat<=39.6&&lng>=124&&lng<=132?[{key:group.key,group,lat,lng,isDemo:false}]:[];
  }
  if(!group.catalog)return [];
  const menu=storePinMenu(group.catalog,selectedId),{lat,lng}=menu;
  return isKoreanCoordinate(lat,lng)?[{key:group.key,group,lat:lat!,lng:lng!,isDemo:menu.isDemo}]:[];
 });
}

/**
 * Screen-proximity clustering of already deduplicated loaded stores, not region totals.
 * Spatial hash with neighboring-cell lookup, never an all-pairs distance scan.
 * Inclusive viewport bounds match the viewport counter, but data coverage differs.
 * Demo pins remain separate and can never inflate a real-store cluster count.
 */
export function clusterStorePoints(points:readonly StoreMapPoint[],options:{level:number;project:(point:StoreMapPoint)=>Pixel;bounds:Bounds|null;enabled?:boolean}):StoreMapDisplay[]{
 type CellCluster={anchor:Pixel;members:StoreMapPoint[]};
 const singles:StoreMapDisplay[]=[],cells=new Map<string,CellCluster[]>(),clusters:CellCluster[]=[],seen=new Set<string>();
 const clustering=options.enabled!==false&&options.level>=STORE_CLUSTER_MIN_LEVEL;
 const ordered=clustering?[...points].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0):points;
 for(const point of ordered){
  if(seen.has(point.key))continue;
  seen.add(point.key);
  const b=options.bounds;
  if(b&&(point.lat<b.south||point.lat>b.north||point.lng<b.west||point.lng>b.east))continue;
  const single=()=>singles.push({kind:'store',key:'store:'+point.key,point});
  if(!clustering||point.isDemo){single();continue}
  const pixel=options.project(point);
  if(!Number.isFinite(pixel.x)||!Number.isFinite(pixel.y)){single();continue}
  const x=Math.floor(pixel.x/STORE_CLUSTER_GRID_PX),y=Math.floor(pixel.y/STORE_CLUSTER_GRID_PX);
  let nearest:CellCluster|undefined,distance=STORE_CLUSTER_GRID_PX**2;
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const cluster of cells.get(`${x+dx}:${y+dy}`)||[]){
   const squared=(pixel.x-cluster.anchor.x)**2+(pixel.y-cluster.anchor.y)**2;
   if(squared<=distance){nearest=cluster;distance=squared}
  }
  if(nearest){nearest.members.push(point);continue}
  // Fixed seeds stay separated, bounding neighbors even in very dense inputs.
  const cluster={anchor:pixel,members:[point]},key=`${x}:${y}`;
  const bucket=cells.get(key)||[];bucket.push(cluster);cells.set(key,bucket);clusters.push(cluster);
 }
 for(const {members} of clusters){
  if(members.length===1){const point=members[0];singles.push({kind:'store',key:'store:'+point.key,point});continue}
  // Sorted identity keys retain overlays when map idle/resize repeats unchanged data.
  const key='cluster:'+JSON.stringify(members.map(point=>point.key).sort());
  // Render at the separated seed, not the centroid: dense groups can otherwise
  // pull neighboring centroids together and make two numbered circles overlap.
  const {lat,lng}=members[0];
  singles.push({kind:'cluster',key,members,lat,lng,count:members.length});
 }
 return singles;
}

export function clusterZoomLevel(currentLevel:number):number{return Math.max(1,currentLevel-2)}

/** Native button supports Enter/Space. Brand styling conveys quantity, never heat/claim. */
export function storeClusterButton(count:number,onZoom:(keyboard:boolean)=>void,dom:Pick<Document,'createElement'>=document):HTMLButtonElement{
 const button=dom.createElement('button');button.type='button';
 button.className='map-store-cluster'+(count>=1000?' map-store-cluster--large':'');
 button.textContent=count.toLocaleString('ko-KR');
 button.setAttribute('aria-label',`이 묶음의 불러온 매장 ${count.toLocaleString('ko-KR')}곳. 중복 매장 제외. 확대하여 개별 매장 보기`);
 button.title=`불러온 매장 ${count.toLocaleString('ko-KR')}곳 · 확대하기`;
 button.onclick=event=>{event.preventDefault();event.stopPropagation();onZoom(event.detail===0)};
 return button;
}

/** Mount only displayed overlays, retain unchanged ones, and remove stale overlays. */
export function createStoreOverlayReconciler<T extends {setMap:(map:null)=>void}>(create:(display:StoreMapDisplay)=>T|null,revision:(display:StoreMapDisplay)=>string=display=>display.key){
 const overlays=new Map<string,T>();
 const revisions=new Map<string,string>();
 return {
  update(displays:readonly StoreMapDisplay[]):T[]{
   const next=new Set(displays.map(display=>display.key));
   for(const [key,overlay] of overlays)if(!next.has(key)){overlay.setMap(null);overlays.delete(key);revisions.delete(key)}
   for(const display of displays){
    const current=revision(display);
    if(overlays.has(display.key)&&revisions.get(display.key)!==current){overlays.get(display.key)!.setMap(null);overlays.delete(display.key);revisions.delete(display.key)}
    if(!overlays.has(display.key)){const overlay=create(display);if(overlay){overlays.set(display.key,overlay);revisions.set(display.key,current)}}
   }
   return [...overlays.values()];
  },
  dispose(){for(const overlay of overlays.values())overlay.setMap(null);overlays.clear();revisions.clear()},
 };
}
