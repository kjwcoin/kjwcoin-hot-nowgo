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
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "나우고 RICH",
    title: "나우고 RICH | 전국 카페·디저트 지도",
    description: "오늘 당기는 달콤함을 찾다. 전국의 느끼한 음식·크림·버터·치즈를 발견하고 제보하는 NOWGO SWEET.",
  },
  twitter: {
    card: "summary_large_image",
    title: "나우고 RICH | 전국 카페·디저트 지도",
    description: "오늘 당기는 달콤함을 찾다. 전국 느끼한 음식·크림·버터·치즈 지도.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ko"><body className="antialiased">{children}</body></html>;
}
