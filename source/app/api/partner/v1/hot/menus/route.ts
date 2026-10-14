import { publicDb } from '@/lib/supabase';

const API_ORIGIN = 'https://hot.nowgo.space';
const MEMBER_JOIN_URL = new URL('/account/join', API_ORIGIN);
MEMBER_JOIN_URL.searchParams.set('type', 'user');
MEMBER_JOIN_URL.searchParams.set('returnTo', '/');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

type PublicHotMenu = {
  id: string;
  place_id: string | null;
  shop: string;
  menu: string;
  heat: number;
  created_at: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageText = url.searchParams.get('page') ?? '1';
  const limitText = url.searchParams.get('limit') ?? '100';

  if (!/^\\d+$/.test(pageText) || !/^\\d+$/.test(limitText)) {
    return json({ error: 'page와 limit은 양의 정수여야 합니다.' }, 400);
  }

  const page = Number(pageText);
  const limit = Number(limitText);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return json({ error: 'page는 1~10000, limit은 1~100 범위로 요청해 주세요.' }, 400);
  }

  try {
    const start = (page - 1) * limit;
    const { data, error } = await publicDb()
      .from('hot_public_menus')
      .select('id,place_id,shop,menu,heat,created_at')
      .not('place_id', 'is', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(start, start + limit);

    if (error) throw error;

    const rows = (data ?? []) as PublicHotMenu[];
    const hasMore = rows.length > limit;
    const menus = rows.slice(0, limit).flatMap((row) => {
      const storeId = row.place_id?.trim();
      if (!storeId) return [];
      return [{
        store_id: storeId,
        store_name: row.shop,
        menu_name: row.menu,
        spicy_level: row.heat,
      }];
    });

    return json({
      data: menus,
      pagination: { page, limit, has_more: hasMore },
      member_signup_url: MEMBER_JOIN_URL.toString(),
    });
  } catch (error) {
    console.error('HOT partner menu API failed', error);
    return json({ error: 'HOT 메뉴 정보를 불러오지 못했습니다.' }, 503);
  }
}
