"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, CheckCircle2, Circle } from "lucide-react";
import {
  loadDemoState,
  newId,
  updateDemoState,
  type DemoParticipant,
  type DemoState,
} from "../../../lib/demo-store";

export default function ParticipantsPage() {
  const [state, setState] = useState<DemoState | null>(null);
  const [editing, setEditing] = useState<DemoParticipant | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const reg = state.registrations.find((r) => r.id === state.currentRegistrationId) || state.registrations[0];

  const refresh = () => setState(loadDemoState());

  const save = (p: DemoParticipant, isNew: boolean) => {
    updateDemoState((s) => {
      const r = s.registrations.find((x) => x.id === reg.id);
      if (!r) return;
      if (isNew) r.participants.push(p);
      else {
        const idx = r.participants.findIndex((x) => x.id === p.id);
        if (idx >= 0) r.participants[idx] = p;
      }
    });
    refresh();
    setEditing(null);
    setShowNew(false);
  };

  const remove = (id: string) => {
    if (!confirm("Remove this participant?")) return;
    updateDemoState((s) => {
      const r = s.registrations.find((x) => x.id === reg.id);
      if (r) r.participants = r.participants.filter((p) => p.id !== id);
    });
    refresh();
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E3A5F]">Participants</h1>
          <p className="text-slate-600 mt-1">
            {reg.participants.length} in <strong>{reg.groupName}</strong>
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#122239] text-white px-4 py-2 rounded-lg"
        >
          <Plus className="h-4 w-4" /> Add Participant
        </button>
      </div>

      <div className="bg-white rounded-lg border border-[#E1D5BA] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F5F1E8] text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Age / Grade</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Waiver</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1D5BA]">
            {reg.participants.map((p) => (
              <tr key={p.id} className="hover:bg-[#F5F1E8]/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#1E3A5F]">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-slate-500">{p.gender}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  Age {p.age}
                  {p.grade && <span className="text-slate-500"> · {p.grade}</span>}
                </td>
                <td className="px-4 py-3 text-sm capitalize">{p.role}</td>
                <td className="px-4 py-3">
                  {p.liabilitySigned ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-sm">
                      <CheckCircle2 className="h-4 w-4" /> Signed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 text-sm">
                      <Circle className="h-4 w-4" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {p.email || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing(p)}
                    className="p-1.5 hover:bg-[#E1D5BA] rounded text-[#1E3A5F]"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editing || showNew) && (
        <ParticipantModal
          participant={
            editing || {
              id: newId("p"),
              firstName: "",
              lastName: "",
              age: 15,
              gender: "F",
              role: "participant",
              liabilitySigned: false,
              checkedIn: false,
              nametagPrinted: false,
            }
          }
          onSave={(p) => save(p, showNew)}
          onClose={() => {
            setEditing(null);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function ParticipantModal({
  participant,
  onSave,
  onClose,
}: {
  participant: DemoParticipant;
  onSave: (p: DemoParticipant) => void;
  onClose: () => void;
}) {
  const [p, setP] = useState<DemoParticipant>(participant);
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">
          {participant.firstName ? "Edit Participant" : "Add Participant"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(p);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={p.firstName} onChange={(v) => setP({ ...p, firstName: v })} required />
            <Field label="Last name" value={p.lastName} onChange={(v) => setP({ ...p, lastName: v })} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Age" type="number" value={String(p.age)} onChange={(v) => setP({ ...p, age: Number(v) || 0 })} />
            <div>
              <label className="text-xs font-medium text-slate-700">Gender</label>
              <select
                value={p.gender}
                onChange={(e) => setP({ ...p, gender: e.target.value as "M" | "F" })}
                className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
              >
                <option value="F">F</option>
                <option value="M">M</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Role</label>
              <select
                value={p.role}
                onChange={(e) => setP({ ...p, role: e.target.value as DemoParticipant["role"] })}
                className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
              >
                <option value="participant">Participant</option>
                <option value="chaperone">Chaperone</option>
                <option value="leader">Leader</option>
              </select>
            </div>
          </div>
          <Field label="Grade" value={p.grade || ""} onChange={(v) => setP({ ...p, grade: v })} />
          <Field label="Email" value={p.email || ""} onChange={(v) => setP({ ...p, email: v })} />
          <Field label="Phone" value={p.phone || ""} onChange={(v) => setP({ ...p, phone: v })} />
          <Field label="Allergies" value={p.allergies || ""} onChange={(v) => setP({ ...p, allergies: v })} />
          <Field label="Medical notes" value={p.medicalNotes || ""} onChange={(v) => setP({ ...p, medicalNotes: v })} />
          <Field label="Emergency contact" value={p.emergencyContact || ""} onChange={(v) => setP({ ...p, emergencyContact: v })} />
          <Field label="Emergency phone" value={p.emergencyPhone || ""} onChange={(v) => setP({ ...p, emergencyPhone: v })} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.liabilitySigned}
              onChange={(e) => setP({ ...p, liabilitySigned: e.target.checked })}
            />
            Waiver signed
          </label>
          <div className="flex gap-2 pt-3">
            <button type="submit" className="flex-1 bg-[#1E3A5F] hover:bg-[#122239] text-white px-4 py-2 rounded">
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
      />
    </div>
  );
}
