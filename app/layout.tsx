import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./refresh.css";
import "./business.css";
import "./operations.css";
import "./daily-work.css";
import "./task-work.css";
import "./customer-work.css";
import "./mobile-work.css";

export const metadata: Metadata = {
  title: "Magnussons CRM",
  appleWebApp: {capable:true,title:"Magnussons",statusBarStyle:"default"},
  description: "Kundrelationer, affärer och leveransuppföljning i en gemensam arbetsyta.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#202831"};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
