import {isKoreanAddress,isKoreanCoordinate} from './korean-region.ts';
export type ReportSelection={storeId:string;menuId:string};
export type SelectedReportTarget=ReportSelection&{storeName:string;address:string;menuName:string;placeId:string;kind:'sourced'|'owned';lat:number|null;lng:number|null};
export const REPORT_STORE_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ReportTargetError extends Error{readonly status:400|404|409|503;readonly code?:string;constructor(message:string,status:400|404|409|503=503,code?:string){super(message);this.status=status;this.code=code}}
const object=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
export function reportSelection(storeId:unknown,menuId:unknown):ReportSelection{
 if(typeof storeId!=='string'||!REPORT_STORE_UUID.test(storeId)||typeof menuId!=='string'||menuId.length>160||!/^[-a-zA-Z0-9_:]+$/.test(menuId))throw new ReportTargetError('제보할 매장과 메뉴를 다시 선택해 주세요.',400);
 return {storeId,menuId};
}
export function readReportSelection(params:URLSearchParams):ReportSelection|null{
 if(!params.has('reportStore')&&!params.has('reportMenu'))return null;
 if(params.getAll('reportStore').length!==1||params.getAll('reportMenu').length!==1)throw new ReportTargetError('제보할 매장과 메뉴를 다시 선택해 주세요.',400);
 return reportSelection(params.get('reportStore'),params.get('reportMenu'));
}
export function parseSelectedReportTarget(value:unknown,expected:ReportSelection):SelectedReportTarget{
 const target=object(object(value)?.target);
 const text=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length>=2&&value.length<=max;
 if(!target||target.storeId!==expected.storeId||target.menuId!==expected.menuId||target.placeId!=='nowgo-'+expected.storeId||
  !['sourced','owned'].includes(String(target.kind))||!text(target.storeName,100)||!text(target.menuName,100)||typeof target.address!=='string'||!isKoreanAddress(target.address)||
  !(target.lat===null&&target.lng===null||typeof target.lat==='number'&&typeof target.lng==='number'&&isKoreanCoordinate(target.lat,target.lng)))throw new ReportTargetError('선택한 메뉴 정보를 확인할 수 없어요. 다시 시도해 주세요.');
 if(target.kind==='owned'&&!REPORT_STORE_UUID.test(expected.menuId))throw new ReportTargetError('공식 메뉴 식별자를 확인할 수 없어요.');
 if(target.kind==='sourced'&&!/^data-go-kr-\d+-\d+:menu:[1-9]\d*$/.test(expected.menuId))throw new ReportTargetError('자료 메뉴 식별자를 확인할 수 없어요.');
 return {...expected,storeName:target.storeName as string,address:target.address,menuName:target.menuName as string,placeId:target.placeId,kind:target.kind as SelectedReportTarget['kind'],lat:target.lat as number|null,lng:target.lng as number|null};
}
export function reportSelectionUrl(selection:ReportSelection):string{
 return '/suggestion?'+new URLSearchParams({reportStore:selection.storeId,reportMenu:selection.menuId})+'#report';
}
export const SELECTED_REPORT_RETRY_FIELDS='id,status,role,nowgo_store_id,place_id,menu_id,shop,menu,address,price,heat,flavor,category,observed_at,note,lat,lng,phone,business_number';
export type ReportBinding=Record<string,string|number|null>;
/** Existing UUIDs are receipts for immutable submissions, never aliases for a new target. */
export function assertSelectedReportRetry(existing:Record<string,unknown>|null,expected:ReportBinding,selected:boolean):void{
 if(!existing)return;
 if(!selected&&existing.menu_id===existing.id)return; // Preserve legacy free-text/correction retry behavior.
 if(!selected||existing.menu_id===existing.id||Object.entries(expected).some(([key,value])=>existing[key]!==value))throw new ReportTargetError('이 접수번호는 다른 제보 내용으로 저장됐어요. 새 제보로 다시 작성해 주세요.',409);
}
