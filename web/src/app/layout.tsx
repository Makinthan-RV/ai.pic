import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Event Photo Finder",
  description: "Guests scan a QR, upload a selfie, and instantly get their event photos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
