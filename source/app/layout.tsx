import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOWGO | 맛잘알이 제보하는 핫한 맛부심",
  description: "맛잘알이 제보하는 핫한 맛부심. 메뉴·맵기·한 끼 예산으로 찾고 NOWGO에서 상태를 확인해요.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
