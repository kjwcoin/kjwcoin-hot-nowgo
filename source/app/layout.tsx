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
    url: "/",
    title: "RICH | 맛잘알의 리치한 맛 지도",
    description: "크리미하고 버터리한 메뉴를 취향대로 찾아보세요.",
    images: [{ url: "https://rich.nowgo.space/og/share-rich-03-20260926-v2.jpg", width: 1200, height: 630, alt: "RICH | 맛잘알의 리치한 맛 지도 공유 이미지" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RICH | 맛잘알의 리치한 맛 지도",
    description: "크리미하고 버터리한 메뉴를 취향대로 찾아보세요.",
    images: ["https://rich.nowgo.space/og/share-rich-03-20260926-v2.jpg"],
  },
  robots: { index: true, follow: true },
  icons: { icon: {url: "/favicon-beige.png", type: "image/png"}, shortcut: "/favicon-beige.png", apple: "/favicon-beige.png" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ko"><body className="antialiased">{children}</body></html>;
}
