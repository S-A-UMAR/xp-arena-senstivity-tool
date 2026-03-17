import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XP Arena | Pro Sensitivity Calculator",
  description:
    "Optimize your mobile gaming sensitivity settings with AI-powered calibration for Free Fire, PUBG Mobile, COD Mobile, and more.",
  keywords: [
    "sensitivity calculator",
    "free fire sensitivity",
    "pubg mobile settings",
    "gaming sensitivity",
    "mobile esports",
    "aim training",
  ],
  authors: [{ name: "XP Arena" }],
  openGraph: {
    title: "XP Arena | Pro Sensitivity Calculator",
    description:
      "Optimize your mobile gaming sensitivity settings with AI-powered calibration",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#00f0ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background`}
      >
        <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="relative z-10">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
