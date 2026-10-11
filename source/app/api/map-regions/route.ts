import {mapRegionCatalog} from '@/lib/map-region-catalog';
import {variantForHost} from '@/lib/site-config';
export async function GET(req:Request){
 try{
  return Response.json(await mapRegionCatalog(variantForHost(req.headers.get('host'))),{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({error:'지역별 매장 수를 불러오지 못했어요. 다시 시도해 주세요.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}

