import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "Recruitment Calendar | Application Tracker",
    description: "Track application deadlines, assessments and interviews in one place.",
    icons: { icon: "/favicon.svg" },
    openGraph: { title: "Recruitment Calendar", description: "Keep every opportunity on track", images: [image] },
    twitter: { card: "summary_large_image", title: "Recruitment Calendar", description: "Keep every opportunity on track", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
