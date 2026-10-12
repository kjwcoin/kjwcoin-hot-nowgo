import {reply} from '@/lib/server';

// Fail closed until licensed menu-level evidence, publishing permission,
// and public RLS are verified. A status flag alone is not sufficient.
export async function GET(req:Request){
 return reply(req,{
  candidates:[],
  publicationStatus:'blocked_pending_permission_and_menu_evidence',
  notice:'메뉴 근거 및 이용 권한 검증 전에는 후보 매장을 공개하지 않습니다.'
 });
}
