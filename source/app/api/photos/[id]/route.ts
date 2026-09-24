import {verifiedUser} from '@/lib/supabase';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});
  const auth=await verifiedUser(req);if(!auth)return new Response('Unauthorized',{status:401});
  const {data,error}=await auth.client.from('hot_taste_observations').select('photo_path').eq('id',id).eq('user_id',auth.user.id).maybeSingle();
  if(error||!data)return new Response('Not found',{status:404});
  const {data:file,error:storageError}=await auth.client.storage.from('hot-report-photos').download(data.photo_path);
  if(storageError||!file)return new Response('Not found',{status:404});
  return new Response(file,{headers:{'Content-Type':file.type,'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Unavailable',{status:503})}
}
