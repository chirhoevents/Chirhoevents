"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, Users, FileText, AlertTriangle } from "lucide-react";

const nav = [
  { name: "Overview", href: "/demo/portal/rapha", icon: Stethoscope },
  { name: "Participants", href: "/demo/portal/rapha/participants", icon: Users },
  { name: "Incidents", href: "/demo/portal/rapha/incidents", icon: AlertTriangle },
  { name: "Reports", href: "/demo/portal/rapha/reports", icon: FileText },
];

export default function RaphaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <header className="bg-[#7A6347] text-white">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/80">Rapha Portal</p>
            <h1 className="text-2xl font-bold">Medical & Incident Tracking</h1>
          </div>
          <Link href="/demo" className="text-sm text-white/80 hover:text-white underline">
            ← Demo home
          </Link>
        </div>
        <nav className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1 border-t border-white/10">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 ${
                  active ? "border-white text-white" : "border-transparent text-white/80 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
