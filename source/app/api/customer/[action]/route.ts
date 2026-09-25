import {reply,validOrigin,failure} from '@/lib/server';
import {verifiedUser,publicConfig} from '@/lib/supabase';
import {LEVELS} from '@/lib/loyalty';
import {EXPERIENCE_VERSION,experienceFromRequest} from '@/lib/experience';
type Ctx={params:Promise<{action:string}>};
export async function GET(req:Request,{params}:Ctx){
 try{
  const key=experienceFromRequest(req);
  const action=(await params).action;
  if(action==='owned-stores'){
   const auth=await verifiedUser(req);if(!auth)return reply(req,{stores:[]},401);
   const {data,error}=await auth.client.rpc('hot_owned_stores');if(error)throw error;
   return reply(req,{stores:data||[]});
  }
  if(action!=='me')return reply(req,{},404);
  const authConfig={mode:'unified',ready:publicConfig().ready,accountUrl:null};
  const auth=await verifiedUser(req);
  if(!auth)return reply(req,{customer:null,auth:authConfig,consentRequired:false});
  const {data:consent,error}=await auth.client.from('hot_member_consents').select('essential_version').eq('user_id',auth.user.id).eq('experience_key',key).maybeSingle();
  if(error)throw error;
  if(consent?.essential_version!==EXPERIENCE_VERSION&&!(key==='hot'&&consent?.essential_version==='2026-09-24-hot-v1'))return reply(req,{customer:null,auth:authConfig,consentRequired:true});
  const name=String(auth.user.user_metadata?.full_name||auth.user.user_metadata?.name||auth.user.email?.split('@')[0]||'회원').trim().slice(0,40)||'회원';
  const points=0,level=LEVELS[0];
  return reply(req,{customer:{id:auth.user.id,nickname:name,phoneMasked:'제보별 연락처',phoneVerified:false},points,level,auth:authConfig,consentRequired:false});
 }catch(e){return failure(req,e)}
}
export async function POST(req:Request,{params}:Ctx){
 if(!validOrigin(req))return reply(req,{error:'요청 출처를 확인해 주세요.'},403);
 const {action}=await params;
 try{
  const key=experienceFromRequest(req);
  if(action!=='consents')return reply(req,{error:'HOT은 NOWGO 통합회원으로 가입합니다.'},410);
  const auth=await verifiedUser(req);if(!auth)return reply(req,{error:'통합 로그인 후 다시 시도해 주세요.'},401);
  const body=await req.json() as {essential?:boolean;marketingEmail?:boolean;version?:string};
  if(body.essential!==true||body.version!==EXPERIENCE_VERSION||typeof body.marketingEmail!=='boolean')return reply(req,{error:'필수 동의를 확인해 주세요.'},400);
  const now=new Date().toISOString();
  const {error}=await auth.client.from('hot_member_consents').upsert({
   user_id:auth.user.id,experience_key:key,essential_version:EXPERIENCE_VERSION,essential_at:now,
   marketing_email:body.marketingEmail,marketing_at:body.marketingEmail?now:null,updated_at:now
  },{onConflict:'user_id,experience_key'});
  if(error)throw error;return reply(req,{saved:true});
 }catch(e){return failure(req,e)}
}
