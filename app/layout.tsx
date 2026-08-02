import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "秋招日历｜投递与面试进度管理",
    description: "集中管理秋招投递截止日期、测评安排和面试进度。",
    icons: { icon: "/favicon.svg" },
    openGraph: { title: "秋招日历", description: "把每一次机会安排得刚刚好", images: [image] },
    twitter: { card: "summary_large_image", title: "秋招日历", description: "把每一次机会安排得刚刚好", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
