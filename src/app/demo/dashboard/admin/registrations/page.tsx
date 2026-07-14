"use client";

import { useEffect, useState } from "react";
import { loadDemoState, type DemoState } from "../../../lib/demo-store";

export default function AdminRegistrations() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const eventName = (id: string) => state.events.find((e) => e.id === id)?.name || id;

  return (
    <div className="max-w-6xl">
      <h2 className="text-3xl font-bold text-[#1E3A5F] mb-6">All Registrations</h2>
      <div className="bg-white rounded-lg border border-[#E1D5BA] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F5F1E8] text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Registrant</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Participants</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1D5BA]">
            {state.registrations.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#1E3A5F]">
                    {r.groupName || `${r.participants[0]?.firstName} ${r.participants[0]?.lastName}`}
                  </div>
                  {r.leaderName && (
                    <div className="text-xs text-slate-500">{r.leaderName}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm capitalize">{r.kind}</td>
                <td className="px-4 py-3 text-sm">{eventName(r.eventId)}</td>
                <td className="px-4 py-3 text-sm">{r.participants.length}</td>
                <td className="px-4 py-3 text-sm">${r.amountPaid}</td>
                <td className="px-4 py-3 text-sm">
                  {r.balanceDue > 0 ? (
                    <span className="text-amber-700">${r.balanceDue}</span>
                  ) : (
                    <span className="text-emerald-700">Paid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
