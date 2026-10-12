import {publicDb} from '@/lib/supabase';
import {reply,failure} from '@/lib/server';

// Read-only candidates. Unknown store/menu facts are clearly distinguished from validated listings.
export async function GET(req:Request){
 try{
  const {data,error}=await publicDb().from('hot_unverified_spicy_menu_candidates')
   .select('id,place_url,shop,menu_name,menu_description,address,lat,lng,verification_status')
   .in('verification_status',['unverified','verified']).not('lat','is',null)
   .order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  return reply(req,{candidates:(data||[]).map(row=>({...row,unverified:row.verification_status!=='verified',ownerRegistered:false}))});
 }catch(e){return failure(req,e)}
}
