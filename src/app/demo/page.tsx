"use client";

import Link from "next/link";
import {
  Building2,
  Users,
  Store,
  Stethoscope,
  ClipboardCheck,
  Shield,
  FileText,
  ExternalLink,
  Sparkles,
  Home,
  CheckCircle2,
  Circle,
} from "lucide-react";

type Portal = {
  href: string;
  title: string;
  icon: typeof Building2;
  color: string;
  audience: string;
  description: string;
  features: string[];
  status: "ready" | "coming-soon";
};

const portals: Portal[] = [
  {
    href: "/demo/dashboard/admin",
    title: "Organization Admin Portal",
    icon: Building2,
    color: "#1E3A5F",
    audience: "Event organizers, diocesan coordinators, parish admins",
    description:
      "The command center for the organization running the event. This is where you spend most of your time — creating events, watching registrations roll in, approving vendors, tracking waivers, running reports, and managing every operational detail. Same sidebar, same cards, same buttons as the real product.",
    features: [
      "Create and configure events (dates, pricing, capacity, custom questions)",
      "Live dashboard: active events, registrations, revenue, waiver progress",
      "Full registration browser with filters by event, group, payment status",
      "Vendor applications: review, approve, reject, track booth fees",
      "Poros / Salve / Rapha portal management",
      "Liability form tracking and safe environment certificate verification",
      "Financial and operational reports with year-over-year filtering",
      "Virtual terminal for phone or in-person payments",
      "Bulk email to all group leaders",
      "Organization settings, team management, branding, billing",
    ],
    status: "ready",
  },
  {
    href: "/demo/dashboard/group-leader",
    title: "Group Leader Portal",
    icon: Users,
    color: "#1E3A5F",
    audience: "Youth ministers, parish leaders, chaperones",
    description:
      "What a group leader sees after registering their parish for an event. They add their participants one by one, upload chaperone safe-environment certificates, track who's signed waivers, pay off the balance, and get housing assignments.",
    features: [
      "Dashboard with balance, waiver progress, roster, share message for participants",
      "Participants: add, edit, remove, view individual details",
      "Housing assignments with roommate requests",
      "Payments: view balance, pay by card, download receipts",
      "Liability form tracker per participant",
      "Safe environment certificate uploads for chaperones",
      "Certificates of completion after event",
    ],
    status: "coming-soon",
  },
  {
    href: "/demo/portal/salve",
    title: "Salve Portal",
    icon: ClipboardCheck,
    color: "#8B7355",
    audience: "Event check-in and hospitality staff",
    description:
      "The dedicated check-in kiosk and hospitality workflow that runs on tablets at the event. Scan or search a participant, print their name tag, hand off their welcome packet, track who's still expected.",
    features: [
      "Live check-in dashboard with per-group progress",
      "Search participant by name or group",
      "Print / reprint name tags in bulk",
      "Welcome packet handoff tracking",
      "Arrival status by group at a glance",
    ],
    status: "coming-soon",
  },
  {
    href: "/demo/portal/rapha",
    title: "Rapha Portal",
    icon: Stethoscope,
    color: "#7A6347",
    audience: "Medical staff, nurses, safety leads",
    description:
      "Medical and incident tracking for on-site nurses. Look up any participant's allergies, medications, and emergency contact. Log incidents as they happen, generate end-of-event medical reports.",
    features: [
      "Participant medical lookup (allergies, notes, emergency contact)",
      "Log new incidents (medical, behavioral, injury, other)",
      "Incident history with resolution notes",
      "End-of-event medical report exports",
    ],
    status: "coming-soon",
  },
  {
    href: "/demo/portal/poros",
    title: "Poros Portal",
    icon: Home,
    color: "#1E3A5F",
    audience: "Housing and logistics coordinators",
    description:
      "The full logistics engine for large events. Assigns housing across buildings and rooms, manages meal groups, small groups, adoration and confession scheduling, ADA accommodations, seating, and staff.",
    features: [
      "Housing: rooms, buildings, group and individual assignments",
      "Meal groups and dietary accommodations",
      "Small groups / breakout assignments",
      "Adoration and confession scheduling",
      "ADA and accessibility accommodations",
      "Seating charts",
      "Staff and volunteer roster",
    ],
    status: "coming-soon",
  },
  {
    href: "/demo/vendor-portal",
    title: "Vendor Portal",
    icon: Store,
    color: "#9C8466",
    audience: "Booth vendors and exhibitors",
    description:
      "The self-service portal where vendors apply for a booth, watch for approval, and pay their fee.",
    features: [
      "Submit new booth application",
      "See status (pending / approved / rejected)",
      "Pay booth fee once approved",
      "Update business information",
    ],
    status: "coming-soon",
  },
  {
    href: "/demo/events",
    title: "Public Event Page & Registration",
    icon: ExternalLink,
    color: "#1E3A5F",
    audience: "Prospective registrants — parents, youth, adults",
    description:
      "The first thing a family or leader sees when they land on your event page. Browse events, choose Individual or Group registration, walk through the full flow with fake payment.",
    features: [
      "Event listing with dates, location, price, capacity",
      "Individual registration flow (age, contact, waiver, payment)",
      "Group registration flow (reserve seats, deposit, get access code)",
      "Deposit-plus-balance payment structure",
    ],
    status: "coming-soon",
  },
  {
    href: "/demo/liability",
    title: "Liability / Waiver Flow",
    icon: FileText,
    color: "#8B7355",
    audience: "Participants and parents",
    description:
      "The e-signature waiver flow every participant (or parent, for under-18s) completes before the event.",
    features: [
      "Youth-under-18 parent signature flow",
      "Adult self-signature flow",
      "Chaperone waiver variant",
      "Clergy waiver variant",
    ],
    status: "coming-soon",
  },
];

