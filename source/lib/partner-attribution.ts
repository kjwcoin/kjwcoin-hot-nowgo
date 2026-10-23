import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'hot_partner_referral';
const MAX_AGE = 30 * 24 * 60 * 60;
export type PartnerReferralTarget = 'user' | 'owner';

function signature(secret: string, storeRef: string, expires: string, target: PartnerReferralTarget) {
  return createHmac('sha256', secret).update(`balbadak|${storeRef}|${expires}|${target}`).digest('hex');
}

export function signedReferralUrl(storeRef: string, target: PartnerReferralTarget = 'owner') {
  const secret = process.env.HOT_PARTNER_REFERRAL_SECRET;
  if (!secret) throw new Error('Partner referral signing is not configured');
  const expires = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const sig = signature(secret, storeRef, expires, target);
  const url = new URL('/api/partner/v1/balbadak/referral', 'https://hot.nowgo.space');
  url.searchParams.set('store_id', storeRef);
  url.searchParams.set('target', target);
  url.searchParams.set('expires', expires);
  url.searchParams.set('sig', sig);
  return url.toString();
}

export function setReferralCookie(storeRef: string, expires: string, sig: string, target: PartnerReferralTarget) {
  const secret = process.env.HOT_PARTNER_REFERRAL_SECRET;
  if (!secret) return null;
  const expected = Buffer.from(signature(secret, storeRef, expires, target), 'hex');
  const actual = Buffer.from(sig, 'hex');
  const now = Math.floor(Date.now() / 1000);
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual) || Number(expires) < now || Number(expires) > now + MAX_AGE) return null;
  const value = Buffer.from(`${storeRef}\n${expires}\n${target}\n${sig}`).toString('base64url');
  return `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

export function readReferralCookie(request: Request) {
  const secret = process.env.HOT_PARTNER_REFERRAL_SECRET;
  if (!secret) return null;
  const raw = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw || raw.length > 512) return null;
  try {
    const [storeRef, expires, targetRaw, sig] = Buffer.from(raw, 'base64url').toString().split('\n');
    const target = targetRaw === 'user' ? 'user' : targetRaw === 'owner' ? 'owner' : null;
    if (!storeRef || !expires || !target || !sig || Number(expires) < Math.floor(Date.now() / 1000)) return null;
    const expected = Buffer.from(signature(secret, storeRef, expires, target), 'hex');
    const actual = Buffer.from(sig, 'hex');
    return actual.length === expected.length && timingSafeEqual(expected, actual) ? { storeRef, target } : null;
  } catch { return null; }
}

export function clearReferralCookie() { return `${COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`; }
