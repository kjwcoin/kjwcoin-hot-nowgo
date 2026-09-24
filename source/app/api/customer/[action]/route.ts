import {reply,validOrigin,failure} from '@/lib/server';
import {customer,LEVELS} from '@/lib/customer';
import {browserAuthConfig,logoutUnified} from '@/lib/unified-auth';
type Ctx={params:Promise<{action:string}>};
export async function GET(req:Request,{params}:Ctx){try{if((await params).action!=='me')return reply(req,{},404);const c=await customer(req);if(!c)return reply(req,{customer:null,auth:browserAuthConfig()});const points=c.points,level=[...LEVELS].reverse().find(l=>Number(points||0)>=l.min)!;return reply(req,{customer:{id:c.id,nickname:c.nickname,phoneMasked:c.phoneMasked,phoneVerified:c.phoneVerified},points,level,auth:browserAuthConfig()})}catch(e){return failure(req,e)}}
export async function POST(req:Request,{params}:Ctx){if(!validOrigin(req))return reply(req,{},403);const {action}=await params;try{if(action==='logout')return await logoutUnified(req);if(action==='signup'||action==='login')return reply(req,{error:'HOT 별도 가입은 종료되었습니다. NOWGO 통합회원 가입·로그인을 이용해 주세요.',code:'UNIFIED_ACCOUNT_REQUIRED'},410);if(action==='consents')return reply(req,{error:'수신 동의는 NOWGO 통합회원 설정에서 변경해 주세요.'},410);if(action==='review')return reply(req,{error:'리뷰는 NOWGO 매장 미니홈피에서 작성해 주세요.'},410);return reply(req,{},404)}catch(e){return failure(req,e)}}
export async function DELETE(req:Request){return reply(req,{error:'리뷰 관리는 NOWGO 매장 미니홈피에서 이용해 주세요.'},410)}
