"use client";

import { useEffect, useState } from "react";
import { Home, Users, ArrowRight } from "lucide-react";
import {
  loadDemoState,
  updateDemoState,
  type DemoState,
} from "../../../lib/demo-store";

export default function HousingPage() {
  const [state, setState] = useState<DemoState | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const reg = state.registrations.find((r) => r.id === state.currentRegistrationId) || state.registrations[0];
  const rooms = state.rooms;

  const refresh = () => setState(loadDemoState());

  const assign = (participantId: string, roomId: string) => {
    updateDemoState((s) => {
      const r = s.registrations.find((x) => x.id === reg.id);
      const p = r?.participants.find((x) => x.id === participantId);
      if (p) p.housingId = roomId;
    });
    refresh();
    setSelectedParticipant("");
  };

  const unassign = (participantId: string) => {
    updateDemoState((s) => {
      const r = s.registrations.find((x) => x.id === reg.id);
      const p = r?.participants.find((x) => x.id === participantId);
      if (p) p.housingId = undefined;
    });
    refresh();
  };

  const roomOccupants = (roomId: string) =>
    reg.participants.filter((p) => p.housingId === roomId);

  const unassigned = reg.participants.filter((p) => !p.housingId);

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1E3A5F]">Housing Assignments</h1>
        <p className="text-slate-600 mt-1">
          Assign each participant to a room. Rooms are gendered and have capacity limits.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 bg-white rounded-lg border border-[#E1D5BA] p-5">
          <h2 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#9C8466]" /> Unassigned ({unassigned.length})
          </h2>
          {unassigned.length === 0 && (
            <p className="text-sm text-slate-500">Everyone is housed. Nice.</p>
          )}
          <ul className="space-y-2">
            {unassigned.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedParticipant(p.id)}
                  className={`w-full text-left px-3 py-2 rounded border ${
                    selectedParticipant === p.id
                      ? "border-[#1E3A5F] bg-[#1E3A5F]/5"
                      : "border-[#E1D5BA] hover:border-[#9C8466]"
                  }`}
                >
                  <div className="font-medium text-sm">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.gender} · Age {p.age} · {p.role}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {selectedParticipant && (
            <div className="mt-4 p-3 bg-[#1E3A5F]/5 rounded text-sm text-[#1E3A5F]">
              <ArrowRight className="h-4 w-4 inline mr-1" />
              Click a room below to assign
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {Array.from(new Set(rooms.map((r) => r.building))).map((building) => (
            <div key={building} className="bg-white rounded-lg border border-[#E1D5BA] p-5">
              <h3 className="font-semibold text-[#1E3A5F] mb-3">{building}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {rooms
                  .filter((r) => r.building === building)
                  .map((room) => {
                    const occupants = roomOccupants(room.id);
                    const full = occupants.length >= room.capacity;
                    const selected = reg.participants.find((p) => p.id === selectedParticipant);
                    const canAssign =
                      selectedParticipant &&
                      !full &&
                      (room.gender === "Any" || room.gender === selected?.gender);
                    return (
                      <div
                        key={room.id}
                        className={`border rounded-lg p-3 ${
                          canAssign
                            ? "border-[#9C8466] cursor-pointer hover:bg-[#9C8466]/5"
                            : "border-[#E1D5BA]"
                        }`}
                        onClick={() => canAssign && assign(selectedParticipant, room.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-[#9C8466]" />
                            <span className="font-medium text-[#1E3A5F]">Room {room.roomNumber}</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 bg-[#F5F1E8] rounded">
                            {room.gender} · {occupants.length}/{room.capacity}
                          </span>
                        </div>
                        <ul className="text-sm space-y-1">
                          {occupants.map((o) => (
                            <li key={o.id} className="flex items-center justify-between">
                              <span>
                                {o.firstName} {o.lastName}{" "}
                                <span className="text-xs text-slate-500">({o.age})</span>
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unassign(o.id);
                                }}
                                className="text-xs text-red-600 hover:underline"
                              >
                                remove
                              </button>
                            </li>
                          ))}
                          {occupants.length === 0 && (
                            <li className="text-xs text-slate-400 italic">Empty</li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
