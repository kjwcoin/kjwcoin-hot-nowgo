import {STORE_UUID} from './sourced-store.ts';
export type PublicMenuHeat={storeId:string;menuId:string;medianHeat:number|null;sampleCount:number};
export type MenuHeatQuery={storeId:string;menuIds:string[]};
export class InvalidMenuHeatQuery extends Error{}
const MENU_ID=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|data-go-kr-\d+-\d+:menu:[1-9]\d*)$/;
export function parseMenuHeatQuery(params:URLSearchParams):MenuHeatQuery{
 const storeId=params.get('storeId')||'',menuIds=params.getAll('menuId');
 if(params.toString().length>8192||params.getAll('storeId').length!==1||[...params.keys()].some(key=>!['storeId','menuId'].includes(key))||
  !STORE_UUID.test(storeId)||!menuIds.length||menuIds.length>50||menuIds.some(id=>id.length>120||!MENU_ID.test(id)))throw new InvalidMenuHeatQuery('메뉴를 다시 선택해 주세요.');
 return {storeId,menuIds:[...new Set(menuIds)]};
}
/** Server-authoritative canonical summaries only; never derive these from catalog reports. */
export function parsePublicMenuHeat(value:unknown,storeId:string,menuIds:readonly string[]):PublicMenuHeat[]|null{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_heat');
 const data=value as Record<string,unknown>;
 if(data.scale!==7||!Array.isArray(data.summaries))throw Error('invalid_heat');
 if(data.state==='pending'){if(data.summaries.length)throw Error('invalid_heat');return null}
 const expected=new Set(menuIds),seen=new Set<string>();
 if(!STORE_UUID.test(storeId)||!expected.size||expected.size>50||data.state!=='ready'||data.coverage!=='canonical_selected_reports_only'||data.summaries.length!==expected.size)throw Error('invalid_heat');
 return data.summaries.map((value:unknown)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_heat');
  const r=value as Record<string,unknown>,n=r.sampleCount,h=r.medianHeat;
  if(r.storeId!==storeId||typeof r.menuId!=='string'||!expected.has(r.menuId)||seen.has(r.menuId)||typeof n!=='number'||!Number.isSafeInteger(n)||n<0||
   (n===0?h!==null:typeof h!=='number'||!Number.isFinite(h)||h<1||h>7||!Number.isInteger(h*2)))throw Error('invalid_heat');
  seen.add(r.menuId);return {storeId,menuId:r.menuId,medianHeat:h as number|null,sampleCount:n};
 });
}
export function medianPepperFills(heat:number):number[]{
 if(!Number.isFinite(heat)||heat<1||heat>7||!Number.isInteger(heat*2))throw Error('invalid_median');
 return Array.from({length:7},(_,index)=>Math.min(1,Math.max(0,heat-index)));
}
