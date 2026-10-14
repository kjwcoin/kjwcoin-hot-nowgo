import { signedReferralUrl } from '@/lib/partner-attribution';
import { timingSafeEqual } from 'node:crypto';
import { publicDb } from '@/lib/supabase';

const API_ORIGIN = 'https://hot.nowgo.space';
const JOIN_URL = new URL('/account/join', API_ORIGIN);
JOIN_URL.searchParams.set('type', 'user');
JOIN_URL.searchParams.set('source', 'balbadak');
JOIN_URL.searchParams.set('returnTo', '/');

const headers = {
  'Cache-Control': 'private, no-store',
  Vary: 'Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

type PublicHotMenu = {
  place_id: string | null;
  shop: string;
  menu: string;
  heat: number;
  created_at: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}

function authorized(request: Request) {
  const expected = process.env.HOT_PARTNER_API_KEY;
  const actual = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!expected || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
  if (!process.env.HOT_PARTNER_API_KEY || !process.env.HOT_PARTNER_REFERRAL_SECRET) return json({ error: '파트너 API가 아직 활성화되지 않았습니다.' }, 503);
  if (!authorized(request)) return json({ error: '유효한 파트너 인증이 필요합니다.' }, 401);

  const url = new URL(request.url);
  const pageText = url.searchParams.get('page') ?? '1';
  const limitText = url.searchParams.get('limit') ?? '50';
  if (!/^\d+$/.test(pageText) || !/^\d+$/.test(limitText)) {
    return json({ error: 'page와 limit은 양의 정수여야 합니다.' }, 400);
  }

  const page = Number(pageText);
  const limit = Number(limitText);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    return json({ error: 'page는 1~1000, limit은 1~50 범위로 요청해 주세요.' }, 400);
  }

  try {
    const start = (page - 1) * limit;
    const { data, error } = await publicDb()
      .from('hot_public_menus')
      .select('place_id,shop,menu,heat,created_at')
      .not('place_id', 'is', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(start, start + limit);
    if (error) throw error;

    const rows = (data ?? []) as PublicHotMenu[];
    const hasMore = rows.length > limit;
    const records = rows.slice(0, limit).flatMap((row) => {
      const storeId = row.place_id?.trim();
      if (!storeId) return [];
      const signup = new URL(JOIN_URL);
      signup.searchParams.set('source_store_id', storeId);
      const ownerSignup = signedReferralUrl(storeId);
      return [{
        store_id: storeId,
        store_name: row.shop,
        menu_name: row.menu,
        spicy_level: row.heat,
        member_signup_url: signup.toString(),
        owner_signup_url: ownerSignup,
      }];
    });

    return json({
      data: records,
      pagination: { page, limit, has_more: hasMore },
      data_source: 'HOT / NOWGO',
    });
  } catch (error) {
    console.error('HOT partner menu API failed', error);
    return json({ error: 'HOT 메뉴 정보를 불러오지 못했습니다.' }, 503);
  }
}
