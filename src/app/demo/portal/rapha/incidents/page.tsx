"use client";

import { useEffect, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import {
  loadDemoState,
  newId,
  updateDemoState,
  type DemoIncident,
  type DemoState,
} from "../../../lib/demo-store";

export default function IncidentsPage() {
  const [state, setState] = useState<DemoState | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const event = state.events.find((e) => e.id === state.currentEventId) || state.events[0];
  const participants = state.registrations
    .filter((r) => r.eventId === event.id)
    .flatMap((r) => r.participants);

  const save = (inc: DemoIncident) => {
    updateDemoState((s) => {
      s.incidents.push(inc);
    });
    setState(loadDemoState());
    setShowNew(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#1E3A5F]">Incident Log</h2>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-[#7A6347] hover:bg-[#69533A] text-white px-4 py-2 rounded-lg"
        >
          <Plus className="h-4 w-4" /> Log incident
        </button>
      </div>

      <div className="bg-white rounded-lg border border-[#E1D5BA] divide-y divide-[#E1D5BA]">
        {state.incidents.length === 0 && (
          <p className="p-6 text-slate-500 text-sm">No incidents logged.</p>
        )}
        {state.incidents
          .slice()
          .reverse()
          .map((inc) => {
            const p = participants.find((x) => x.id === inc.participantId);
            return (
              <div key={inc.id} className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div className="font-semibold text-[#1E3A5F]">
                        {p ? `${p.firstName} ${p.lastName}` : "Unknown"} · {inc.type}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(inc.time).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 mt-2">
                      <strong>What happened:</strong> {inc.description}
                    </div>
                    <div className="text-sm text-slate-700 mt-1">
                      <strong>Action taken:</strong> {inc.actionTaken}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Resolved by {inc.resolvedBy}</div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {showNew && (
        <NewIncidentModal
          participants={participants}
          onSave={save}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

function NewIncidentModal({
  participants,
  onSave,
  onClose,
}: {
  participants: { id: string; firstName: string; lastName: string }[];
  onSave: (i: DemoIncident) => void;
  onClose: () => void;
}) {
  const [participantId, setParticipantId] = useState(participants[0]?.id || "");
  const [type, setType] = useState<DemoIncident["type"]>("Medical");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [resolvedBy, setResolvedBy] = useState("Nurse on duty");

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">Log new incident</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              id: newId("inc"),
              participantId,
              type,
              description,
              actionTaken,
              resolvedBy,
              time: new Date().toISOString(),
            });
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-sm font-medium">Participant</span>
            <select
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DemoIncident["type"])}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            >
              <option>Medical</option>
              <option>Behavioral</option>
              <option>Injury</option>
              <option>Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">What happened</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Action taken</span>
            <textarea
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              required
              rows={2}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Resolved by</span>
            <input
              value={resolvedBy}
              onChange={(e) => setResolvedBy(e.target.value)}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            />
          </label>
          <div className="flex gap-2 pt-3">
            <button className="flex-1 bg-[#7A6347] hover:bg-[#69533A] text-white px-4 py-2 rounded">
              Save incident
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
