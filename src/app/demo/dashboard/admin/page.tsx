"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Users, DollarSign, Store } from "lucide-react";
import { loadDemoState, type DemoState } from "../../lib/demo-store";

export default function AdminDashboard() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const totalRegistrations = state.registrations.length;
  const totalParticipants = state.registrations.reduce((n, r) => n + r.participants.length, 0);
  const totalRevenue = state.registrations.reduce((n, r) => n + r.amountPaid, 0);
  const totalOutstanding = state.registrations.reduce((n, r) => n + r.balanceDue, 0);

  return (
    <div className="max-w-6xl">
      <h2 className="text-3xl font-bold text-[#1E3A5F] mb-6">Overview</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat icon={CalendarDays} label="Active events" value={state.events.length} />
        <Stat icon={Users} label="Total participants" value={totalParticipants} />
        <Stat icon={DollarSign} label="Revenue collected" value={`$${totalRevenue.toLocaleString()}`} />
        <Stat icon={DollarSign} label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} accent="text-amber-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent registrations" href="/demo/dashboard/admin/registrations">
          <ul className="divide-y divide-[#E1D5BA]">
            {state.registrations.slice(0, 5).map((r) => (
              <li key={r.id} className="py-3 flex justify-between">
                <div>
                  <div className="font-medium">
                    {r.groupName || `${r.participants[0]?.firstName} ${r.participants[0]?.lastName}`}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.participants.length} participant(s) · {r.kind}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div>${r.amountPaid}</div>
                  {r.balanceDue > 0 && <div className="text-xs text-amber-600">${r.balanceDue} due</div>}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Pending vendor apps" href="/demo/dashboard/admin/vendors">
          <ul className="divide-y divide-[#E1D5BA]">
            {state.vendors
              .filter((v) => v.status === "pending")
              .map((v) => (
                <li key={v.id} className="py-3 flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#9C8466]" />
                  <div>
                    <div className="font-medium text-sm">{v.businessName}</div>
                    <div className="text-xs text-slate-500">{v.boothType}</div>
                  </div>
                </li>
              ))}
            {state.vendors.filter((v) => v.status === "pending").length === 0 && (
              <li className="py-3 text-sm text-slate-500">No pending applications.</li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className="h-5 w-5 text-[#9C8466]" />
      </div>
      <div className={`text-3xl font-bold ${accent || "text-[#1E3A5F]"}`}>{value}</div>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-[#1E3A5F]">{title}</h3>
        <Link href={href} className="text-xs text-[#9C8466] hover:underline">
          View all →
        </Link>
      </div>
      {children}
    </div>
  );
}
