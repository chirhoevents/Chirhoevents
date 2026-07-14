"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Store,
  Mail,
  BarChart3,
} from "lucide-react";

const nav = [
  { name: "Dashboard", href: "/demo/dashboard/admin", icon: LayoutDashboard },
  { name: "Events", href: "/demo/dashboard/admin/events", icon: CalendarDays },
  { name: "Registrations", href: "/demo/dashboard/admin/registrations", icon: Users },
  { name: "Vendors", href: "/demo/dashboard/admin/vendors", icon: Store },
  { name: "Emails", href: "/demo/dashboard/admin/emails", icon: Mail },
  { name: "Reports", href: "/demo/dashboard/admin/reports", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <aside className="fixed inset-y-0 left-0 w-56 bg-[#1E3A5F]" style={{ top: "36px" }}>
        <div className="p-5 border-b border-white/20">
          <p className="text-xs uppercase tracking-wider text-[#E8DCC8]">Organization</p>
          <p className="text-white font-semibold text-sm">Steubenville Ministries</p>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm ${
                  active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4 text-[#9C8466]" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="pl-56">
        <header className="bg-white border-b border-[#E1D5BA] sticky top-[36px] z-30 px-8 py-4">
          <h1 className="text-lg font-semibold text-[#1E3A5F]">Organization Admin</h1>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
