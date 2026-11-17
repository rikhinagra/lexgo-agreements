import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter is one of the most widely used fonts on professional websites and apps.
// next/font hosts it on our own server, so pages stay fast and our strict security
// policy does not need to allow Google.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "LexGo Agreements", template: "%s | LexGo Agreements" },
  description: "MOU signing and invoicing for LexGo Solutions.",
  // Internal tool, keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Colors the phone browser bar to match the navy header.
  themeColor: "#0A1F44",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
