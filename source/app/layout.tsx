import { socialMetadata } from "@/lib/social-preview";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rich.nowgo.space"),
  title: {
    default: "나우고 RICH | 전국 느끼한 음식·크림·버터·치즈 지도",
    template: "%s | 나우고 RICH",
  },
  description: "대한민국 전국의 크림 파스타, 버터 요리, 치즈 그라탱, 튀김과 진한 디저트를 발견하고 제보하는 참여형 디저트 지도입니다.",
  alternates: { canonical: "/" },
  ...socialMetadata("rich"),
  robots: { index: true, follow: true },
  icons: { icon: {url: "/favicon-beige.png", type: "image/png"}, shortcut: "/favicon-beige.png", apple: "/favicon-beige.png" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ko"><body className="antialiased">{children}</body></html>;
}
