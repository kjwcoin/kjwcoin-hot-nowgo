import { redirect } from "next/navigation";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "HOT 관리자 지표", robots: { index: false, follow: false } };
export default function HotAdmin() { redirect("https://www.nowgo.space/admin/metrics?site=hot"); }
