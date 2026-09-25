import {menuById} from '@/lib/menu-catalog';
import {reply} from '@/lib/server';
import {nowgoUrl,resolveOfficialStatus} from '@/lib/integration-policy';
import {variantForHost} from '@/lib/site-config';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const unknown=resolveOfficialStatus(null,'','');
 try{
  const variant=variantForHost(req.headers.get('host'));
  const {id}=await params,menu=await menuById(id,variant);
  if(!menu)return reply(req,unknown,404);
  if(menu.isDemo)return reply(req,{...unknown,source:'가매장 · 실제 영업하지 않음'});
  if(variant==='rich')return reply(req,unknown);
  const u=nowgoUrl(process.env.NOWGO_STATUS_API_URL);if(!u)return reply(req,unknown);
  u.searchParams.set('hot_place_id',menu.placeId);u.searchParams.set('hot_menu_id',menu.id);
  const r=await fetch(u,{headers:process.env.NOWGO_STATUS_API_TOKEN?{Authorization:'Bearer '+process.env.NOWGO_STATUS_API_TOKEN}:{},redirect:'error',signal:AbortSignal.timeout(5000),cache:'no-store'});
  if(!r.ok)return reply(req,{...unknown,source:'NOWGO 상태 확인 지연'});
  return reply(req,resolveOfficialStatus(await r.json(),menu.placeId,menu.id));
 }catch{return reply(req,{...unknown,source:'NOWGO 상태 확인 지연'})}
}
