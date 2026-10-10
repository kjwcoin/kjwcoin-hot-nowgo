"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { browserDb } from "@/lib/supabase-browser";
import { startUsageMetrics } from "@/lib/usage-metrics";
function snapshot() { try { return localStorage.getItem("nowgo.analytics.v1"); } catch { return "denied"; } }
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener); window.addEventListener("nowgo:analytics-consent", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("nowgo:analytics-consent", listener); };
}
export function UsageTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribe, snapshot, () => null);
  useEffect(() => {
    if (!enabled || pathname?.startsWith('/app/')) return;
    return startUsageMetrics(pathname ?? "/", "https://nowgo.space/api/nowgo/analytics/session", async () =>
      (await browserDb().auth.getSession()).data.session?.access_token ?? null);
  }, [enabled, pathname]);
  if (!enabled || pathname?.startsWith("/app/") || pathname?.startsWith("/admin") || pathname?.startsWith("/auth")) return null;
  function choose(value: "granted" | "denied") {
    try { localStorage.setItem("nowgo.analytics.v1", value); } catch { return; }
    window.dispatchEvent(new Event("nowgo:analytics-consent"));
  }
  return <aside aria-label="이용 통계 설정" className="hot-metrics-consent">
    {!choice ? <><p>서비스 개선을 위한 이용 통계를 허용하시겠어요?</p><div><button type="button" onClick={() => choose("granted")}>통계 허용</button><button type="button" onClick={() => choose("denied")}>필수 기능만 사용</button></div></> :
      <button type="button" onClick={() => choose(choice === "granted" ? "denied" : "granted")}>이용 통계 {choice === "granted" ? "허용 중 · 철회" : "사용 안 함 · 허용"}</button>}
  </aside>;
}
