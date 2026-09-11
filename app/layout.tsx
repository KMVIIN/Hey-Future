import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future — Your AI Secretary",
  description: "A multilingual executive assistant for remembering, answering and acting.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Future", statusBarStyle: "default" },
  icons: { apple: "/icon-192.png", icon: [{ url: "/icon-192.png", sizes: "192x192" }, { url: "/icon-512.png", sizes: "512x512" }] },
};

export const viewport: Viewport = {
  themeColor: "#172033",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
