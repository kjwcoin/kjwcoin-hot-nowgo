import {selectedReportingEnabled,pendingMenuHeat} from './hot-reporting-phase.ts';
import {parsePublicMenuHeat,type MenuHeatQuery} from './hot-menu-heat.ts';
export class MenuHeatUnavailable extends Error{
 readonly status:429|503;
 constructor(status:429|503=503){super('메뉴별 매운맛 집계를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.');this.status=status}
}
export async function readPublicMenuHeat(query:MenuHeatQuery,signal?:AbortSignal){
 if(!selectedReportingEnabled())return pendingMenuHeat();
 const params=new URLSearchParams({storeId:query.storeId});query.menuIds.forEach(id=>params.append('menuId',id));
 try{
  const response=await fetch('https://www.nowgo.space/api/nowgo/hot/menu-heat?'+params,{
   cache:'no-store',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000),
  });
  if(response.status===429)throw new MenuHeatUnavailable(429);
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new MenuHeatUnavailable();
  const summaries=parsePublicMenuHeat(await response.json(),query.storeId,query.menuIds);
  return summaries===null?{state:'pending' as const,scale:7 as const,summaries:[]}:{state:'ready' as const,coverage:'canonical_selected_reports_only' as const,scale:7 as const,summaries};
 }catch(error){if(error instanceof MenuHeatUnavailable)throw error;throw new MenuHeatUnavailable()}
}
