"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Users, Activity, Heart } from "lucide-react";
import { loadDemoState, type DemoState } from "../../lib/demo-store";

export default function RaphaOverview() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const event = state.events.find((e) => e.id === state.currentEventId) || state.events[0];
  const participants = state.registrations
    .filter((r) => r.eventId === event.id)
    .flatMap((r) => r.participants);

  const withMedical = participants.filter((p) => p.medicalNotes).length;
  const withAllergies = participants.filter((p) => p.allergies).length;
  const openIncidents = state.incidents.length;

  return (
    <div>
      <h2 className="text-3xl font-bold text-[#1E3A5F] mb-2">{event.name}</h2>
      <p className="text-slate-600 mb-8">Medical overview and quick access</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat icon={Users} label="Total participants" value={participants.length} />
        <Stat icon={Heart} label="With medical notes" value={withMedical} accent="text-red-700" />
        <Stat icon={AlertTriangle} label="With allergies" value={withAllergies} accent="text-amber-700" />
        <Stat icon={Activity} label="Incidents logged" value={openIncidents} accent="text-[#7A6347]" />
      </div>

      <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">Recent incidents</h3>
        {state.incidents.length === 0 ? (
          <p className="text-sm text-slate-500">No incidents yet.</p>
        ) : (
          <ul className="divide-y divide-[#E1D5BA]">
            {state.incidents
              .slice()
              .reverse()
              .map((inc) => {
                const p = participants.find((x) => x.id === inc.participantId);
                return (
                  <li key={inc.id} className="py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-[#1E3A5F]">
                          {p ? `${p.firstName} ${p.lastName}` : "Unknown"} · {inc.type}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">{inc.description}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Resolved by {inc.resolvedBy} · {new Date(inc.time).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className={`h-5 w-5 ${accent || "text-[#7A6347]"}`} />
      </div>
      <div className={`text-3xl font-bold ${accent || "text-[#1E3A5F]"}`}>{value}</div>
    </div>
  );
}
