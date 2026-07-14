"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Users,
  Shield,
  Settings,
  Menu,
  X,
  Home,
} from "lucide-react";
import { loadDemoState, type DemoState } from "../../lib/demo-store";

const nav = [
  { name: "Dashboard", href: "/demo/dashboard/group-leader", icon: LayoutDashboard },
  { name: "Payments", href: "/demo/dashboard/group-leader/payments", icon: CreditCard },
  { name: "Liability Forms", href: "/demo/dashboard/group-leader/forms", icon: FileText },
  { name: "Participants", href: "/demo/dashboard/group-leader/participants", icon: Users },
  { name: "Certificates", href: "/demo/dashboard/group-leader/certificates", icon: Shield },
  { name: "Housing", href: "/demo/dashboard/group-leader/housing", icon: Home },
  { name: "Settings", href: "/demo/dashboard/group-leader/settings", icon: Settings },
];

export default function GroupLeaderDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [state, setState] = useState<DemoState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => setState(loadDemoState()), [pathname]);

  const registration = state?.registrations.find((r) => r.id === state.currentRegistrationId) || state?.registrations[0];
  const event = state?.events.find((e) => e.id === registration?.eventId);

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1E3A5F] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ top: "36px" }}
      >
        <div className="flex flex-col h-[calc(100%-36px)]">
          <div className="flex items-center justify-center h-20 px-4 border-b border-white/20 relative">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white absolute top-4 right-4"
            >
              <X className="h-6 w-6" />
            </button>
            <Link href="/demo" className="text-white font-bold text-lg">
              ChiRho Events
            </Link>
          </div>

          <div className="px-4 py-4 border-b border-white/20">
            <p className="text-xs text-[#E8DCC8] mb-2 px-2">Current Event</p>
            <div className="bg-[#2A4A6F] rounded p-2 text-white">
              <div className="font-medium text-sm truncate">{event?.name || "—"}</div>
              <div className="text-xs text-[#E8DCC8] truncate">{registration?.groupName}</div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-white rounded-lg transition-colors group ${
                    active ? "bg-white/15" : "hover:bg-white/10"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3 text-[#9C8466]" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-6 py-4 border-t border-white/20">
            <p className="text-sm font-medium text-white">Demo Account</p>
            <p className="text-xs text-white/70">{registration?.leaderName}</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="bg-white border-b border-[#E1D5BA] sticky top-[36px] z-30">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#1E3A5F]">
              <Menu className="h-6 w-6" />
            </button>
            {event && (
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-[#1E3A5F]">{event.name}</h2>
                <p className="text-sm text-[#6B7280]">{registration?.groupName}</p>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#9C8466] text-white flex items-center justify-center text-sm font-semibold">
                {registration?.leaderName?.[0] || "D"}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
