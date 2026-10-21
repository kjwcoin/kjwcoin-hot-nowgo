import {menuById} from '@/lib/menu-catalog';
import {publicDb, verifiedUser} from '@/lib/supabase';
import {validOrigin} from '@/lib/server';
import {variantForHost} from '@/lib/site-config';
import {isSpiceLevel, isSpiceMenuId, parseSpiceSummary} from '@/lib/hot-spice';

const headers = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};
const reply = (data: unknown, status = 200) => Response.json(data, {status, headers});
const unavailable = () => reply({error: '메뉴별 평가에 연결하지 못했어요. 잠시 후 다시 확인해 주세요.', code: 'spice_unavailable'}, 503);
const isHot = (req: Request) => variantForHost(req.headers.get('host') || new URL(req.url).host) === 'hot';

async function readRating(req: Request): Promise<Record<string, unknown>> {
  const reader = req.body?.getReader();
  if (!reader) throw Error('invalid_request');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); throw Error('request_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid_request');
  return value as Record<string, unknown>;
}

export async function GET(req: Request) {
  if (!isHot(req)) return reply({error: 'HOT에서 이용할 수 있는 메뉴 평가입니다.'}, 404);
  const params = new URL(req.url).searchParams;
  const menuId = params.get('menuId');
  if (!isSpiceMenuId(menuId) || params.getAll('menuId').length !== 1 || [...params.keys()].some(key => key !== 'menuId'))
    return reply({error: '메뉴를 다시 선택해 주세요.'}, 400);
  try {
    if (!await menuById(menuId, 'hot')) return reply({error: '공개된 HOT 메뉴를 찾을 수 없어요.'}, 404);
    const auth = req.headers.has('authorization') ? await verifiedUser(req) : null;
    if (req.headers.has('authorization') && !auth) return reply({error: '로그인을 다시 확인해 주세요.'}, 401);
    const {data, error} = await publicDb().rpc('hot_menu_spice_summary_for', {p_menu_id: menuId}).single();
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) return unavailable();
    const row = data as Record<string, unknown>;
    let myLevel = null;
    if (auth) {
      const own = await auth.client.from('hot_menu_spice_ratings').select('level').eq('menu_id', menuId).eq('user_id', auth.user.id).maybeSingle();
      if (own.error || (own.data && !isSpiceLevel(own.data.level))) return unavailable();
      myLevel = own.data?.level ?? null;
    }
    const rawCount: unknown = row.rating_count;
    const count = typeof rawCount === 'string' && /^\d+$/.test(rawCount) ? Number(rawCount) : rawCount;
    return reply(parseSpiceSummary({menuId, median: row.median_level, count,
      provisional: typeof count === 'number' && count > 0 && count < 3, myLevel}, menuId));
  } catch { return unavailable(); }
}

export async function POST(req: Request) {
  if (!isHot(req)) return reply({error: 'HOT에서 이용할 수 있는 메뉴 평가입니다.'}, 404);
  if (!req.headers.get('origin') || !validOrigin(req)) return reply({error: '요청 출처를 확인해 주세요.'}, 403);
  let value: Record<string, unknown>;
  try { value = await readRating(req); }
  catch (error) { return reply({error: '메뉴와 매운맛 1~7단계를 확인해 주세요.'}, error instanceof Error && error.message === 'request_too_large' ? 413 : 400); }
  const {menuId, level} = value;
  if (!isSpiceMenuId(menuId) || !isSpiceLevel(level) || Object.keys(value).some(key => !['menuId', 'level'].includes(key)))
    return reply({error: '메뉴와 매운맛 1~7단계를 확인해 주세요.'}, 400);
  try {
    const auth = await verifiedUser(req);
    if (!auth) return reply({error: 'NOWGO 통합회원 로그인 후 평가할 수 있어요.', code: 'login_required'}, 401);
    if (!await menuById(menuId, 'hot')) return reply({error: '공개된 HOT 메뉴를 찾을 수 없어요.'}, 404);
    // The RPC independently validates the caller and canonical menu; no billing state is changed.
    const {error} = await auth.client.rpc('hot_menu_spice_upsert', {p_menu_id: menuId, p_level: level});
    if (error) return unavailable();
    const saved = await auth.client.from('hot_menu_spice_ratings').select('level').eq('menu_id', menuId).eq('user_id', auth.user.id).single();
    if (saved.error || saved.data?.level !== level)
      return reply({error: '평가 저장 결과를 확인하지 못했어요. 새로고침해 내 평가를 확인해 주세요.', code: 'SAVE_UNVERIFIED'}, 503);
    return reply({saved: true, menuId, level});
  } catch { return unavailable(); }
}
