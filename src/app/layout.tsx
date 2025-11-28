import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChiRho Events - Catholic Event Registration Platform",
  description: "The complete Catholic registration platform for ministry. Built for Steubenville conferences, diocesan retreats, and Catholic youth events—at 30% lower cost than competitors.",
  keywords: ["Catholic", "event registration", "youth ministry", "Steubenville", "diocese", "retreat registration"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
