import {selectedReportingEnabled,HOT_REPORTING_PENDING_MESSAGE,HOT_REPORTING_PENDING_CODE} from './hot-reporting-phase.ts';
import {ReportTargetError,reportSelection,parseSelectedReportTarget,type ReportSelection,type SelectedReportTarget} from './selected-report-target.ts';
/** Public fixed-origin resolver; never sends user contact details or credentials. */
export async function readSelectedReportTarget(selection:ReportSelection,signal?:AbortSignal):Promise<SelectedReportTarget>{
 if(!selectedReportingEnabled())throw new ReportTargetError(HOT_REPORTING_PENDING_MESSAGE,503,HOT_REPORTING_PENDING_CODE);
 const input=reportSelection(selection.storeId,selection.menuId);
 try{
  const response=await fetch('https://www.nowgo.space/api/nowgo/hot/report-target?'+new URLSearchParams(input),{
   cache:'no-store',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000),
  });
  if(response.status===404)throw new ReportTargetError('선택한 매장이나 메뉴를 찾을 수 없어요. 미니홈피에서 다시 선택해 주세요.',404);
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new ReportTargetError('선택한 메뉴 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  return parseSelectedReportTarget(await response.json(),input);
 }catch(error){if(error instanceof ReportTargetError)throw error;throw new ReportTargetError('선택한 메뉴 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')}
}
