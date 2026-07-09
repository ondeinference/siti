import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsiti.5mb.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Siti AI: a private on-device AI assistant",
    template: "%s · Siti AI",
  },
  description:
    "Siti AI is a private, on-device AI assistant for macOS and iOS. Your conversations stay on your device.",
  openGraph: {
    title: "Siti AI: a private on-device AI assistant",
    description:
      "A private, on-device AI assistant for macOS and iOS. Your conversations stay on your device.",
    url: SITE_URL,
    siteName: "Siti AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Siti AI: a private on-device AI assistant",
    description:
      "A private, on-device AI assistant for macOS and iOS. Your conversations stay on your device.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-bg text-ink">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
