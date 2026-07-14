"use client";

import { useEffect, useState } from "react";
import { loadDemoState, updateDemoState, type DemoState } from "../../../lib/demo-store";

export default function SettingsPage() {
  const [state, setState] = useState<DemoState | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const reg = state.registrations.find((r) => r.id === state.currentRegistrationId) || state.registrations[0];

  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateDemoState((s) => {
      const r = s.registrations.find((x) => x.id === reg.id);
      if (r) {
        r.groupName = String(fd.get("groupName") || "");
        r.leaderName = String(fd.get("leaderName") || "");
        r.leaderEmail = String(fd.get("leaderEmail") || "");
        r.leaderPhone = String(fd.get("leaderPhone") || "");
        r.organization = String(fd.get("organization") || "");
      }
    });
    setState(loadDemoState());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-6">Settings</h1>

      <form onSubmit={save} className="bg-white rounded-lg border border-[#E1D5BA] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#1E3A5F]">Group information</h2>
        <Field name="groupName" label="Group / Parish name" defaultValue={reg.groupName} />
        <Field name="organization" label="Organization" defaultValue={reg.organization} />
        <div className="grid grid-cols-2 gap-4">
          <Field name="leaderName" label="Leader name" defaultValue={reg.leaderName} />
          <Field name="leaderEmail" label="Leader email" type="email" defaultValue={reg.leaderEmail} />
        </div>
        <Field name="leaderPhone" label="Leader phone" defaultValue={reg.leaderPhone} />
        <div className="flex items-center gap-3 pt-3">
          <button className="bg-[#1E3A5F] hover:bg-[#122239] text-white px-5 py-2 rounded">
            Save changes
          </button>
          {saved && <span className="text-emerald-700 text-sm">Saved.</span>}
        </div>
      </form>

      <div className="bg-white rounded-lg border border-[#E1D5BA] p-6 mt-6">
        <h2 className="text-lg font-semibold text-[#1E3A5F] mb-2">Access code</h2>
        <p className="text-sm text-slate-600 mb-3">
          Share this code with co-leaders so they can access this group.
        </p>
        <div className="inline-block px-4 py-2 bg-[#F5F1E8] border border-[#E1D5BA] rounded font-mono text-[#1E3A5F]">
          {reg.accessCode || "DEMO-GROUP-2026"}
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue || ""}
        className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
      />
    </label>
  );
}
