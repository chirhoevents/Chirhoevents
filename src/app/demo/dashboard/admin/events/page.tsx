"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, MapPin, Users } from "lucide-react";
import {
  loadDemoState,
  newId,
  updateDemoState,
  type DemoEvent,
  type DemoState,
} from "../../../lib/demo-store";

export default function AdminEvents() {
  const [state, setState] = useState<DemoState | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const save = (e: DemoEvent) => {
    updateDemoState((s) => {
      s.events.push(e);
    });
    setState(loadDemoState());
    setShowNew(false);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-[#1E3A5F]">Events</h2>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#122239] text-white px-4 py-2 rounded"
        >
          <Plus className="h-4 w-4" /> New event
        </button>
      </div>

      <div className="grid gap-4">
        {state.events.map((e) => {
          const regs = state.registrations.filter((r) => r.eventId === e.id);
          const participants = regs.reduce((n, r) => n + r.participants.length, 0);
          return (
            <div key={e.id} className="bg-white rounded-lg border border-[#E1D5BA] p-5 flex justify-between">
              <div>
                <h3 className="font-semibold text-[#1E3A5F] text-lg">{e.name}</h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> {e.startsOn} → {e.endsOn}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {e.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> {participants} / {e.capacity}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-2">{e.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-[#1E3A5F]">${e.pricePerPerson}</div>
                <div className="text-xs text-slate-500">per person</div>
              </div>
            </div>
          );
        })}
      </div>

      {showNew && <NewEventModal onSave={save} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewEventModal({
  onSave,
  onClose,
}: {
  onSave: (e: DemoEvent) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [pricePerPerson, setPrice] = useState(200);
  const [capacity, setCapacity] = useState(200);
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">Create new event</h3>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            onSave({
              id: newId("evt"),
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              name,
              startsOn,
              endsOn,
              location,
              address,
              pricePerPerson,
              capacity,
              registered: 0,
              description,
            });
          }}
          className="space-y-3"
        >
          <F label="Event name" value={name} onChange={setName} required />
          <div className="grid grid-cols-2 gap-3">
            <F label="Starts" type="date" value={startsOn} onChange={setStartsOn} required />
            <F label="Ends" type="date" value={endsOn} onChange={setEndsOn} required />
          </div>
          <F label="Location" value={location} onChange={setLocation} required />
          <F label="Address" value={address} onChange={setAddress} />
          <div className="grid grid-cols-2 gap-3">
            <F label="Price per person" type="number" value={String(pricePerPerson)} onChange={(v) => setPrice(Number(v))} />
            <F label="Capacity" type="number" value={String(capacity)} onChange={(v) => setCapacity(Number(v))} />
          </div>
          <label className="block">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            />
          </label>
          <div className="flex gap-2 pt-3">
            <button className="flex-1 bg-[#1E3A5F] hover:bg-[#122239] text-white px-4 py-2 rounded">Create</button>
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function F({
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
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
      />
    </label>
  );
}
