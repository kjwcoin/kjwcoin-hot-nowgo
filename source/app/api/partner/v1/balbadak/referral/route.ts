import { setReferralCookie, type PartnerReferralTarget } from '@/lib/partner-attribution';
const headers = { 'Cache-Control': 'no-store' };
export function GET(request: Request) {
  const url = new URL(request.url);
  const storeRef = url.searchParams.get('store_id') ?? '';
  const expires = url.searchParams.get('expires') ?? '';
  const sig = url.searchParams.get('sig') ?? '';
  const target: PartnerReferralTarget = url.searchParams.get('target') === 'user' ? 'user' : 'owner';
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(storeRef)) return new Response('유효하지 않은 제휴 링크입니다.', { status: 400, headers });
  const cookie = setReferralCookie(storeRef, expires, sig, target);
  if (!cookie) return new Response('만료되었거나 유효하지 않은 제휴 링크입니다.', { status: 401, headers });
  const location = target === 'user'
    ? '/account/join?type=user&returnTo=%2Fsuggestion%23report'
    : '/owner/signup';
  return new Response(null, { status: 303, headers: { ...headers, Location: location, 'Set-Cookie': cookie } });
}
