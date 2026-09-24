import {beginLogin,finishLogin} from '@/lib/unified-auth';
import {failure} from '@/lib/server';
export async function GET(req:Request,{params}:{params:Promise<{action:string}>}){try{const {action}=await params;if(action==='start')return await beginLogin(req);if(action==='callback')return await finishLogin(req);return new Response(null,{status:404})}catch(e){return failure(req,e)}}
