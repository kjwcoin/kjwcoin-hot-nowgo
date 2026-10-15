import {selectedReportingEnabled,type HotReportingState} from './hot-reporting-phase.ts';
import {parsePublicMenuHeat,type PublicMenuHeat} from './hot-menu-heat.ts';
export type MenuHeatState={status:'loading'|'pending'|'error'}|{status:'ready';summaries:PublicMenuHeat[]};
/** One bounded read per visible source card; navigation/unmount discards late data. */
export function createMenuHeatLoader(options:{reportingState?:HotReportingState;storeId:string;menuIds:readonly string[];onState:(state:MenuHeatState)=>void;request?:typeof fetch}){
 let started=false,disposed=false;const controller=new AbortController();let deadline:ReturnType<typeof setTimeout>|undefined;
 const start=()=>{
  if(started||disposed)return;started=true;
  if(options.reportingState!=='enabled'||!selectedReportingEnabled()){options.onState({status:'pending'});return;}
  const query=new URLSearchParams({storeId:options.storeId});options.menuIds.forEach(id=>query.append('menuId',id));
  deadline=setTimeout(()=>controller.abort(),7000);
  void (options.request??fetch)('/api/menu-heat?'+query,{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw Error('heat_unavailable');
   const summaries=parsePublicMenuHeat(await response.json(),options.storeId,options.menuIds);
   if(!disposed)options.onState(summaries===null?{status:'pending'}:{status:'ready',summaries});
  }).catch(()=>{if(!disposed)options.onState({status:'error'})}).finally(()=>clearTimeout(deadline));
 };
 return {start,dispose(){disposed=true;controller.abort();clearTimeout(deadline)}};
}
