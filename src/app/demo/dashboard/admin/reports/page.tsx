"use client";

import { useEffect, useState } from "react";
import { Download, TrendingUp, Users, DollarSign } from "lucide-react";
import { loadDemoState, type DemoState } from "../../../lib/demo-store";

export default function AdminReports() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const revenue = state.registrations.reduce((n, r) => n + r.amountPaid, 0);
  const outstanding = state.registrations.reduce((n, r) => n + r.balanceDue, 0);
  const participants = state.registrations.reduce((n, r) => n + r.participants.length, 0);

  return (
    <div className="max-w-5xl">
      <h2 className="text-3xl font-bold text-[#1E3A5F] mb-6">Reports</h2>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Metric icon={DollarSign} label="Revenue" value={`$${revenue.toLocaleString()}`} />
        <Metric icon={TrendingUp} label="Outstanding" value={`$${outstanding.toLocaleString()}`} />
        <Metric icon={Users} label="Participants" value={participants} />
      </div>

      <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">Available exports</h3>
        <div className="grid gap-2">
          {[
            "Full participant roster (CSV)",
            "Registration summary (PDF)",
            "Financial reconciliation (CSV)",
            "Waiver status export",
            "Housing assignments",
            "Vendor list",
          ].map((r) => (
            <button
              key={r}
              onClick={() => alert(`Demo: would export "${r}".`)}
              className="flex justify-between items-center px-4 py-3 border border-[#E1D5BA] hover:bg-[#F5F1E8] rounded text-sm"
            >
              <span>{r}</span>
              <Download className="h-4 w-4 text-[#9C8466]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className="h-5 w-5 text-[#9C8466]" />
      </div>
      <div className="text-2xl font-bold text-[#1E3A5F]">{value}</div>
    </div>
  );
}
