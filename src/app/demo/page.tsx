"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Store,
  Stethoscope,
  ClipboardCheck,
  Shield,
  FileText,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Home,
} from "lucide-react";
import { loadDemoState, resetDemoState, type DemoState } from "./lib/demo-store";

type Portal = {
  href: string;
  title: string;
  icon: typeof Building2;
  color: string;
  audience: string;
  description: string;
  features: string[];
};

const portals: Portal[] = [
  {
    href: "/demo/dashboard/group-leader",
    title: "Group Leader Portal",
    icon: Users,
    color: "#1E3A5F",
    audience: "Youth ministers, parish leaders, chaperones",
    description:
      "The full portal a group leader logs into after registering their parish. Add and edit participants, track waivers, pay balances, assign housing, download certificates, and manage their group's entire event experience.",
    features: [
      "Dashboard with balance, waiver progress, roster",
      "Add / edit / remove participants",
      "Housing assignments and roommate requests",
      "Pay outstanding balance",
      "Liability form tracker",
      "Certificates of completion",
    ],
  },
  {
    href: "/demo/portal/salve",
    title: "Salve Portal",
    icon: ClipboardCheck,
    color: "#8B7355",
    audience: "Event check-in and hospitality staff",
    description:
      "Check-in kiosk and hospitality workflow. Scan or search a participant, print name tags, hand off welcome packets, and see who's still expected.",
    features: [
      "Live check-in dashboard",
      "Search participant by name or group",
      "Print / reprint name tags",
      "Welcome packet handoff tracking",
      "See arrival status by group",
    ],
  },
  {
    href: "/demo/portal/rapha",
    title: "Rapha Portal",
    icon: Stethoscope,
    color: "#7A6347",
    audience: "Medical staff, nurses, safety leads",
    description:
      "Medical and incident tracking for on-site nurses. Look up a participant's allergies and medical notes, log incidents, and generate end-of-event reports.",
    features: [
      "Participant medical lookup (allergies, notes, emergency contact)",
      "Log new incidents (medical, behavioral, injury)",
      "Incident history with resolution notes",
      "End-of-event reporting",
    ],
  },
  {
    href: "/demo/dashboard/admin",
    title: "Organization Admin",
    icon: Building2,
    color: "#1E3A5F",
    audience: "Event organizers, diocesan coordinators",
    description:
      "The command center for the organization running the event. Create events, review every registration, approve vendors, run reports, and see the fake email log.",
    features: [
      "Create and edit events",
      "See every group and individual registration",
      "Approve or reject vendors",
      "Reports and revenue overview",
      "Fake email log — see what would have been sent",
    ],
  },
  {
    href: "/demo/vendor-portal",
    title: "Vendor Portal",
    icon: Store,
    color: "#9C8466",
    audience: "Booth vendors and exhibitors",
    description:
      "How a vendor applies, tracks approval, and pays their booth fee.",
    features: [
      "Submit new booth application",
      "See status (pending / approved / rejected)",
      "Pay booth fee once approved",
    ],
  },
  {
    href: "/demo/events",
    title: "Public Event Page",
    icon: ExternalLink,
    color: "#1E3A5F",
    audience: "Prospective registrants",
    description:
      "The first thing a family or leader sees. Browse events, then start Individual or Group registration.",
    features: [
      "Event listing",
      "Individual registration flow",
      "Group registration flow",
      "Deposit + balance payment structure",
    ],
  },
  {
    href: "/demo/liability",
    title: "Liability / Waiver Flow",
    icon: FileText,
    color: "#8B7355",
    audience: "Participants and parents",
    description:
      "The e-signature flow every participant (or parent, for under-18s) completes before the event.",
    features: [
      "Youth-under-18 parent signature",
      "Adult self-signature",
      "Chaperone and clergy variants",
    ],
  },
];

export default function DemoLanding() {
  const [state, setState] = useState<DemoState | null>(null);

  useEffect(() => {
    setState(loadDemoState());
  }, []);

  const handleReset = () => {
    if (confirm("Reset all demo data in this browser? This clears any changes you've made in the demo.")) {
      setState(resetDemoState());
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1E3A5F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-[#E1D5BA] font-medium mb-3 uppercase tracking-wider text-sm">
              Interactive walkthrough
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              The ChiRho Events demo
            </h1>
            <p className="text-lg sm:text-xl text-[#E8DCC8] leading-relaxed mb-8">
              Click through every portal, every form, every button — the way a real
              youth minister, vendor, admin, or nurse would use it. Nothing is
              saved anywhere but your own browser, and no email, payment, or account
              ever leaves this page.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/demo/dashboard/group-leader"
                className="inline-flex items-center gap-2 bg-[#9C8466] hover:bg-[#8B7355] text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                <Users className="h-5 w-5" />
                Try the Group Leader Portal
              </Link>
              <Link
                href="/demo/events"
                className="inline-flex items-center gap-2 border border-white/40 hover:bg-white/10 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                <ExternalLink className="h-5 w-5" />
                See the public event flow
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
            <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold mb-3">
              1
            </div>
            <h3 className="font-semibold text-[#1E3A5F] mb-2">Pick a portal</h3>
            <p className="text-sm text-slate-700">
              Each portal below is a full working replica of what that role sees. No
              login screens — you drop straight into the app.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
            <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold mb-3">
              2
            </div>
            <h3 className="font-semibold text-[#1E3A5F] mb-2">Do anything</h3>
            <p className="text-sm text-slate-700">
              Add participants, assign housing, pay a balance, print a name tag, log
              a medical incident. All fake, all safe. Changes persist in your
              browser so returning feels real.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
            <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold mb-3">
              3
            </div>
            <h3 className="font-semibold text-[#1E3A5F] mb-2">Reset any time</h3>
            <p className="text-sm text-slate-700">
              Hit the reset button at the bottom to wipe your demo state and start
              fresh. Clearing your browser also works.
            </p>
          </div>
        </div>
      </section>

      {/* Portals grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-3xl font-bold text-[#1E3A5F] mb-2">Every portal, every feature</h2>
        <p className="text-slate-700 mb-8">
          Each card below opens the real experience — same layout, same buttons, same navigation — with fake data seeded so you can explore.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {portals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className="block bg-white rounded-lg border border-[#E1D5BA] hover:border-[#9C8466] hover:shadow-md transition p-6 group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${portal.color}15` }}
                >
                  <portal.icon className="h-6 w-6" style={{ color: portal.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#1E3A5F] group-hover:text-[#9C8466] transition">
                    {portal.title}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-[#9C8466] mt-1">
                    {portal.audience}
                  </p>
                </div>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-4">
                {portal.description}
              </p>
              <ul className="space-y-1.5">
                {portal.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-[#9C8466] mt-1">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </section>

      {/* Demo data status */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
              <Home className="h-5 w-5" />
              Demo data on this browser
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {state
                ? `${state.events.length} events · ${state.registrations.length} registrations · ${state.registrations.reduce((n, r) => n + r.participants.length, 0)} participants · ${state.vendors.length} vendors · ${state.emails.length} fake emails`
                : "Loading demo state…"}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#122239] text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Reset demo
          </button>
        </div>
      </section>
    </div>
  );
}
