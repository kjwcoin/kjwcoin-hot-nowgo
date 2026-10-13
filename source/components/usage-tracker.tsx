"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { browserDb } from "@/lib/supabase-browser";
import { startUsageMetrics } from "@/lib/usage-metrics";
export function UsageTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!enabled || pathname?.startsWith('/app/')) return;
    return startUsageMetrics(pathname ?? "/", "https://nowgo.space/api/nowgo/analytics/session", async () =>
      (await browserDb().auth.getSession()).data.session?.access_token ?? null);
  }, [enabled, pathname]);
  return null;
}
