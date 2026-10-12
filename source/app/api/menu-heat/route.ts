import {selectedReportingEnabled,pendingMenuHeat} from '@/lib/hot-reporting-phase';
import {variantForHost} from '@/lib/site-config';
import {InvalidMenuHeatQuery,parseMenuHeatQuery} from '@/lib/hot-menu-heat';
import {MenuHeatUnavailable,readPublicMenuHeat} from '@/lib/hot-menu-heat-server';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){
 try{
  if(variantForHost(request.headers.get('host'))!=='hot')throw new InvalidMenuHeatQuery('HOT 메뉴를 선택해 주세요.');
  const url=new URL(request.url);if(url.search.length>8192)throw new InvalidMenuHeatQuery('메뉴를 다시 선택해 주세요.');
  const query=parseMenuHeatQuery(url.searchParams);
  if(!selectedReportingEnabled())return Response.json(pendingMenuHeat(),{headers});
  return Response.json(await readPublicMenuHeat(query,request.signal),{headers});
 }catch(error){
  if(error instanceof InvalidMenuHeatQuery)return Response.json({state:'unavailable',error:error.message},{status:400,headers});
  const status=error instanceof MenuHeatUnavailable?error.status:503;
  return Response.json({state:'unavailable',error:'메뉴별 매운맛 집계를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.'},{status,headers:{...headers,...(status===429?{'Retry-After':'30'}:{})}});
 }
}
