import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo | ChiRho Events",
  description:
    "Interactive demo of ChiRho Events. Nothing here is real — no payments, no emails, no accounts.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-50 w-full bg-amber-400 text-slate-900 border-b border-amber-500">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-bold uppercase tracking-wider">Demo</span>
            <span className="hidden sm:inline text-amber-900">
              Nothing here is real. No payments. No emails. Data saves to this
              browser only.
            </span>
          </div>
          <div className="flex items-center gap-4">
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
