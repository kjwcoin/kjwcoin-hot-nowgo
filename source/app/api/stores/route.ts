import {publicConfig,publicDb} from '@/lib/supabase';
import {reply} from '@/lib/server';

// Only the public fields granted to the taste-site roles are requested.
// Unclaimed stores can appear here; selecting one does not verify its owner.
export async function GET(req:Request){
 const q=new URL(req.url).searchParams.get('q')?.trim()||'';
 if(q.length<2||q.length>60||!publicConfig().ready)return reply(req,{stores:[]});
 const keyword=q.replace(/[^\p{L}\p{N}\s-]/gu,'').trim();
 if(keyword.length<2)return reply(req,{stores:[]});
 const {data,error}=await publicDb().from('stores')
  .select('id,name,address,slug')
  .is('archived_at',null)
  .ilike('name',`%${keyword}%`)
  .order('name',{ascending:true})
  .limit(12);
 if(error)return reply(req,{error:'매장을 찾지 못했어요. 잠시 후 다시 시도해 주세요.'},503);
 return reply(req,{stores:data||[]});
}