export default function DemoLanding() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1E3A5F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[#E1D5BA] font-medium mb-3 uppercase tracking-wider text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Interactive walkthrough
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              The ChiRho Events demo
            </h1>
            <p className="text-lg sm:text-xl text-[#E8DCC8] leading-relaxed mb-8">
              Click through every portal, every form, every button — the way a
              real youth minister, vendor, admin, or nurse would use it. No
              account required. Nothing you do here touches the real site.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/demo/dashboard/admin"
                className="inline-flex items-center gap-2 bg-[#9C8466] hover:bg-[#8B7355] text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                <Building2 className="h-5 w-5" />
                Open the Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What this demo is */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
            <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold mb-3">
              1
            </div>
            <h3 className="font-semibold text-[#1E3A5F] mb-2">Same UI, same layout</h3>
            <p className="text-sm text-slate-700">
              Every demo page is built from the real product&apos;s components — same
              sidebar, same cards, same colors, same navigation. What you see
              is what real customers see.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
            <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold mb-3">
              2
            </div>
            <h3 className="font-semibold text-[#1E3A5F] mb-2">Nothing is real</h3>
            <p className="text-sm text-slate-700">
              No Stripe payments, no emails sent, no accounts created, no
              database touched. Every button that would normally call an API
              shows a fake success in demo mode.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
            <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold mb-3">
              3
            </div>
            <h3 className="font-semibold text-[#1E3A5F] mb-2">Explore freely</h3>
            <p className="text-sm text-slate-700">
              Click anything. Break anything. The real site is completely
              untouched. When you&apos;re done, close the tab — no cleanup, no
              trace.
            </p>
          </div>
        </div>
      </section>

      {/* Portals grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-3xl font-bold text-[#1E3A5F] mb-2">
          Every portal ChiRho offers
        </h2>
        <p className="text-slate-700 mb-8 max-w-3xl">
          ChiRho Events has separate, dedicated portals for each role — so a
          nurse never sees the accounting dashboard, and a group leader never
          sees another parish&apos;s roster. Explore each one below.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          {portals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className="block bg-white rounded-lg border border-[#E1D5BA] hover:border-[#9C8466] hover:shadow-md transition p-6 group"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${portal.color}15` }}
                  >
                    <portal.icon
                      className="h-6 w-6"
                      style={{ color: portal.color }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1E3A5F] group-hover:text-[#9C8466] transition">
                      {portal.title}
                    </h3>
                    <p className="text-xs uppercase tracking-wide text-[#9C8466] mt-1">
                      {portal.audience}
                    </p>
                  </div>
                </div>
                {portal.status === "ready" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded whitespace-nowrap">
                    <CheckCircle2 className="h-3 w-3" />
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded whitespace-nowrap">
                    <Circle className="h-3 w-3" />
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-4">
                {portal.description}
              </p>
              <p className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-wide mb-2">
                What you can do
              </p>
              <ul className="space-y-1.5">
                {portal.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <span className="text-[#9C8466] mt-1">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </section>

      {/* Group vs individual explainer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-8">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="h-6 w-6 text-[#9C8466] flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-[#1E3A5F]">
                Group vs. Individual registration
              </h2>
              <p className="text-slate-700 mt-1">
                ChiRho supports both — pick whichever fits.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#9C8466]" />
                Group registration
              </h3>
              <p className="text-sm text-slate-700">
                A parish youth minister reserves 20 seats up front with a
                deposit, gets an access code, invites their parishioners to
                fill out waivers via a share link, and pays the balance closer
                to the event. Group leaders get a dedicated portal to manage
                their whole roster.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2 flex items-center gap-2">
                <Home className="h-5 w-5 text-[#9C8466]" />
                Individual registration
              </h3>
              <p className="text-sm text-slate-700">
                A parent registers one child, or an adult registers themselves
                for a retreat. Single-shot flow — fill out participant info,
                sign the waiver, pay in full, done. No portal, no group.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What&apos;s not connected */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-[#F5F1E8] border border-[#E1D5BA] rounded-lg p-6">
          <h3 className="font-semibold text-[#1E3A5F] mb-2">
            What the demo can&apos;t show
          </h3>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>
              <strong>Real payment processing.</strong> Payment buttons show a
              fake success. No Stripe account is touched.
            </li>
            <li>
              <strong>Real emails.</strong> Every email the system would send
              is silently discarded.
            </li>
            <li>
              <strong>Real accounts.</strong> No login. You&apos;re dropped
              straight into each portal as a preset demo user.
            </li>
            <li>
              <strong>Persistence across devices.</strong> The demo only knows
              about this browser. Open it on your phone and you&apos;ll get a
              fresh copy.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
