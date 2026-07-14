"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, UserCheck, Package, Printer } from "lucide-react";

const nav = [
  { name: "Check-in Dashboard", href: "/demo/portal/salve", icon: ClipboardCheck },
  { name: "Participants", href: "/demo/portal/salve/participants", icon: UserCheck },
  { name: "Name Tags", href: "/demo/portal/salve/name-tags", icon: Printer },
  { name: "Welcome Packets", href: "/demo/portal/salve/welcome-packets", icon: Package },
];

export default function SalveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#E8DCC8]">Salve Portal</p>
            <h1 className="text-2xl font-bold">Check-in & Hospitality</h1>
          </div>
          <Link href="/demo" className="text-sm text-[#E8DCC8] hover:text-white underline">
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
                  active
                    ? "border-[#9C8466] text-white"
                    : "border-transparent text-[#E8DCC8] hover:text-white"
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
