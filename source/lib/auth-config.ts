// Public browser credentials for NOWGO's existing unified account project.
// Never put a service-role key here. A different project must supply its own key.
const NOWGO_AUTH_URL = 'https://tdkjdukblopypgoecuhh.supabase.co';
const NOWGO_PUBLIC_KEY = 'sb_publishable_sAjrbQrfQ7PKMNSMImAHDQ_hu4bgqMP';

export function resolvePublicConfig(configuredUrl?: string, configuredKey?: string) {
  const url = configuredUrl?.trim().replace(/\/$/, '') || NOWGO_AUTH_URL;
  const key = configuredKey?.trim() || (url === NOWGO_AUTH_URL ? NOWGO_PUBLIC_KEY : '');
  return {url, key, ready: Boolean(url && key)};
}

export function publicConfig() {
  return resolvePublicConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
