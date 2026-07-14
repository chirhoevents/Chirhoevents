"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { loadDemoState, type DemoState } from "../../../lib/demo-store";

export default function RaphaReports() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const event = state.events.find((e) => e.id === state.currentEventId) || state.events[0];
  const participants = state.registrations
    .filter((r) => r.eventId === event.id)
    .flatMap((r) => r.participants);
  const incidents = state.incidents;

  const byType = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1E3A5F] mb-6">End-of-Event Reports</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Incidents by type">
          <ul className="space-y-2">
            {Object.entries(byType).map(([type, count]) => (
              <li key={type} className="flex justify-between">
                <span>{type}</span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
            {Object.keys(byType).length === 0 && (
              <li className="text-slate-500 text-sm">No incidents recorded.</li>
            )}
          </ul>
        </Card>
        <Card title="Medical roster">
          <p className="text-sm text-slate-700">
            {participants.filter((p) => p.medicalNotes || p.allergies).length} of{" "}
            {participants.length} participants had documented medical needs.
          </p>
        </Card>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-[#E1D5BA] p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-3">Exports</h3>
        <div className="flex flex-wrap gap-3">
          {["Full incident report", "Medical roster", "Emergency contact list"].map((label) => (
            <button
              key={label}
              onClick={() => alert(`Demo: would download "${label}" PDF.`)}
              className="inline-flex items-center gap-2 border border-[#E1D5BA] hover:bg-[#F5F1E8] px-4 py-2 rounded text-sm"
            >
              <FileText className="h-4 w-4 text-[#7A6347]" />
              {label}
              <Download className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
      <h3 className="font-semibold text-[#1E3A5F] mb-3">{title}</h3>
      {children}
    </div>
  );
}
