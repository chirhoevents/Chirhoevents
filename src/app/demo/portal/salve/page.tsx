"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { loadDemoState, type DemoState } from "../../lib/demo-store";

export default function SalveDashboard() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const event = state.events.find((e) => e.id === state.currentEventId) || state.events[0];
  const allParticipants = state.registrations
    .filter((r) => r.eventId === event.id)
    .flatMap((r) => r.participants.map((p) => ({ ...p, groupName: r.groupName || "Individual" })));

  const checkedIn = allParticipants.filter((p) => p.checkedIn).length;
  const nametagPrinted = allParticipants.filter((p) => p.nametagPrinted).length;
  const total = allParticipants.length;

  const byGroup = state.registrations
    .filter((r) => r.eventId === event.id)
    .map((r) => ({
      name: r.groupName || "Individual",
      total: r.participants.length,
      checkedIn: r.participants.filter((p) => p.checkedIn).length,
    }));

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#1E3A5F]">{event.name}</h2>
        <p className="text-slate-600">Check-in dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Stat icon={Users} label="Total expected" value={total} color="#1E3A5F" />
        <Stat
          icon={CheckCircle2}
          label="Checked in"
          value={`${checkedIn} / ${total}`}
          color="#0F766E"
        />
        <Stat icon={Clock} label="Still expected" value={total - checkedIn} color="#9C8466" />
      </div>

      <div className="bg-white rounded-lg border border-[#E1D5BA]">
        <div className="px-5 py-4 border-b border-[#E1D5BA]">
          <h3 className="font-semibold text-[#1E3A5F]">Check-in by group</h3>
        </div>
        <ul className="divide-y divide-[#E1D5BA]">
          {byGroup.map((g) => {
            const pct = g.total > 0 ? Math.round((g.checkedIn / g.total) * 100) : 0;
            return (
              <li key={g.name} className="px-5 py-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-[#1E3A5F]">{g.name}</span>
                  <span className="text-sm text-slate-600">
                    {g.checkedIn} / {g.total}
                  </span>
                </div>
                <div className="h-2 bg-[#E1D5BA] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
