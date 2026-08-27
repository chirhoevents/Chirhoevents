import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo | ChiRho Events",
  description:
    "Interactive walkthrough of ChiRho Events. Nothing here is real — no payments, no emails, no accounts. All data is stored locally in your browser.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <div className="sticky top-0 z-[60] w-full bg-[#9C8466] text-white border-b border-[#7A6347] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-bold uppercase tracking-wider text-xs bg-white text-[#9C8466] px-2 py-0.5 rounded">
              Demo
            </span>
            <span className="hidden sm:inline text-white/90">
              Sandbox mode — no real payments, no emails sent, no accounts required. Data saves only to this browser.
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/demo" className="underline hover:no-underline">
              Demo home
            </Link>
            <Link href="/" className="underline hover:no-underline">
              Back to real site
            </Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
