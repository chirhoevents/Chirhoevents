"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle2, Circle } from "lucide-react";
import {
  loadDemoState,
  updateDemoState,
  type DemoState,
} from "../../../lib/demo-store";

export default function SalveParticipants() {
  const [state, setState] = useState<DemoState | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const event = state.events.find((e) => e.id === state.currentEventId) || state.events[0];
  const all = state.registrations
    .filter((r) => r.eventId === event.id)
    .flatMap((r) => r.participants.map((p) => ({ ...p, groupName: r.groupName || "Individual", regId: r.id })));

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return all;
    return all.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.groupName.toLowerCase().includes(q),
    );
  }, [query, all]);

  const toggleCheckIn = (regId: string, pid: string) => {
    updateDemoState((s) => {
      const r = s.registrations.find((x) => x.id === regId);
      const p = r?.participants.find((x) => x.id === pid);
      if (p) p.checkedIn = !p.checkedIn;
    });
    setState(loadDemoState());
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1E3A5F] mb-3">Check in participants</h2>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or group…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E1D5BA] bg-white focus:outline-none focus:border-[#9C8466]"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E1D5BA] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F5F1E8] text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Waiver</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1D5BA]">
            {filtered.map((p) => (
              <tr key={p.id} className={p.checkedIn ? "bg-emerald-50/40" : ""}>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#1E3A5F]">
                    {p.firstName} {p.lastName}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{p.groupName}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {p.gender} · Age {p.age} · {p.role}
                </td>
                <td className="px-4 py-3">
                  {p.liabilitySigned ? (
                    <span className="text-xs text-emerald-700">✓ Signed</span>
                  ) : (
                    <span className="text-xs text-red-700">⚠ Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleCheckIn(p.regId, p.id)}
                    disabled={!p.liabilitySigned}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium ${
                      p.checkedIn
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "bg-[#1E3A5F] text-white hover:bg-[#122239] disabled:bg-slate-300"
                    }`}
                  >
                    {p.checkedIn ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Checked in
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4" /> Check in
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
