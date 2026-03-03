import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

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
    <html lang="en">
      <body className="bg-beige-100 text-cafe-dark antialiased">
        <div className="flex flex-col h-screen-safe">
          <Navbar />
          <main className="flex-1 min-h-0">{children}</main>
        </div>
      </body>
    </html>
  );
}