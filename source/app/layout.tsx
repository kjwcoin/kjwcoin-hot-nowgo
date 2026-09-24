import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOWGO | 맛잘알이 제보하는 핫한 맛부심",
  description: "맛잘알이 제보하는 핫한 맛부심. 메뉴·맵기·한 끼 예산으로 찾고 NOWGO에서 상태를 확인해요.",
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
