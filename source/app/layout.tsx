import { socialMetadata } from "@/lib/social-preview";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sweet.nowgo.space"),
  title: {
    default: "나우고 SWEET | 전국 카페·베이커리·디저트 지도",
    template: "%s | 나우고 SWEET",
  },
  description: "대한민국 전국의 카페, 베이커리, 케이크, 빵, 아이스크림과 디저트를 발견하고 제보하는 참여형 디저트 지도입니다.",
  alternates: { canonical: "/" },
  ...socialMetadata("sweet"),
  robots: { index: true, follow: true },
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ko"><body className="antialiased">{children}</body></html>;
}
