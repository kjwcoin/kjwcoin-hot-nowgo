export const SOURCE_HEAT=['순한맛','약간 매운맛','보통 매운맛','매운맛','아주 매운맛'] as const;
export const SOURCE_FLAVORS=['얼큰한','칼칼한','달콤매콤한','알싸한'] as const;
export type SourceCommunityState={ownerRequests:number;requested:boolean;menus:{menu:string;count:number;heat:number;flavor:string;price?:number|null;photoUrl?:string|null}[];statuses:{status:string;count:number;reportedAt:string;expiresAt:string;confirmed:boolean}[];awardedExp?:number;myReports:{menu:string;heat:number;flavor:string;note:string}[]};
export function sourceTasteInput(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_taste_report');
 const row=value as Record<string,unknown>;
 const menu=typeof row.menu==='string'?row.menu.trim().replace(/\s+/g,' '):'';
 const note=typeof row.note==='string'?row.note.trim():'';
 if(!menu||menu.length>100||!Number.isInteger(row.heat)||Number(row.heat)<1||Number(row.heat)>5||!SOURCE_FLAVORS.some(flavor=>flavor===row.flavor)||note.length>500||row.consent!==true)throw Error('invalid_taste_report');
 return{menu,heat:Number(row.heat),flavor:String(row.flavor),note,consent:true};
}
