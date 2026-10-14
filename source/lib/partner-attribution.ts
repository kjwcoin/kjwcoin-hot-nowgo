import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'hot_partner_referral';
const MAX_AGE = 30 * 24 * 60 * 60;

function signature(secret: string, storeRef: string, expires: string) {
  return createHmac('sha256', secret).update(`balbadak|${storeRef}|${expires}`).digest('hex');
}

export function signedReferralUrl(storeRef: string) {
  const secret = process.env.HOT_PARTNER_REFERRAL_SECRET;
  if (!secret) throw new Error('Partner referral signing is not configured');
  const expires = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const sig = signature(secret, storeRef, expires);
  const url = new URL('/api/partner/v1/balbadak/referral', 'https://hot.nowgo.space');
  url.searchParams.set('store_id', storeRef);
  url.searchParams.set('expires', expires);
  url.searchParams.set('sig', sig);
  return url.toString();
}

export function setReferralCookie(storeRef: string, expires: string, sig: string) {
  const secret = process.env.HOT_PARTNER_REFERRAL_SECRET;
  if (!secret) return null;
  const expected = Buffer.from(signature(secret, storeRef, expires), 'hex');
  const actual = Buffer.from(sig, 'hex');
  const now = Math.floor(Date.now() / 1000);
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual) || Number(expires) < now || Number(expires) > now + MAX_AGE) return null;
  const value = Buffer.from(`${storeRef}\n${expires}\n${sig}`).toString('base64url');
  return `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

export function readReferralCookie(request: Request) {
  const secret = process.env.HOT_PARTNER_REFERRAL_SECRET;
  if (!secret) return null;
  const raw = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw || raw.length > 512) return null;
  try {
    const [storeRef, expires, sig] = Buffer.from(raw, 'base64url').toString().split('\n');
    if (!storeRef || !expires || !sig || Number(expires) < Math.floor(Date.now() / 1000)) return null;
    const expected = Buffer.from(signature(secret, storeRef, expires), 'hex');
    const actual = Buffer.from(sig, 'hex');
    return actual.length === expected.length && timingSafeEqual(expected, actual) ? storeRef : null;
  } catch { return null; }
}

export function clearReferralCookie() { return `${COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`; }
