"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, AlertTriangle, Phone, Heart } from "lucide-react";
import { loadDemoState, type DemoState } from "../../../lib/demo-store";

export default function RaphaParticipants() {
  const [state, setState] = useState<DemoState | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => setState(loadDemoState()), []);

  const event = state?.events.find((e) => e.id === state.currentEventId) || state?.events[0];
  const rows = useMemo(
    () =>
      state && event
        ? state.registrations
            .filter((r) => r.eventId === event.id)
            .flatMap((r) => r.participants.map((p) => ({ ...p, groupName: r.groupName || "Individual" })))
        : [],
    [state, event],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? rows.filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(q))
      : rows;
  }, [query, rows]);

  if (!state) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Participant Medical Lookup</h2>
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E1D5BA] bg-white"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((p) => {
          const open = openId === p.id;
          const flags = [
            p.allergies && "Allergies",
            p.medicalNotes && "Medical notes",
          ].filter(Boolean);
          return (
            <div key={p.id} className="bg-white rounded-lg border border-[#E1D5BA]">
              <button
                onClick={() => setOpenId(open ? null : p.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
              >
                <div>
                  <div className="font-semibold text-[#1E3A5F]">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.groupName} · Age {p.age} · {p.gender}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {flags.map((f) => (
                    <span
                      key={f as string}
                      className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded"
                    >
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      {f}
                    </span>
                  ))}
                </div>
              </button>
              {open && (
                <div className="border-t border-[#E1D5BA] p-5 grid gap-4 md:grid-cols-2 bg-[#F5F1E8]/40">
                  <Detail icon={Heart} label="Allergies" value={p.allergies || "None"} />
                  <Detail icon={Heart} label="Medical notes" value={p.medicalNotes || "None"} />
                  <Detail icon={Phone} label="Emergency contact" value={p.emergencyContact || "—"} />
                  <Detail icon={Phone} label="Emergency phone" value={p.emergencyPhone || "—"} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm text-[#1E3A5F]">{value}</div>
    </div>
  );
}
