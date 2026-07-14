"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadDemoState,
  newId,
  saveDemoState,
  type DemoRegistration,
  type DemoState,
} from "../lib/demo-store";

export default function GroupLeaderPortal() {
  const [state, setState] = useState<DemoState | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    const s = loadDemoState();
    setState(s);
    const first = s.registrations.find((r) => r.kind === "group");
    if (first) setSelectedId(first.id);
  }, []);

  if (!state) return null;

  const groups = state.registrations.filter((r) => r.kind === "group");
  const group = groups.find((g) => g.id === selectedId);

  const update = (mutate: (g: DemoRegistration) => void) => {
    if (!group) return;
    const s = loadDemoState();
    const target = s.registrations.find((r) => r.id === group.id);
    if (!target) return;
    mutate(target);
    saveDemoState(s);
    setState(s);
  };

  const addParticipant = () => {
    update((g) => {
      g.participants.push({
        id: newId("p"),
        firstName: "New",
        lastName: "Participant",
        age: 15,
        liabilitySigned: false,
      });
    });
  };

  const toggleLiability = (pid: string) => {
    update((g) => {
      const p = g.participants.find((x) => x.id === pid);
      if (p) p.liabilitySigned = !p.liabilitySigned;
    });
  };

  const removeParticipant = (pid: string) => {
    update((g) => {
      g.participants = g.participants.filter((p) => p.id !== pid);
    });
  };

  const payBalance = () => {
    update((g) => {
      g.amountPaid += g.balanceDue;
      g.balanceDue = 0;
    });
    const s = loadDemoState();
    s.emails.push({
      id: newId("em"),
      to: group?.leaderEmail || "leader@example.com",
      subject: "Balance paid (Demo)",
      body: "Fake receipt: your group balance has been marked paid.",
      sentAt: new Date().toISOString(),
    });
    saveDemoState(s);
    setState(s);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-3xl font-bold mt-4">Group Leader Portal</h1>
      <p className="mt-2 text-slate-700">
        In the real site, you&apos;d log in with a link code emailed to you.
        Here, just pick a group.
      </p>

      {groups.length === 0 && (
        <div className="mt-6 rounded border border-slate-300 bg-white p-6">
          No groups yet. Try a{" "}
          <Link href="/demo/register/group" className="underline">
            group registration
          </Link>{" "}
          first.
        </div>
      )}

      {groups.length > 0 && (
        <>
          <label className="block mt-6">
            <span className="text-sm font-medium">Select group</span>
            <select
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 bg-white"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.groupName} — {g.leaderName}
                </option>
              ))}
            </select>
          </label>

          {group && (
            <div className="mt-6 space-y-6">
              <div className="rounded-lg border border-slate-300 bg-white p-6">
                <h2 className="text-xl font-semibold">{group.groupName}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Leader: {group.leaderName} ({group.leaderEmail})
                </p>
                <div className="mt-4 flex flex-wrap gap-6 text-sm">
                  <span>
                    Paid: <strong>${group.amountPaid}</strong>
                  </span>
                  <span>
                    Balance: <strong>${group.balanceDue}</strong>
                  </span>
                </div>
                {group.balanceDue > 0 && (
                  <button
                    onClick={payBalance}
                    className="mt-4 rounded bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-500"
                  >
                    Pay Balance ${group.balanceDue} (Demo)
                  </button>
                )}
              </div>

              <div className="rounded-lg border border-slate-300 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Participants ({group.participants.length})
                  </h3>
                  <button
                    onClick={addParticipant}
                    className="rounded bg-slate-800 text-white px-3 py-1.5 text-sm hover:bg-slate-700"
                  >
                    + Add participant
                  </button>
                </div>
                {group.participants.length === 0 && (
                  <p className="text-slate-500 text-sm">No participants yet.</p>
                )}
                <ul className="divide-y divide-slate-200">
                  {group.participants.map((p) => (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Age {p.age ?? "—"} ·{" "}
                          {p.liabilitySigned ? (
                            <span className="text-emerald-700">Waiver signed</span>
                          ) : (
                            <span className="text-amber-700">Waiver pending</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleLiability(p.id)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Toggle waiver
                        </button>
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="rounded border border-red-300 text-red-700 px-2 py-1 text-xs hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
