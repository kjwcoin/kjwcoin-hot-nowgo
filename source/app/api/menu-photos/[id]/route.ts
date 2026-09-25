import {publicDb} from '@/lib/supabase';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});
  const db=publicDb();const {data,error}=await db.from('rich_public_menus').select('id').eq('id',id).maybeSingle();
  if(error||!data)return new Response('Not found',{status:404});
  const {data:file,error:storageError}=await db.storage.from('rich-report-photos').download(id);
  if(storageError||!file)return new Response('Not found',{status:404});
  return new Response(file,{headers:{'Content-Type':file.type,'Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Unavailable',{status:503})}
}
