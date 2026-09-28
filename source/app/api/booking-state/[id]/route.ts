import {menuByPlaceId} from '@/lib/menu-catalog';
import {experienceFromRequest} from '@/lib/experience';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return Response.json({linked:false},{status:400});
 const menu=await menuByPlaceId(id,experienceFromRequest(req));
 if(!menu||menu.isDemo||!menu.verifiedOwner||!menu.nowgoSlug||!/^[a-zA-Z0-9_-]{1,100}$/.test(menu.nowgoSlug))return Response.json({linked:false},{headers:{'Cache-Control':'no-store'}});
 try{
  const res=await fetch(`https://www.nowgo.space/api/bookings?slug=${encodeURIComponent(menu.nowgoSlug)}`,{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!res.ok)throw new Error('unavailable');
  const data=await res.json();
  if(data.store?.slug!==menu.nowgoSlug)throw new Error('mismatch');
  return Response.json({linked:true,slug:menu.nowgoSlug,waitingCount:data.waitingCount,reservationsEnabled:data.reservationsEnabled,waitingEnabled:data.waitingEnabled},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({linked:false},{status:503,headers:{'Cache-Control':'no-store'}})}
}
