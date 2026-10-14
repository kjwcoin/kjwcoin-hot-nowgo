import { setReferralCookie } from '@/lib/partner-attribution';
const headers = { 'Cache-Control': 'no-store' };
export function GET(request: Request) {
  const url = new URL(request.url);
  const storeRef = url.searchParams.get('store_id') ?? '';
  const expires = url.searchParams.get('expires') ?? '';
  const sig = url.searchParams.get('sig') ?? '';
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(storeRef)) return new Response('유효하지 않은 제휴 링크입니다.', { status: 400, headers });
  const cookie = setReferralCookie(storeRef, expires, sig);
  if (!cookie) return new Response('만료되었거나 유효하지 않은 제휴 링크입니다.', { status: 401, headers });
  return new Response(null, { status: 303, headers: { ...headers, Location: '/owner/signup', 'Set-Cookie': cookie } });
}
