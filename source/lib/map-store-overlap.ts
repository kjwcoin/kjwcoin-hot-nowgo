import type {StoreMapPoint} from './map-store-clusters.ts';

export const OVERLAP_DISTANCE_PX=44;
export const OVERLAP_PETAL_LIMIT=6;
export type Pixel={x:number;y:number};
/** Conservative road-address identity. Wings/units remain visible, never merged. */
export function overlapAddressLabel(points:readonly StoreMapPoint[]):string{
 const addresses=points.map(point=>point.group.source?.address??'');
 const roads=addresses.map(address=>address.match(/^(.+?(?:대로|로|길)\s+\d+(?:-\d+)?)(?=\s|$)/)?.[1]);
 return roads[0]&&roads.every(road=>road===roads[0])?'같은 도로명 주소의 매장':'화면에서 겹치는 매장';
}
/** Pure finite screen offsets. These values must never be written to coordinates. */
export function overlapPetalOffsets(count:number):Pixel[]{
 if(!Number.isInteger(count)||count<2||count>OVERLAP_PETAL_LIMIT)return [];
 const radius=count===2?94:count===3?120:count===4?132:170;
 return Array.from({length:count},(_,i)=>({x:Math.round(Math.cos(-Math.PI/2+i*2*Math.PI/count)*radius),y:Math.round(Math.sin(-Math.PI/2+i*2*Math.PI/count)*radius)}));
}

export function storeOverlapContent(options:{members:readonly StoreMapPoint[];expanded:boolean;onToggle:(keyboard:boolean)=>void;createPin:(point:StoreMapPoint)=>HTMLElement|null;anchorDelta:(point:StoreMapPoint)=>Pixel;viewport?:{width:number;height:number;x:number;y:number};dom?:Document}):HTMLElement{
 const dom=options.dom??document,{members,expanded}=options;
 const root=dom.createElement('div');root.className='map-store-overlap';
 const button=dom.createElement('button');button.type='button';button.className='map-store-cluster map-store-overlap-toggle';button.textContent=String(members.length);
 const label=overlapAddressLabel(members);
 button.setAttribute('aria-label',`${label} ${members.length}곳. ${expanded?'접기':'펼쳐서 개별 매장 보기'}`);
 button.setAttribute('aria-expanded',String(expanded));button.title=`${label} ${members.length}곳`;
 button.onclick=event=>{event.preventDefault();event.stopPropagation();options.onToggle(event.detail===0)};
 root.append(button);
 if(!expanded)return root;
 const viewport=options.viewport;
 const petalExtent=members.length<=3?184:249;
 const offsets=overlapPetalOffsets(members.length),list=offsets.length===0||Boolean(viewport&&(viewport.width<petalExtent*2||viewport.height<petalExtent*2));
 const extent=list?155:petalExtent;
 const shift=viewport?{x:Math.max(extent-viewport.x,Math.min(0,viewport.width-extent-viewport.x)),y:list?0:Math.max(extent-viewport.y,Math.min(0,viewport.height-extent-viewport.y))}:{x:0,y:0};
 const panel=dom.createElement('div');panel.className=list?'map-overlap-list':'map-overlap-petals';panel.style.marginLeft=`${shift.x}px`;panel.style.marginTop=`${shift.y}px`;
 if(list&&viewport&&viewport.y+360>viewport.height)panel.style.top=`${Math.max(60-viewport.y,viewport.height-viewport.y-300)}px`;
 panel.setAttribute('role','group');panel.setAttribute('aria-label',label);
 if(list){const heading=dom.createElement('p');heading.textContent=`${label} ${members.length}곳`;panel.append(heading)}
 const svg=dom.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','map-overlap-lines');svg.setAttribute('aria-hidden','true');svg.setAttribute('viewBox','-180 -180 360 360');
 if(!list)panel.append(svg);
 members.forEach((point,index)=>{
  const pin=options.createPin(point);if(!pin)return;
  const item=dom.createElement('div');item.className='map-overlap-item';
  if(!list){const offset=offsets[index],anchor=options.anchorDelta(point);item.style.left=`${offset.x}px`;item.style.top=`${offset.y}px`;
   const line=dom.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',String(Number.isFinite(anchor.x)?anchor.x-shift.x:0));line.setAttribute('y1',String(Number.isFinite(anchor.y)?anchor.y-shift.y:0));line.setAttribute('x2',String(offset.x));line.setAttribute('y2',String(offset.y));svg.append(line);
  }
  // Existing marker and existing detail callback; source address is quoted unchanged.
  item.append(pin);
  const address=point.group.source?.address;
  if(address){const detail=dom.createElement('small');detail.className='map-overlap-address';detail.textContent=address;item.append(detail)}
  panel.append(item);
 });
 root.append(panel);return root;
}
