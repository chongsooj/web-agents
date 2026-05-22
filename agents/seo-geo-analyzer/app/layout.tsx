import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEO & GEO 분석기 — AI 시대의 검색 최적화",
  description: "URL 하나로 SEO · GEO · 글로벌 랭킹을 한눈에 분석. AI 검색엔진에 내 사이트가 보이는지 확인하세요.",
  openGraph: {
    title: "SEO & GEO 분석기",
    description: "AI 시대의 검색 최적화 분석 도구",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0a0a0f] text-white">{children}</body>
    </html>
  );
}
