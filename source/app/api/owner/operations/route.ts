import {verifiedUser} from '@/lib/supabase';
import {reply, validOrigin, failure} from '@/lib/server';
import {parseOwnerCommand} from '@/lib/owner-operations';

export const dynamic = 'force-dynamic';
const errors: Record<string, string> = {
  OWNER_REQUIRED: '점주 계정으로 로그인해 주세요.',
  OWNED_STORE_REQUIRED: '내 매장만 설정할 수 있습니다.',
  OWNER_TRUST_SUSPENDED: '누적 패널티가 30점이 되어 매장 정보 공개와 상태 설정이 중단되었습니다.',
  SUBSCRIPTION_REQUIRED: '구독 이용 권한이 필요합니다. 나우고 스페이스에서 구독설정을 확인해 주세요.',
  INVALID_STATUS: '영업 상태를 다시 선택해 주세요.',
};
function rpcFailure(req: Request, error: {message: string; code?: string}) {
  const text = Object.keys(errors).find(key => error.message.includes(key));
  return text ? reply(req, {error: errors[text]}, text === 'INVALID_STATUS' ? 400 : 403) : failure(req, error);
}
export async function GET(req: Request) {
  try {
    const auth = await verifiedUser(req);
    if (!auth) return reply(req, {error: '점주 로그인이 필요합니다.'}, 401);
    const {data, error} = await auth.client.rpc('ng_map_owner_snapshot');
    if (error) return rpcFailure(req, error);
    return reply(req, data);
  } catch (error) {return failure(req, error);}
}
export async function POST(req: Request) {
  if (!validOrigin(req)) return reply(req, {error: '요청 출처를 확인해 주세요.'}, 403);
  try {
    const auth = await verifiedUser(req);
    if (!auth) return reply(req, {error: '점주 로그인이 필요합니다.'}, 401);
    let body: unknown;
    try {body = await req.json();} catch {return reply(req, {error: '입력 내용을 확인해 주세요.'}, 400);}
    const d = parseOwnerCommand(body);
    if (!d) return reply(req, {error: '매장과 영업 상태를 확인해 주세요.'}, 400);
    const {data, error} = await auth.client.rpc('ng_map_set_owner_status', {
      p_store: d.storeId, p_kind: d.kind, p_value: d.value, p_active: d.active,
      p_expiry_mode: d.expiryMode, p_request_id: d.requestId,
    });
    if (error) return rpcFailure(req, error);
    return reply(req, data);
  } catch (error) {return failure(req, error);}
}
