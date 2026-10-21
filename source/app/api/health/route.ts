import {publicDb} from '@/lib/supabase';
import {siteConfig,variantForHost} from '@/lib/site-config';

export const dynamic='force-dynamic';

/** Public, read-only liveness. This does not certify login or write journeys. */
export async function GET(request:Request){
 const service=variantForHost(new URL(request.url).hostname);
 const candidate=process.env.VERCEL_GIT_COMMIT_SHA||'';
 const commit=/^[0-9a-f]{40}$/i.test(candidate)?candidate:null;
 const deploymentId=process.env.VERCEL_DEPLOYMENT_ID||null;
 const environment=process.env.VERCEL_ENV==='production'?'production':process.env.VERCEL_ENV==='preview'?'preview':null;
 let database:'ok'|'error'='error';
 try{
  const result=await publicDb().from(siteConfig(service).tables.menus).select('id').limit(1).abortSignal(AbortSignal.timeout(3000));
  if(!result.error&&Array.isArray(result.data))database='ok';
 }catch{}
 return Response.json({service,status:database,checkedAt:new Date().toISOString(),version:{commit,deploymentId,environment},checks:{database}},
  {status:database==='ok'?200:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
