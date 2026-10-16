import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "HOT 운영 지표 | NOWGO",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HotMetricsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const target = new URL("https://www.nowgo.space/admin/metrics");
  target.searchParams.set("site", "hot");

  for (const key of ["from", "to"] as const) {
    const value = first(query[key]);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      target.searchParams.set(key, value);
    }
  }

  redirect(target.toString());
}
