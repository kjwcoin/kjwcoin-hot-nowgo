import type {PublicSourcedStore} from './sourced-store.ts';

/** Ephemeral, one current visitor's latest choice per canonical menu. Never a DB DTO. */
export type PreviewHeatVotes=Readonly<Record<string,number>>;
export type PreviewMenuHeat={scope:'preview-local';storeId:string;menuId:string;menuName:string;medianHeat:number|null;sampleCount:number;myHeat:number|null};
const keyFor=(storeId:string,menuId:string)=>JSON.stringify([storeId,menuId]);
function eligibleHeat(value:number){return Number.isInteger(value)&&value>=1&&value<=5}
function canonicalMenu(store:PublicSourcedStore,menuId:string){const menu=store.menus.find(menu=>menu.id===menuId);if(!menu)throw Error('unknown_preview_menu');return menu}

/** Same median definition as percentile_cont(0.5); only 1–5 integer inputs qualify. */
export function previewHeatMedian(values:readonly number[]):number|null{
 if(values.some(value=>!eligibleHeat(value)))throw Error('invalid_preview_heat');
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
 return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
}
export function replacePreviewHeat(votes:PreviewHeatVotes,store:PublicSourcedStore,menuId:string,heat:number):PreviewHeatVotes{
 canonicalMenu(store,menuId);if(!eligibleHeat(heat))throw Error('invalid_preview_heat');
 return {...votes,[keyFor(store.id,menuId)]:heat};
}
export function previewMenuHeat(votes:PreviewHeatVotes,store:PublicSourcedStore,menuId:string):PreviewMenuHeat{
 const menu=canonicalMenu(store,menuId),value=votes[keyFor(store.id,menuId)],myHeat=eligibleHeat(value)?value:null;
 const eligible=myHeat===null?[]:[myHeat];
 return {scope:'preview-local',storeId:store.id,menuId,menuName:menu.name,medianHeat:previewHeatMedian(eligible),sampleCount:eligible.length,myHeat};
}
