import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import BackendStatus from "@/components/layout/BackendStatus";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "STLL Haus POS",
  description: "Point of Sale system for STLL Haus café",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-stll-cream text-stll-charcoal antialiased font-sans">
        <div className="flex h-screen-safe">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-0">
            <BackendStatus />
            <main className="flex-1 min-h-0 bg-stll-cream">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}