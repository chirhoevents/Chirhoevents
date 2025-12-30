'use client'

import { useState } from "react"
import { PublicNav } from "@/components/PublicNav"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, BookOpen, Users, ClipboardCheck, Home, Heart, BarChart3, FileText, HelpCircle } from "lucide-react"

const docSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    items: [
      { id: "overview", title: "What is ChiRho Events?" },
      { id: "signup", title: "How to Sign Up" },
      { id: "plans", title: "Choosing the Right Plan" },
      { id: "setup", title: "Setting Up Your Organization" },
    ]
  },
  {
    id: "org-admins",
    title: "For Organization Admins",
    icon: Users,
    items: [
      { id: "create-event", title: "Creating Your First Event" },
      { id: "pricing-setup", title: "Setting Up Pricing & Registration" },
      { id: "manage-registrations", title: "Managing Registrations & Payments" },
      { id: "poros-portal", title: "Using Poros Portal for Housing" },
      { id: "salve-checkin", title: "Using SALVE for Check-In" },
      { id: "rapha-medical", title: "Using Rapha for Medical Info" },
      { id: "reports", title: "Generating Reports" },
      { id: "team", title: "Managing Your Team" },
    ]
  },
  {
    id: "group-leaders",
    title: "For Group Leaders",
    icon: ClipboardCheck,
    items: [
      { id: "register-group", title: "How to Register a Group" },
      { id: "payments", title: "Making Payments" },
      { id: "liability-forms", title: "Completing Liability Forms" },
      { id: "manage-participants", title: "Managing Your Participants" },
      { id: "safe-environment", title: "Safe Environment Requirements" },
      { id: "checkin-process", title: "Check-In Process" },
    ]
  },
  {
    id: "participants",
    title: "For Participants",
    icon: FileText,
    items: [
      { id: "individual-registration", title: "Individual Registration" },
      { id: "payment-options", title: "Payment Options" },
      { id: "completing-forms", title: "Completing Liability Forms" },
      { id: "event-checkin", title: "What to Expect at Check-In" },
    ]
  },
]

