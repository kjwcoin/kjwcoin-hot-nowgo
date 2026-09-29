import {variantForHost} from '@/lib/site-config';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});
 const kind=variantForHost(req.headers.get('host'));
 // The shared service resolves owner priority and AI-approved first-reporter photos.
 return new Response(null,{status:307,headers:{Location:`https://nowgo.space/api/taste-photos/${kind}/${id}`,'Cache-Control':'no-store'}});
}
