import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Founder Growth Agent — B2B Growth Strategist for Solo Founders",
  description: "AI-powered founder-led growth strategist. Positioning, messaging, content, outreach — organic, $0-budget B2B growth.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0f] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}