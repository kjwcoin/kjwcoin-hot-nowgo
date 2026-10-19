import {menuById} from '@/lib/menu-catalog';
import {publicDb,verifiedUser} from '@/lib/supabase';
import {reply,validOrigin,failure} from '@/lib/server';
import {isSpiceLevel} from '@/lib/hot-spice';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const error=(req:Request,msg:string,status:number)=>reply(req,{error:msg},status);

// HOT only. Uses NOWGO unified-member bearer tokens and the existing menu catalog.
export async function GET(req:Request){
 try{
  const menuId=new URL(req.url).searchParams.get('menuId')||'';
  if(!uuid.test(menuId))return error(req,'메뉴 ID를 확인해 주세요.',400);
  if(!await menuById(menuId,'hot'))return error(req,'HOT 메뉴를 찾을 수 없습니다.',404);
  const {data,error:dbError}=await publicDb().rpc('hot_menu_spice_summary_for',{p_menu_id:menuId}).single();
  if(dbError)throw dbError;
  const summary = data as {median_level:number|null;rating_count:number|string}|null;
  const count = Number(summary?.rating_count??0);
  return reply(req,{menuId,median:summary?.median_level??null,count,
    provisional:count>0&&count<3});
 }catch(e){return failure(req,e)}
}

export async function POST(req:Request){
 if(!validOrigin(req))return error(req,'요청 출처를 확인해 주세요.',403);
 try{
  const auth=await verifiedUser(req);
  if(!auth)return error(req,'NOWGO 통합 로그인 후 평가할 수 있습니다.',401);
  let data:unknown;
  try{data=await req.json()}catch{return error(req,'평가 요청을 확인해 주세요.',400)}
  if(!data||typeof data!=='object'||Array.isArray(data))return error(req,'평가 정보를 확인해 주세요.',400);
  const {menuId,level}=data as {menuId?:unknown;level?:unknown};
  if(typeof menuId!=='string'||!uuid.test(menuId)||!isSpiceLevel(level))
   return error(req,'메뉴와 매운맛 1~7단계를 확인해 주세요.',400);
  if(!await menuById(menuId,'hot'))return error(req,'HOT 메뉴를 찾을 수 없습니다.',404);
  // The RPC re-verifies the authenticated caller, 1..7 range and canonical HOT menu.
  // Direct INSERT/UPDATE privileges are revoked by the reviewed development migration.
  const {error:dbError}=await auth.client.rpc('hot_menu_spice_upsert',{
    p_menu_id:menuId,p_level:level
  });
  if(dbError)throw dbError;
  const {data:saved,error:verifyError}=await auth.client.from('hot_menu_spice_ratings')
    .select('level').eq('menu_id',menuId).eq('user_id',auth.user.id).single();
  if(verifyError)throw verifyError;
  if(saved?.level!==level)return error(req,'평가 저장 확인에 실패했습니다.',503);
  return reply(req,{saved:true,menuId,level},200);
 }catch(e){return failure(req,e)}
}
