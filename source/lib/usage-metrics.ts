type Session = { id: string; visitor: string; lastSeen: number; created: number; engaged: number; views: number; source: string; campaign: string; device: string };
const VISITOR_KEY = "nowgo.metrics.visitor.v1";
const SESSION_KEY = "nowgo.metrics.session.v1";
const CONSENT_KEY = "nowgo.analytics.v1";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let lastPath = "";

export function acquisitionSource(location: Pick<Location, "search" | "hostname">, referrer: string) {
  const params = new URLSearchParams(location.search);
  const tag = (params.get("utm_source") ?? "").toLowerCase();
  let host = "";
  try { host = new URL(referrer).hostname.toLowerCase(); } catch { /* no referrer */ }
  const matches = (domain: string) => host === domain || host.endsWith("." + domain);
  const source = ["threads", "instagram", "naver", "google", "kakao"].includes(tag) ? tag :
    matches("threads.net") || matches("threads.com") ? "threads" : matches("instagram.com") ? "instagram" :
    matches("naver.com") ? "naver" : matches("google.com") || matches("google.co.kr") ? "google" :
    matches("kakao.com") ? "kakao" : matches("nowgo.space") ? "nowgo" : host ? "other" : "direct";
  const campaign = params.get("utm_campaign") ?? "";
  return { source, campaign: /^[a-z0-9_-]{1,64}$/i.test(campaign) ? campaign : "" };
}

function allowed() {
  try { return localStorage.getItem(CONSENT_KEY) === "granted" && navigator.doNotTrack !== "1"; } catch { return false; }
}

function getSession(): Session | null {
  try {
    const now = Date.now();
    const raw: unknown = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const s = raw as Session;
      if (uuid.test(s.id) && uuid.test(s.visitor) && Number.isFinite(s.created) && Number.isFinite(s.lastSeen) &&
        Number.isFinite(s.engaged) && s.engaged >= 0 && Number.isInteger(s.views) && s.views >= 0 &&
        now >= s.lastSeen && now - s.lastSeen < 30 * 60_000 && now - s.created < 86_400_000) return s;
    }
    let visitor = localStorage.getItem(VISITOR_KEY) ?? "";
    if (!uuid.test(visitor)) { visitor = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, visitor); }
    const device = /ipad|tablet/i.test(navigator.userAgent) ? "tablet" : /mobi|android/i.test(navigator.userAgent) ? "mobile" : "desktop";
    return { id: crypto.randomUUID(), visitor, lastSeen: now, created: now, engaged: 0, views: 0, device, ...acquisitionSource(window.location, document.referrer) };
  } catch { return null; }
}

/** Consent-only first-party telemetry. Sends no URL, query, referrer, name or contact data. */
export function startUsageMetrics(pathname: string, endpoint: string, getToken?: () => Promise<string | null>) {
  if (/^\/(admin|auth|checkout)(\/|$)/.test(pathname) || /bot|crawl|spider|headless/i.test(navigator.userAgent)) return () => {};
  let session: Session | null = null;
  let timer: number | undefined;
  let previous = performance.now();
  let lastActivity = Date.now();
  let visible = !document.hidden;
  let active = false;
  const save = () => { try { if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* storage unavailable */ } };
  const transmit = async (keepalive = false) => {
    if (!allowed() || !session) return;
    const record = { sessionId: session.id, visitorId: session.visitor, engagedMs: Math.round(session.engaged),
      pageViews: session.views, source: session.source, campaign: session.campaign, device: session.device };
    try {
      const token = await getToken?.().catch(() => null);
      if (!allowed()) return;
      await fetch(endpoint, { method: "POST", credentials: "include", keepalive,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(record), signal: keepalive ? undefined : AbortSignal.timeout(8000) });
    } catch { /* telemetry cannot block product actions */ }
  };
  const tick = () => {
    const now = performance.now();
    const wall = Date.now();
    const delta = Math.max(0, Math.min(now - previous, 15_000)); previous = now;
    if (!allowed() || !session || !visible || wall - lastActivity > 60_000) return;
    if (wall - session.lastSeen >= 30 * 60_000 || wall - session.created >= 86_400_000) {
      session = getSession(); if (!session) return; session.views += 1;
    }
    session.engaged += delta; session.lastSeen = wall; save(); void transmit();
  };
  const activity = () => { lastActivity = Date.now(); };
  const visibility = () => { tick(); visible = !document.hidden; previous = performance.now(); if (visible) activity(); else void transmit(true); };
  const pagehide = () => { tick(); void transmit(true); };
  const choice = () => {
    if (allowed() && !active) {
      session = getSession(); if (!session) return;
      if (lastPath !== pathname || session.views === 0) { session.views += 1; lastPath = pathname; }
      save(); active = true; previous = performance.now(); activity();
      timer = window.setInterval(tick, 10_000); void transmit();
    } else if (!allowed() && active) {
      window.clearInterval(timer); active = false; session = null; lastPath = "";
      try { localStorage.removeItem(VISITOR_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { /* no storage */ }
    }
  };
  window.addEventListener("nowgo:analytics-consent", choice); window.addEventListener("storage", choice);
  document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", pagehide);
  for (const event of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) window.addEventListener(event, activity, { passive: true });
  choice();
  return () => {
    tick(); window.clearInterval(timer); void transmit(true);
    window.removeEventListener("nowgo:analytics-consent", choice); window.removeEventListener("storage", choice);
    document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", pagehide);
    for (const event of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) window.removeEventListener(event, activity);
  };
}
