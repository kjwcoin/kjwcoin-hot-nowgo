import {returnPath} from '@/lib/integration-policy';
export async function GET(req:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;if(action!=='start')return new Response(null,{status:404});
 const dest=new URL('/account/join',req.url);
 dest.searchParams.set('returnTo',returnPath(new URL(req.url).searchParams.get('returnTo')));
 return Response.redirect(dest,303);
}
