import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOWGO | 취향별 메뉴 지도",
  description: "HOT·RICH·SWEET에서 취향과 한 끼 예산에 맞는 메뉴를 찾고 NOWGO에서 출발 전 매장 상태를 확인해요.",
  icons: {
    icon: { url: "/favicon-red.png", type: "image/png", sizes: "128x128" },
    shortcut: "/favicon-red.png",
    apple: "/favicon-red.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
