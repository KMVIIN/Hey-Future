import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hey-future.vercel.app"),
  title: "Future — Your AI Secretary",
  description: "Think it. Say it. Done. Future plans multi-step work, remembers what matters, and asks before sensitive actions.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Future", statusBarStyle: "default" },
  icons: { apple: "/icon-192.png", icon: [{ url: "/icon-192.png", sizes: "192x192" }, { url: "/icon-512.png", sizes: "512x512" }] },
  openGraph: {
    title: "Future — Your AI Secretary",
    description: "A calmer, smarter day — powered by Future.",
    url: "https://hey-future.vercel.app",
    siteName: "Future",
    images: [{ url: "/og-future.png", width: 1200, height: 630, alt: "Future — Your AI Secretary" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Future — Your AI Secretary", description: "Think it. Say it. Done.", images: ["/og-future.png"] },
};

export const viewport: Viewport = {
  themeColor: "#eef1ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
