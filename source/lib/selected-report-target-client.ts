import {HOT_REPORTING_PENDING_CODE} from './hot-reporting-phase.ts';
import {readReportSelection,parseSelectedReportTarget,type ReportSelection,type SelectedReportTarget} from './selected-report-target.ts';
export type SelectedReportState={status:'none';key:''}|{status:'loading';key:string;selection:ReportSelection}|{status:'ready';key:string;selection:ReportSelection;target:SelectedReportTarget}|{status:'error'|'pending';key:string;message:string};
/** URL changes, Back, and repeated taps never apply an older target to the current form. */
export function createSelectedReportLoader(options:{load:(selection:ReportSelection,signal:AbortSignal)=>Promise<unknown>;onState:(state:SelectedReportState)=>void}){
 let sequence=0,disposed=false,key:string|null=null,controller:AbortController|undefined;
 const select=(params:URLSearchParams,retry=false)=>{
  if(disposed)return;
  const nextKey=params.has('reportStore')||params.has('reportMenu')?JSON.stringify([params.getAll('reportStore'),params.getAll('reportMenu')]):'';
  if(!retry&&nextKey===key)return;
  key=nextKey;const current=++sequence;controller?.abort();
  let selection:ReportSelection|null;
  try{selection=readReportSelection(params)}catch{options.onState({status:'error',key:nextKey,message:'제보할 매장과 메뉴를 다시 선택해 주세요.'});return}
  if(!selection){options.onState({status:'none',key:''});return}
  const abort=new AbortController();controller=abort;options.onState({status:'loading',key:nextKey,selection});
  void options.load(selection,abort.signal).then(data=>{
   const target=parseSelectedReportTarget(data,selection!);
   if(!disposed&&current===sequence)options.onState({status:'ready',key:nextKey,selection:selection!,target});
  }).catch(error=>{if(!disposed&&current===sequence)options.onState({status:error&&typeof error==='object'&&'code' in error&&error.code===HOT_REPORTING_PENDING_CODE?'pending':'error',key:nextKey,message:error instanceof Error?error.message:'선택한 메뉴 정보를 확인할 수 없어요.'})});
 };
 return {select,dispose(){disposed=true;sequence++;controller?.abort()}};
}
