import { redirect } from "next/navigation";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "HOT 통합운영지표", robots: { index: false, follow: false } };
export default function HotAdmin() { redirect("https://nowgo.space/admin/metrics?site=hot"); }
