import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://chirhoevents.com'),
  title: {
    default: "ChiRho Events - Catholic Event Registration Made Simple",
    template: "%s | ChiRho Events",
  },
  description: "Professional event registration platform for Catholic youth ministry. Manage registrations, payments, liability forms, and housing for Steubenville conferences, diocesan retreats, and parish events.",
  keywords: ["Catholic", "event registration", "youth ministry", "Steubenville", "diocese", "retreat registration", "liability forms", "conference registration"],
  authors: [{ name: "ChiRho Events" }],
  creator: "ChiRho Events",
  publisher: "ChiRho Events",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chirhoevents.com",
    siteName: "ChiRho Events",
    title: "ChiRho Events - Catholic Event Registration Made Simple",
    description: "Professional event registration platform for Catholic youth ministry. Manage registrations, payments, liability forms, and housing.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ChiRho Events - Catholic Event Registration Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChiRho Events - Catholic Event Registration Made Simple",
    description: "Professional event registration platform for Catholic youth ministry conferences, retreats, and events.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