const docContent: Record<string, { title: string; content: React.ReactNode }> = {
  "overview": {
    title: "What is ChiRho Events?",
    content: (
      <div className="space-y-4">
        <p>
          ChiRho Events is a comprehensive registration and event management platform built specifically
          for Catholic ministry. Whether you&apos;re organizing diocesan retreats, parish events, conferences,
          or youth gatherings, ChiRho provides all the tools you need in one place.
        </p>
        <h3 className="text-xl font-semibold text-navy mt-6">Key Features</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Registration Management</strong> - Handle group and individual registrations with customizable pricing tiers</li>
          <li><strong>Liability Forms</strong> - Three-tiered forms for youth, chaperones, and clergy with e-signatures</li>
          <li><strong>Poros Housing</strong> - Drag-and-drop room assignments with smart recommendations</li>
          <li><strong>SALVE Check-In</strong> - QR code scanning, packet printing, and name badges</li>
          <li><strong>Rapha Medical</strong> - Secure access to medical information and allergy alerts</li>
          <li><strong>Reports & Integrations</strong> - Export to Google Sheets, Mailchimp, and QuickBooks</li>
        </ul>
        <h3 className="text-xl font-semibold text-navy mt-6">Why ChiRho?</h3>
        <p>
          Unlike generic event platforms, ChiRho understands Catholic ministry. We include features like
          priest tracking, safe environment compliance, and tiered liability forms that other platforms
          simply don&apos;t offer. Plus, our pricing is transparent and fair.
        </p>
      </div>
    )
  },
  "signup": {
    title: "How to Sign Up",
    content: (
      <div className="space-y-4">
        <p>Getting started with ChiRho Events is easy:</p>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Visit the Get Started page</strong>
            <p className="ml-6 mt-1">Click the &quot;Get Started&quot; button on our homepage or navigate directly to /get-started.</p>
          </li>
          <li>
            <strong>Fill out the application form</strong>
            <p className="ml-6 mt-1">Provide your organization details, contact information, and select your subscription plan.</p>
          </li>
          <li>
            <strong>Submit for approval</strong>
            <p className="ml-6 mt-1">Our team will review your application within 24-48 hours.</p>
          </li>
          <li>
            <strong>Complete setup</strong>
            <p className="ml-6 mt-1">Once approved, you&apos;ll receive an invoice for the $250 setup fee and your first subscription payment.</p>
          </li>
          <li>
            <strong>Start creating events</strong>
            <p className="ml-6 mt-1">Log in to your admin dashboard and create your first event!</p>
          </li>
        </ol>
      </div>
    )
  },
  "plans": {
    title: "Choosing the Right Plan",
    content: (
      <div className="space-y-4">
        <p>ChiRho offers five subscription tiers to fit organizations of all sizes:</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200 mt-4">
            <thead className="bg-navy text-white">
              <tr>
                <th className="border border-gray-200 p-3 text-left">Plan</th>
                <th className="border border-gray-200 p-3 text-left">Price</th>
                <th className="border border-gray-200 p-3 text-left">Events/Year</th>
                <th className="border border-gray-200 p-3 text-left">Max People</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border p-3">Starter</td><td className="border p-3">$49/mo</td><td className="border p-3">3</td><td className="border p-3">500</td></tr>
              <tr><td className="border p-3">Small Diocese</td><td className="border p-3">$99/mo</td><td className="border p-3">5</td><td className="border p-3">1,000</td></tr>
              <tr><td className="border p-3">Growing</td><td className="border p-3">$149/mo</td><td className="border p-3">10</td><td className="border p-3">3,000</td></tr>
              <tr><td className="border p-3">Conference</td><td className="border p-3">$249/mo</td><td className="border p-3">25</td><td className="border p-3">8,000</td></tr>
              <tr><td className="border p-3">Enterprise</td><td className="border p-3">$499/mo</td><td className="border p-3">Unlimited</td><td className="border p-3">Unlimited</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          <strong>Additional fees:</strong> All plans include a one-time $250 setup fee,
          Stripe processing (2.9% + $0.30 per transaction), and 1% ChiRho platform fee.
        </p>
      </div>
    )
  },
  "setup": {
    title: "Setting Up Your Organization",
    content: (
      <div className="space-y-4">
        <p>After your account is approved, follow these steps to configure your organization:</p>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Complete your organization profile</strong>
            <p className="ml-6 mt-1">Add your logo, contact information, and billing details.</p>
          </li>
          <li>
            <strong>Set up payment processing</strong>
            <p className="ml-6 mt-1">Connect your Stripe account to receive registration payments.</p>
          </li>
          <li>
            <strong>Add team members</strong>
            <p className="ml-6 mt-1">Invite other administrators who will help manage events.</p>
          </li>
          <li>
            <strong>Configure default settings</strong>
            <p className="ml-6 mt-1">Set up default liability forms, email templates, and notification preferences.</p>
          </li>
        </ol>
        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>Tip:</strong> Our onboarding team is available to help you through setup.
            Email support@chirhoevents.com with any questions.
          </p>
        </div>
      </div>
    )
  },
  "create-event": {
    title: "Creating Your First Event",
    content: (
      <div className="space-y-4">
        <p>Ready to create your first event? Here&apos;s how:</p>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Navigate to Events</strong>
            <p className="ml-6 mt-1">From your admin dashboard, click &quot;Events&quot; in the sidebar, then &quot;Create New Event&quot;.</p>
          </li>
          <li>
            <strong>Enter basic information</strong>
            <p className="ml-6 mt-1">Provide the event name, dates, location, and description.</p>
          </li>
          <li>
            <strong>Configure registration settings</strong>
            <p className="ml-6 mt-1">Set registration deadlines, participant limits, and age requirements.</p>
          </li>
          <li>
            <strong>Set up pricing tiers</strong>
            <p className="ml-6 mt-1">Create pricing for different participant types (youth, adults, clergy, etc.).</p>
          </li>
          <li>
            <strong>Customize liability forms</strong>
            <p className="ml-6 mt-1">Select which forms are required for each participant type.</p>
          </li>
          <li>
            <strong>Publish your event</strong>
            <p className="ml-6 mt-1">Once everything is configured, publish to make registration available.</p>
          </li>
        </ol>
      </div>
    )
  },
  "register-group": {
    title: "How to Register a Group",
    content: (
      <div className="space-y-4">
        <p>As a group leader, you&apos;ll register your parish, school, or youth group for events:</p>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Get your access code</strong>
            <p className="ml-6 mt-1">The event organizer will provide you with an access code for registration.</p>
          </li>
          <li>
            <strong>Create or sign in to your account</strong>
            <p className="ml-6 mt-1">Use the &quot;Group Leader&quot; sign-in option from the navigation menu.</p>
          </li>
          <li>
            <strong>Enter your group information</strong>
            <p className="ml-6 mt-1">Provide your group name, parish affiliation, and contact details.</p>
          </li>
          <li>
            <strong>Add participants</strong>
            <p className="ml-6 mt-1">Enter the names and details of youth, chaperones, and any clergy attending.</p>
          </li>
          <li>
            <strong>Complete payment</strong>
            <p className="ml-6 mt-1">Pay the required deposit or full amount to secure your registration.</p>
          </li>
          <li>
            <strong>Distribute liability form links</strong>
            <p className="ml-6 mt-1">Send the unique form links to participants and parents to complete before the event.</p>
          </li>
        </ol>
      </div>
    )
  },
  "liability-forms": {
    title: "Completing Liability Forms",
    content: (
      <div className="space-y-4">
        <p>
          ChiRho uses three types of liability forms tailored to different participant roles:
        </p>
        <div className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-navy">Youth Forms</h4>
              <p className="text-sm text-gray-600 mt-1">
                For minors attending the event. Requires parent/guardian signature,
                medical information, emergency contacts, and photo release consent.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-navy">Chaperone Forms</h4>
              <p className="text-sm text-gray-600 mt-1">
                For adult volunteers and chaperones. Includes safe environment certification
                verification, background check confirmation, and liability waiver.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-navy">Clergy Forms</h4>
              <p className="text-sm text-gray-600 mt-1">
                For priests, deacons, and religious. Includes diocese verification,
                faculties confirmation, and contact information.
              </p>
            </CardContent>
          </Card>
        </div>
        <p className="mt-4">
          <strong>To complete a form:</strong> Click the unique link provided by your group leader
          or access the Poros portal directly. Fill out all required fields and sign electronically.
        </p>
      </div>
    )
  },
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")

  const currentDoc = docContent[activeSection] || docContent["overview"]

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav currentPage="/docs" />

      {/* Navy Header */}
      <header className="bg-navy text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold">Documentation</h1>
          <p className="text-gray-300 mt-2">Everything you need to use ChiRho Events</p>

          {/* Search Bar */}
          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-6">
              {docSections.map((section) => (
                <div key={section.id}>
                  <h3 className="flex items-center text-sm font-semibold text-navy uppercase tracking-wide mb-2">
                    <section.icon className="h-4 w-4 mr-2" />
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            activeSection === item.id
                              ? 'bg-gold/20 text-navy font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {item.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-navy mb-6">{currentDoc.title}</h2>
                <div className="prose prose-gray max-w-none text-gray-600">
                  {currentDoc.content}
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="mt-8 bg-beige border-gold/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <HelpCircle className="h-6 w-6 text-gold flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-navy">Need more help?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Can&apos;t find what you&apos;re looking for? Visit our{" "}
                      <a href="/support" className="text-gold hover:underline">Support page</a>{" "}
                      or email us at{" "}
                      <a href="mailto:support@chirhoevents.com" className="text-gold hover:underline">
                        support@chirhoevents.com
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-navy text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">&copy; 2025 ChiRho Events. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
