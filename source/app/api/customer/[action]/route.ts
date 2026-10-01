import {reply,validOrigin,failure} from '@/lib/server';
import {verifiedUser,publicConfig} from '@/lib/supabase';
import {isExistingOwner} from '@/lib/existing-owner';
import {LEVELS} from '@/lib/loyalty';
type Ctx={params:Promise<{action:string}>};
const VERSION='2026-09-25-sweet-v1';
export async function GET(req:Request,{params}:Ctx){
 try{
  const action=(await params).action;
  if(action==='login-target'){
   const auth=await verifiedUser(req);
   if(!auth)return reply(req,{existingOwner:false},401);
   const existingOwner=await isExistingOwner(auth.client,auth.user.id);
   return reply(req,{existingOwner});
  }
  if(action==='owned-stores'){
   const auth=await verifiedUser(req);if(!auth)return reply(req,{stores:[]},401);
   const {data,error}=await auth.client.rpc('sweet_owned_stores');if(error)throw error;
   return reply(req,{stores:data||[]});
  }
  if(action==='favorite'){
   const auth=await verifiedUser(req);if(!auth)return reply(req,{error:'통합 로그인 후 다시 시도해 주세요.'},401);
   const storeId=new URL(req.url).searchParams.get('storeId');
   if(!storeId||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(storeId))return reply(req,{error:'매장을 확인해 주세요.'},400);
   const [favorite,hidden]=await Promise.all([auth.client.from('store_favorites').select('store_id').eq('user_id',auth.user.id).eq('store_id',storeId).maybeSingle(),auth.client.from('regular_home_hidden').select('store_id').eq('user_id',auth.user.id).eq('store_id',storeId).maybeSingle()]);
   if(favorite.error||hidden.error)throw favorite.error||hidden.error;
   return reply(req,{registered:!!favorite.data&&!hidden.data});
  }
  if(action!=='me')return reply(req,{},404);
  const authConfig={mode:'unified',ready:publicConfig().ready,accountUrl:null};
  const auth=await verifiedUser(req);
  if(!auth)return reply(req,{customer:null,auth:authConfig,consentRequired:false});
  const {data:consent,error}=await auth.client.from('sweet_member_consents').select('essential_version').eq('user_id',auth.user.id).maybeSingle();
  if(error)throw error;
  if(consent?.essential_version!==VERSION)return reply(req,{customer:null,auth:authConfig,consentRequired:true});
  const name=String(auth.user.user_metadata?.full_name||auth.user.user_metadata?.name||auth.user.email?.split('@')[0]||'회원').trim().slice(0,40)||'회원';
  const points=0,level=LEVELS[0];
  return reply(req,{customer:{id:auth.user.id,nickname:name,phoneMasked:'제보별 연락처',phoneVerified:false},points,level,auth:authConfig,consentRequired:false});
 }catch(e){return failure(req,e)}
}
export async function POST(req:Request,{params}:Ctx){
 if(!validOrigin(req))return reply(req,{error:'요청 출처를 확인해 주세요.'},403);
 const {action}=await params;
 try{
  if(action==='favorite'){
   const auth=await verifiedUser(req);if(!auth)return reply(req,{error:'통합 로그인 후 다시 시도해 주세요.'},401);
   const body=await req.json() as {storeId?:string;active?:boolean};
   if(typeof body.storeId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.storeId)||typeof body.active!=='boolean')return reply(req,{error:'매장을 확인해 주세요.'},400);
   const {error}=await auth.client.rpc('ng_customer_set_favorite',{p_store:body.storeId,p_active:body.active});if(error)throw error;
   return reply(req,{registered:body.active});
  }
  if(action!=='consents')return reply(req,{error:'SWEET은 NOWGO 통합회원으로 가입합니다.'},410);
  const auth=await verifiedUser(req);if(!auth)return reply(req,{error:'통합 로그인 후 다시 시도해 주세요.'},401);
  const body=await req.json() as {essential?:boolean;marketingEmail?:boolean;version?:string};
  if(body.essential!==true||body.version!==VERSION||typeof body.marketingEmail!=='boolean')return reply(req,{error:'필수 동의를 확인해 주세요.'},400);
  const now=new Date().toISOString();
  const {error}=await auth.client.from('sweet_member_consents').upsert({
   user_id:auth.user.id,essential_version:VERSION,essential_at:now,
   marketing_email:body.marketingEmail,marketing_at:body.marketingEmail?now:null,updated_at:now
  },{onConflict:'user_id'});
  if(error)throw error;return reply(req,{saved:true});
 }catch(e){return failure(req,e)}
}

