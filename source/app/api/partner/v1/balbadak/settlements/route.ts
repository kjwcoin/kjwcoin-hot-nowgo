import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { publicConfig } from '@/lib/auth-config';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization', 'Content-Type': 'application/json; charset=utf-8' };
function json(data: unknown, status = 200) { return Response.json(data, { status, headers }); }
function authorized(request: Request) {
  const expected = process.env.HOT_PARTNER_API_KEY;
  const actual = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!expected || !actual) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function GET(request: Request) {
  if (!process.env.HOT_PARTNER_API_KEY || !process.env.HOT_PARTNER_REFERRAL_SECRET) return json({ error: '파트너 정산 API가 아직 활성화되지 않았습니다.' }, 503);
  if (!authorized(request)) return json({ error: '유효한 파트너 인증이 필요합니다.' }, 401);
  const month = new URL(request.url).searchParams.get('month') ?? '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: 'month는 YYYY-MM 형식이어야 합니다.' }, 400);
  try {
    const config = publicConfig(), serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!config.ready || !serviceKey) return json({ error: '정산 조회 설정이 완료되지 않았습니다.' }, 503);
    const year = Number(month.slice(0, 4)), monthIndex = Number(month.slice(5)) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1) - 9 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.UTC(year, monthIndex + 1, 1) - 9 * 60 * 60 * 1000).toISOString();
    const db = createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.from('hot_partner_conversions')
      .select('referral_store_id,hot_store_id,converted_at')
      .eq('source', 'balbadak').eq('status', 'approved')
      .gte('converted_at', start).lt('converted_at', end).order('converted_at', { ascending: true });
    if (error) throw error;
    const conversions = data ?? [];
    return json({
      partner: 'balbadak', month, currency: 'KRW', rate_per_conversion: 100,
      approved_conversions: conversions.length, settlement_amount: conversions.length * 100,
      items: conversions.map(c => ({ referral_store_id: c.referral_store_id, hot_store_id: c.hot_store_id, converted_at: c.converted_at })),
      basis: '서명된 발바닥 점주 유입 링크를 통해 HOT 점주 가입 API가 승인 완료된 건. 매장별 1회.',
      settlement_status: 'calculated',
    });
  } catch (error) {
    console.error('HOT partner settlement API failed', error);
    return json({ error: '월별 정산을 계산하지 못했습니다.' }, 503);
  }
}
