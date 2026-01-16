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
      { id: "event-visibility", title: "Event Visibility & Registration Status" },
      { id: "access-codes", title: "Managing Access Codes" },
      { id: "waitlist-queue", title: "Waitlist & Queue System" },
      { id: "capacity-management", title: "Managing Capacity" },
      { id: "pricing-setup", title: "Setting Up Pricing & Registration" },
      { id: "housing-daypass", title: "Housing & Day Pass Options" },
      { id: "coupon-codes", title: "Coupon & Discount Codes" },
      { id: "manage-registrations", title: "Managing Registrations & Payments" },
      { id: "email-participants", title: "Emailing Participants" },
      { id: "virtual-terminal", title: "Virtual Terminal (Phone Payments)" },
      { id: "staff-volunteer", title: "Staff & Volunteer Registration" },
      { id: "liability-individual", title: "Liability Forms for Individuals" },
      { id: "landing-page", title: "Customizing Your Landing Page" },
      { id: "poros-portal", title: "Using Poros Portal for Housing" },
      { id: "poros-public", title: "Public Poros Portal" },
      { id: "salve-checkin", title: "Using SALVE for Check-In" },
      { id: "rapha-medical", title: "Using Rapha for Medical Info" },
      { id: "reports", title: "Generating Reports" },
      { id: "custom-reports", title: "Custom Report Builder" },
      { id: "team", title: "Managing Your Team" },
      { id: "notifications", title: "Notifications & Email Digest" },
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
  {
    id: "vendors",
    title: "For Vendors",
    icon: Home,
    items: [
      { id: "vendor-registration", title: "Vendor Booth Registration" },
      { id: "vendor-portal", title: "Using the Vendor Portal" },
      { id: "vendor-staff", title: "Managing Booth Staff" },
      { id: "vendor-future", title: "Upcoming Features" },
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
              <tr><td className="border p-3">Starter</td><td className="border p-3">$25/mo</td><td className="border p-3">3</td><td className="border p-3">500</td></tr>
              <tr><td className="border p-3">Parish</td><td className="border p-3">$45/mo</td><td className="border p-3">5</td><td className="border p-3">1,000</td></tr>
              <tr><td className="border p-3">Cathedral</td><td className="border p-3">$89/mo</td><td className="border p-3">10</td><td className="border p-3">3,000</td></tr>
              <tr><td className="border p-3">Shrine</td><td className="border p-3">$120/mo</td><td className="border p-3">25</td><td className="border p-3">8,000</td></tr>
              <tr><td className="border p-3">Basilica</td><td className="border p-3">Starting at $200/mo</td><td className="border p-3">Unlimited</td><td className="border p-3">15,000+</td></tr>
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
  "pricing-setup": {
    title: "Setting Up Pricing & Registration",
    content: (
      <div className="space-y-4">
        <p>
          ChiRho Events offers flexible pricing options to accommodate different event structures.
          Here&apos;s how to configure pricing for your event:
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Creating Pricing Tiers</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Navigate to your event settings</strong>
            <p className="ml-6 mt-1">Go to Events → Select your event → Pricing & Registration tab.</p>
          </li>
          <li>
            <strong>Add participant categories</strong>
            <p className="ml-6 mt-1">Create categories for Youth, Chaperones, Clergy, and any custom types you need.</p>
          </li>
          <li>
            <strong>Set base prices</strong>
            <p className="ml-6 mt-1">Enter the registration fee for each category. You can set different prices for on-campus vs. off-campus attendance.</p>
          </li>
          <li>
            <strong>Configure early bird pricing (optional)</strong>
            <p className="ml-6 mt-1">Offer discounted rates for registrations before a specific date to encourage early sign-ups.</p>
          </li>
          <li>
            <strong>Add late fees (optional)</strong>
            <p className="ml-6 mt-1">Set automatic late fees that apply after your registration deadline.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Payment Options</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Full payment</strong> - Require full payment at registration</li>
          <li><strong>Deposit + balance</strong> - Collect a deposit now, balance due later</li>
          <li><strong>Pay later</strong> - Allow groups to register and pay by check</li>
          <li><strong>Payment plans</strong> - Split payments into installments</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Group Discounts</h3>
        <p>
          You can configure automatic discounts based on group size:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>10+ participants: 5% discount</li>
          <li>25+ participants: 10% discount</li>
          <li>50+ participants: 15% discount</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">
          These thresholds are customizable in your event settings.
        </p>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Enable &quot;Pay Later&quot; for diocesan events where parishes
            typically pay by check. You can manually mark payments as received in the admin dashboard.
          </p>
        </div>
      </div>
    )
  },
  "manage-registrations": {
    title: "Managing Registrations & Payments",
    content: (
      <div className="space-y-4">
        <p>
          Once registrations start coming in, ChiRho provides powerful tools to manage
          participants and track payments.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Viewing Registrations</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Access the registration dashboard</strong>
            <p className="ml-6 mt-1">Go to Events → Select your event → Registrations tab.</p>
          </li>
          <li>
            <strong>Filter and search</strong>
            <p className="ml-6 mt-1">Use filters to view by group, payment status, form completion, or participant type.</p>
          </li>
          <li>
            <strong>View individual details</strong>
            <p className="ml-6 mt-1">Click on any registration to see full details, payment history, and form status.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Processing Payments</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Credit card payments</strong> - Processed automatically via Stripe</li>
          <li><strong>Check payments</strong> - Mark as &quot;Paid by Check&quot; and enter check number</li>
          <li><strong>Cash payments</strong> - Record cash payments with receipt number</li>
          <li><strong>Scholarships</strong> - Apply partial or full scholarships to registrations</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Managing Balances</h3>
        <p>For each registration, you can:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View total amount due vs. amount paid</li>
          <li>Send payment reminder emails</li>
          <li>Apply late fees manually or automatically</li>
          <li>Issue partial or full refunds</li>
          <li>Generate payment receipts</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Email Notifications</h3>
        <p>ChiRho automatically sends emails for:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Registration confirmation</li>
          <li>Payment received</li>
          <li>Payment reminders (configurable)</li>
          <li>Form completion reminders</li>
          <li>Event updates (when you send them)</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Exporting Data</h3>
        <p>
          Export registration data to CSV or Excel for external processing. You can export:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Full registration list with all details</li>
          <li>Payment summary report</li>
          <li>Contact list for group leaders</li>
          <li>Participant roster by group</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Set up automatic payment reminders 2 weeks before your
            event to ensure all balances are collected in time.
          </p>
        </div>
      </div>
    )
  },
  "poros-portal": {
    title: "Using Poros Portal for Housing",
    content: (
      <div className="space-y-4">
        <p>
          <strong>Poros</strong> (Greek: Πόρος, meaning &quot;Gateway&quot;) is ChiRho&apos;s housing management
          system. It provides an intuitive drag-and-drop interface for assigning participants to rooms.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Setting Up Housing</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Navigate to Poros</strong>
            <p className="ml-6 mt-1">Go to Events → Select your event → Housing (Poros) tab.</p>
          </li>
          <li>
            <strong>Create buildings</strong>
            <p className="ml-6 mt-1">Add your venue&apos;s buildings (e.g., &quot;Dormitory A&quot;, &quot;Conference Center&quot;).</p>
          </li>
          <li>
            <strong>Add floors and rooms</strong>
            <p className="ml-6 mt-1">For each building, add floors and individual rooms with bed counts.</p>
          </li>
          <li>
            <strong>Set room types</strong>
            <p className="ml-6 mt-1">Mark rooms as Male, Female, Clergy, ADA-accessible, or Staff-only.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Assigning Participants</h3>
        <p>Poros offers two ways to assign housing:</p>

        <div className="mt-4 space-y-4">
          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Drag-and-Drop</h4>
            <p className="text-sm text-gray-600 mt-1">
              View unassigned participants on the left panel. Drag them to rooms on the right.
              The system will warn you about gender mismatches or capacity issues.
            </p>
          </div>

          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Auto-Assignment</h4>
            <p className="text-sm text-gray-600 mt-1">
              Click &quot;Auto-Assign&quot; to let Poros recommend assignments based on group,
              gender, and special requirements. Review and adjust as needed.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Housing Rules</h3>
        <p>Poros automatically enforces:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Gender separation (youth rooms)</li>
          <li>Clergy in designated rooms only</li>
          <li>Chaperone ratio requirements</li>
          <li>ADA room assignments for flagged participants</li>
          <li>Group members staying together when possible</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Roommate Requests</h3>
        <p>
          Participants can request roommates during registration. Poros highlights these
          requests and makes it easy to accommodate them when assigning rooms.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Printing Housing Lists</h3>
        <p>Generate printable reports including:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Master housing roster (all assignments)</li>
          <li>Building-by-building lists</li>
          <li>Room door signs with occupant names</li>
          <li>Group leader housing summaries</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Complete housing assignments at least 48 hours before
            your event. This gives you time to print materials and handle last-minute changes.
          </p>
        </div>
      </div>
    )
  },
  "salve-checkin": {
    title: "Using SALVE for Check-In",
    content: (
      <div className="space-y-4">
        <p>
          <strong>SALVE</strong> (Latin for &quot;Greetings&quot;) is ChiRho&apos;s check-in system designed
          for fast, efficient event arrivals. It supports QR code scanning, name tag printing,
          and welcome packet distribution.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Before the Event</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Review check-in settings</strong>
            <p className="ml-6 mt-1">Go to Events → Select your event → Check-In (SALVE) tab.</p>
          </li>
          <li>
            <strong>Configure name tag templates</strong>
            <p className="ml-6 mt-1">Customize what information appears on name tags (name, group, participant type).</p>
          </li>
          <li>
            <strong>Set up check-in stations</strong>
            <p className="ml-6 mt-1">Assign staff members to check-in stations with appropriate permissions.</p>
          </li>
          <li>
            <strong>Test your equipment</strong>
            <p className="ml-6 mt-1">Ensure barcode scanners and label printers (4x6 format) are working properly.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">During Check-In</h3>
        <div className="space-y-4 mt-4">
          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">QR Code Scanning</h4>
            <p className="text-sm text-gray-600 mt-1">
              Participants receive QR codes via email. Scan the code to instantly pull up their
              information and verify form completion.
            </p>
          </div>

          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Manual Lookup</h4>
            <p className="text-sm text-gray-600 mt-1">
              Search by name, group, or access code for participants without their QR code.
            </p>
          </div>

          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Name Tag Printing</h4>
            <p className="text-sm text-gray-600 mt-1">
              Print name tags on-demand using 4x6 thermal label printers. Tags include the
              participant&apos;s name, group, and any dietary/medical flags.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Check-In Verification</h3>
        <p>SALVE automatically verifies:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>✅ Liability form completed and signed</li>
          <li>✅ Payment status (paid in full or approved balance)</li>
          <li>✅ Safe environment certification (for adults)</li>
          <li>✅ Housing assignment</li>
        </ul>
        <p className="mt-2 text-sm text-red-600">
          ⚠️ Incomplete items are highlighted in red. Staff can override with supervisor approval.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Welcome Packets</h3>
        <p>
          Print welcome packets that include:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Event schedule</li>
          <li>Housing assignment and room location</li>
          <li>Meal ticket (if applicable)</li>
          <li>Emergency contact information</li>
          <li>Campus map</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Real-Time Dashboard</h3>
        <p>
          Monitor check-in progress with live statistics:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Total checked in vs. expected</li>
          <li>Check-ins by group</li>
          <li>Missing participants</li>
          <li>Average check-in time</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Set up multiple check-in stations for large events—one
            for groups with complete paperwork, another for those needing to resolve issues.
          </p>
        </div>
      </div>
    )
  },
  "rapha-medical": {
    title: "Using Rapha for Medical Info",
    content: (
      <div className="space-y-4">
        <p>
          <strong>Rapha</strong> (Greek: Ραφά, meaning &quot;To Heal&quot;) is ChiRho&apos;s secure medical
          information system. It provides instant access to participant health data for
          authorized staff during emergencies.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Accessing Medical Information</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Navigate to Rapha</strong>
            <p className="ml-6 mt-1">Go to Events → Select your event → Medical (Rapha) tab.</p>
          </li>
          <li>
            <strong>Search for a participant</strong>
            <p className="ml-6 mt-1">Enter the participant&apos;s name or scan their QR code for instant lookup.</p>
          </li>
          <li>
            <strong>View medical details</strong>
            <p className="ml-6 mt-1">See allergies, medications, conditions, and emergency contacts.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Medical Information Displayed</h3>
        <p>For each participant, Rapha shows:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Allergies</strong> - Food, medication, environmental (highlighted in red)</li>
          <li><strong>Current medications</strong> - Name, dosage, frequency</li>
          <li><strong>Medical conditions</strong> - Asthma, diabetes, epilepsy, etc.</li>
          <li><strong>Dietary restrictions</strong> - Vegetarian, gluten-free, kosher, etc.</li>
          <li><strong>Emergency contacts</strong> - Primary and secondary with phone numbers</li>
          <li><strong>Insurance information</strong> - Policy number and provider</li>
          <li><strong>Physician contact</strong> - Name and phone number</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Allergy Alerts</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
          <p className="text-sm text-red-800">
            <strong>🚨 Critical allergies are prominently displayed in red</strong> at the top
            of each participant&apos;s profile. This includes life-threatening allergies like
            peanuts, shellfish, bee stings, and medication allergies.
          </p>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Medical Incident Tracking</h3>
        <p>
          Document medical incidents during your event:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Click &quot;Log Incident&quot; on any participant&apos;s profile</li>
          <li>Enter the date, time, and description of the incident</li>
          <li>Document any treatment provided</li>
          <li>Note if parents/guardians were contacted</li>
          <li>Mark follow-up actions required</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Quick-Scan for Emergencies</h3>
        <p>
          In an emergency, use the Quick-Scan feature:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Scan participant&apos;s name tag QR code</li>
          <li>Instantly displays critical medical info and emergency contacts</li>
          <li>One-tap to call emergency contact</li>
          <li>Print medical summary for EMTs</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Privacy & Security</h3>
        <p>
          Rapha takes medical data privacy seriously:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Access restricted to authorized medical staff only</li>
          <li>All access is logged and auditable</li>
          <li>Data encrypted at rest and in transit</li>
          <li>HIPAA-compliant data handling practices</li>
          <li>Automatic session timeout after inactivity</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Brief your medical staff on Rapha before the event.
            Run a practice drill to ensure everyone knows how to quickly access participant
            information in an emergency.
          </p>
        </div>
      </div>
    )
  },
  "reports": {
    title: "Generating Reports",
    content: (
      <div className="space-y-4">
        <p>
          ChiRho Events provides comprehensive reporting tools to help you track registrations,
          payments, and event logistics. All reports can be exported to Excel or CSV.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Available Reports</h3>

        <div className="space-y-4 mt-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-navy">📊 Registration Summary</h4>
            <p className="text-sm text-gray-600 mt-1">
              Overview of all registrations by status (confirmed, pending, cancelled).
              Includes participant counts by type and group breakdowns.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-navy">💰 Financial Report</h4>
            <p className="text-sm text-gray-600 mt-1">
              Complete payment tracking including total revenue, outstanding balances,
              refunds issued, and payment method breakdown.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-navy">🏠 Housing Roster</h4>
            <p className="text-sm text-gray-600 mt-1">
              Room assignments by building, floor, and room. Includes occupancy rates
              and unassigned participant lists.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-navy">🍽️ Dietary Restrictions</h4>
            <p className="text-sm text-gray-600 mt-1">
              List of all dietary restrictions and allergies for meal planning.
              Grouped by restriction type with participant counts.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-navy">🏥 Medical Summary</h4>
            <p className="text-sm text-gray-600 mt-1">
              Overview of medical conditions and allergies (names redacted for privacy).
              Useful for medical staff preparation.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-navy">✅ Form Completion Status</h4>
            <p className="text-sm text-gray-600 mt-1">
              Track which participants have completed their liability forms.
              Filter by group to follow up with group leaders.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-navy">🛡️ Safe Environment Compliance</h4>
            <p className="text-sm text-gray-600 mt-1">
              Status of safe environment certifications for all adult participants.
              Highlights expired or missing certifications.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-navy">📋 Attendance Report</h4>
            <p className="text-sm text-gray-600 mt-1">
              Check-in status for all participants. Shows who has arrived,
              who is missing, and check-in timestamps.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Generating Reports</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Go to Events → Select your event → Reports tab</li>
          <li>Choose the report type you need</li>
          <li>Apply any filters (date range, groups, status)</li>
          <li>Click &quot;Generate Report&quot;</li>
          <li>View on screen or export to Excel/CSV</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Scheduled Reports</h3>
        <p>
          Set up automatic reports to be emailed to your team:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Daily registration summary</li>
          <li>Weekly payment status update</li>
          <li>Form completion reminders</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Generate your dietary restrictions report at least
            one week before the event and share it with your catering team.
          </p>
        </div>
      </div>
    )
  },
  "team": {
    title: "Managing Your Team",
    content: (
      <div className="space-y-4">
        <p>
          ChiRho allows you to invite team members to help manage your events. Each team
          member can be assigned specific roles with different permission levels.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Inviting Team Members</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Go to Organization Settings</strong>
            <p className="ml-6 mt-1">Click your organization name → Team Members.</p>
          </li>
          <li>
            <strong>Click &quot;Invite Member&quot;</strong>
            <p className="ml-6 mt-1">Enter their email address and select a role.</p>
          </li>
          <li>
            <strong>They receive an invitation</strong>
            <p className="ml-6 mt-1">The invited person will receive an email to create their account.</p>
          </li>
          <li>
            <strong>Assign to specific events (optional)</strong>
            <p className="ml-6 mt-1">Limit their access to specific events or grant organization-wide access.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Role Types</h3>
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-navy text-white">
              <tr>
                <th className="border border-gray-200 p-3 text-left">Role</th>
                <th className="border border-gray-200 p-3 text-left">Permissions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr>
                <td className="border p-3 font-semibold">Organization Admin</td>
                <td className="border p-3">Full access to everything: billing, team management, all events</td>
              </tr>
              <tr>
                <td className="border p-3 font-semibold">Event Manager</td>
                <td className="border p-3">Create and manage events, view registrations, manage housing</td>
              </tr>
              <tr>
                <td className="border p-3 font-semibold">Registration Staff</td>
                <td className="border p-3">View and edit registrations, process payments, send emails</td>
              </tr>
              <tr>
                <td className="border p-3 font-semibold">Check-In Staff</td>
                <td className="border p-3">Access SALVE check-in, print name tags, view participant info</td>
              </tr>
              <tr>
                <td className="border p-3 font-semibold">Medical Staff</td>
                <td className="border p-3">Access Rapha medical information, log incidents</td>
              </tr>
              <tr>
                <td className="border p-3 font-semibold">Housing Staff</td>
                <td className="border p-3">Manage Poros housing assignments, view rosters</td>
              </tr>
              <tr>
                <td className="border p-3 font-semibold">View Only</td>
                <td className="border p-3">Read-only access to registrations and reports</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Managing Existing Members</h3>
        <p>For each team member, you can:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Change their role</li>
          <li>Add or remove event access</li>
          <li>Temporarily disable their account</li>
          <li>Remove them from your organization</li>
          <li>View their activity log</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Best Practices</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>Follow the principle of least privilege—only grant permissions that are needed</li>
          <li>Have at least two Organization Admins for backup</li>
          <li>Remove access promptly when team members leave</li>
          <li>Use event-specific access for temporary volunteers</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Create a &quot;Check-In Staff&quot; role for event-day
            volunteers. They&apos;ll have just enough access to help with arrivals without
            seeing sensitive financial or medical data.
          </p>
        </div>
      </div>
    )
  },
  "payments": {
    title: "Making Payments",
    content: (
      <div className="space-y-4">
        <p>
          As a group leader, you&apos;re responsible for collecting and submitting payment for your
          group&apos;s registration. Here&apos;s everything you need to know about the payment process.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Payment Options</h3>
        <div className="space-y-4 mt-4">
          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Credit/Debit Card</h4>
            <p className="text-sm text-gray-600 mt-1">
              Pay instantly online using Visa, Mastercard, American Express, or Discover.
              Processed securely through Stripe.
            </p>
          </div>

          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Check</h4>
            <p className="text-sm text-gray-600 mt-1">
              Select &quot;Pay by Check&quot; during registration. Mail your check to the address
              provided, referencing your group name and access code.
            </p>
          </div>

          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Bank Transfer (ACH)</h4>
            <p className="text-sm text-gray-600 mt-1">
              For larger payments, ACH bank transfers may be available. Contact the
              event organizer for wire transfer instructions.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Payment Schedule</h3>
        <p>Most events follow this payment structure:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Deposit</strong> - Due at registration (typically 25-50% of total)</li>
          <li><strong>Balance</strong> - Due 2-4 weeks before the event</li>
          <li><strong>Late fees</strong> - May apply after the balance due date</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Viewing Your Balance</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Sign in to your Group Leader account</li>
          <li>Navigate to your group&apos;s registration</li>
          <li>View the Payment Summary showing:
            <ul className="list-disc list-inside ml-6 mt-1">
              <li>Total registration cost</li>
              <li>Payments received</li>
              <li>Current balance due</li>
              <li>Payment due date</li>
            </ul>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Making Additional Payments</h3>
        <p>
          If you need to make additional payments after your initial deposit:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Sign in to your account</li>
          <li>Go to your group&apos;s registration</li>
          <li>Click &quot;Make Payment&quot;</li>
          <li>Enter the amount (or select &quot;Pay Full Balance&quot;)</li>
          <li>Complete the payment</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Payment Receipts</h3>
        <p>
          Receipts are automatically emailed after each payment. You can also download
          receipts from your account at any time for your parish records.
        </p>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> If your parish needs to pay by check, register early
            to allow time for check processing. Most events require payment to clear before
            the balance due date.
          </p>
        </div>
      </div>
    )
  },
  "manage-participants": {
    title: "Managing Your Participants",
    content: (
      <div className="space-y-4">
        <p>
          As a group leader, you can add, edit, and manage your group&apos;s participants at any
          time before the registration deadline.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Adding Participants</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Sign in to your Group Leader account</strong>
            <p className="ml-6 mt-1">Use the same email you registered with.</p>
          </li>
          <li>
            <strong>Go to your group&apos;s registration</strong>
            <p className="ml-6 mt-1">Select the event and click on your group.</p>
          </li>
          <li>
            <strong>Click &quot;Add Participant&quot;</strong>
            <p className="ml-6 mt-1">Choose the participant type: Youth, Chaperone, or Clergy.</p>
          </li>
          <li>
            <strong>Enter their information</strong>
            <p className="ml-6 mt-1">First name, last name, email, date of birth, and any required details.</p>
          </li>
          <li>
            <strong>Save and continue</strong>
            <p className="ml-6 mt-1">The participant will receive their liability form link via email.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Editing Participant Information</h3>
        <p>
          Click on any participant&apos;s name to update their information. You can change:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Contact information</li>
          <li>Emergency contacts</li>
          <li>T-shirt size</li>
          <li>Special accommodations</li>
          <li>Roommate requests</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">
          Note: Some information (like medical details) can only be updated by the participant
          through their liability form.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Removing Participants</h3>
        <p>
          To remove a participant from your group:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Find the participant in your roster</li>
          <li>Click the &quot;Remove&quot; button</li>
          <li>Confirm the removal</li>
        </ol>
        <p className="mt-2 text-sm text-red-600">
          ⚠️ Refund policies vary by event. Contact the event organizer about refunds for
          removed participants.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Tracking Form Completion</h3>
        <p>
          Your participant roster shows the status of each person&apos;s liability form:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>✅ <span className="text-green-600">Complete</span> - Form submitted and signed</li>
          <li>⏳ <span className="text-yellow-600">In Progress</span> - Form started but not finished</li>
          <li>❌ <span className="text-red-600">Not Started</span> - Form link sent but not opened</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Resending Form Links</h3>
        <p>
          If a participant hasn&apos;t received their form link or needs it resent:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Find the participant in your roster</li>
          <li>Click &quot;Resend Form Link&quot;</li>
          <li>Verify their email address is correct</li>
          <li>Click &quot;Send&quot;</li>
        </ol>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Send regular reminders to your group about completing
            their forms. Set a deadline at least one week before the event to allow time for
            any issues.
          </p>
        </div>
      </div>
    )
  },
  "safe-environment": {
    title: "Safe Environment Requirements",
    content: (
      <div className="space-y-4">
        <p>
          Safe Environment training is required by Catholic dioceses for all adults who work
          with minors. ChiRho helps you track compliance for your group.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Who Needs Safe Environment Certification?</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>All chaperones (adults 18+)</li>
          <li>All clergy attending with youth</li>
          <li>Any adult volunteer with access to minors</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">
          Youth participants (under 18) do not need Safe Environment certification.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">How to Get Certified</h3>
        <p>
          Safe Environment training is typically provided by your diocese. Common programs include:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>VIRTUS</strong> - &quot;Protecting God&apos;s Children&quot; program</li>
          <li><strong>Safe Haven</strong> - Used by some dioceses</li>
          <li><strong>Diocesan-specific programs</strong> - Check with your diocese</li>
        </ul>
        <p className="mt-2">
          Contact your parish or diocesan office for training schedules and registration.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Uploading Your Certificate</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Access your liability form</strong>
            <p className="ml-6 mt-1">Use the link provided by your group leader.</p>
          </li>
          <li>
            <strong>Navigate to Safe Environment section</strong>
            <p className="ml-6 mt-1">This section appears for all adult (18+) participants.</p>
          </li>
          <li>
            <strong>Enter your certification details</strong>
            <p className="ml-6 mt-1">Training program name, completion date, expiration date.</p>
          </li>
          <li>
            <strong>Upload your certificate</strong>
            <p className="ml-6 mt-1">Take a photo or scan your certificate and upload it (PDF, JPG, PNG accepted).</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Certificate Expiration</h3>
        <p>
          Most Safe Environment certifications must be renewed periodically:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Initial training: Usually valid for 3-5 years</li>
          <li>Renewal/refresher: Typically required annually or every 2-3 years</li>
          <li>Background checks: May need renewal every 3-5 years</li>
        </ul>
        <p className="mt-2 text-sm text-red-600">
          ⚠️ Your certification must be valid through the event dates. Expired certifications
          will not be accepted.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">For Group Leaders: Tracking Compliance</h3>
        <p>
          You can view Safe Environment status for all adults in your group:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>✅ <span className="text-green-600">Verified</span> - Certificate uploaded and valid</li>
          <li>⏳ <span className="text-yellow-600">Pending Review</span> - Certificate uploaded, awaiting verification</li>
          <li>⚠️ <span className="text-orange-600">Expiring Soon</span> - Certificate expires within 30 days</li>
          <li>❌ <span className="text-red-600">Missing/Expired</span> - No certificate or certificate expired</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Remind your chaperones to check their certification
            expiration dates well before the event. Renewal classes may have limited availability.
          </p>
        </div>
      </div>
    )
  },
  "checkin-process": {
    title: "Check-In Process",
    content: (
      <div className="space-y-4">
        <p>
          Check-in is an exciting time! Here&apos;s what you and your group can expect when
          arriving at the event.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Before You Arrive</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Confirm all forms are complete</strong> - Check your group roster for any incomplete liability forms</li>
          <li><strong>Verify payment is current</strong> - Ensure your balance is paid or payment arrangements are confirmed</li>
          <li><strong>Print or save QR codes</strong> - Each participant should have their QR code ready (email or screenshot)</li>
          <li><strong>Gather your group</strong> - Know how many people are in your group and who&apos;s traveling together</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">At Check-In</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Find the Group Leader line</strong>
            <p className="ml-6 mt-1">Group leaders typically check in first, then their participants.</p>
          </li>
          <li>
            <strong>Present your QR code</strong>
            <p className="ml-6 mt-1">Staff will scan your code to verify your registration.</p>
          </li>
          <li>
            <strong>Verify your information</strong>
            <p className="ml-6 mt-1">Confirm your name, group, and participant count.</p>
          </li>
          <li>
            <strong>Receive your materials</strong>
            <p className="ml-6 mt-1">You&apos;ll get name tags, welcome packets, housing assignments, and any other event materials.</p>
          </li>
          <li>
            <strong>Check in your participants</strong>
            <p className="ml-6 mt-1">Direct your group members to the check-in stations with their QR codes.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">What You&apos;ll Receive</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Name tag</strong> - Wear this throughout the event (contains QR code for meals/sessions)</li>
          <li><strong>Welcome packet</strong> - Event schedule, campus map, emergency info</li>
          <li><strong>Housing assignment</strong> - Building, room number, and roommates</li>
          <li><strong>Meal tickets</strong> - If applicable for your event</li>
          <li><strong>Swag bag</strong> - T-shirt, water bottle, or other event items</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">If Something Is Missing</h3>
        <p>
          Don&apos;t worry! Common issues can be resolved at check-in:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Incomplete form</strong> - A supervisor can help complete it on-site</li>
          <li><strong>Payment issue</strong> - Speak with the registration desk to resolve</li>
          <li><strong>Missing QR code</strong> - Staff can look you up by name and group</li>
          <li><strong>Housing change needed</strong> - Request changes at the housing desk</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">After Check-In</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Take your group to your housing assignments</li>
          <li>Unpack and get settled</li>
          <li>Review the event schedule together</li>
          <li>Attend the opening session or orientation</li>
          <li>Enjoy the event!</li>
        </ol>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Arrive during the designated check-in window if possible.
            This avoids long lines and gives you time to settle in before the event begins.
          </p>
        </div>
      </div>
    )
  },
  "individual-registration": {
    title: "Individual Registration",
    content: (
      <div className="space-y-4">
        <p>
          Some events allow individuals to register without being part of a group. Here&apos;s
          how to register as an individual participant.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Before You Begin</h3>
        <p>You&apos;ll need:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>The event registration link (from the organizer or event website)</li>
          <li>Your personal information (name, email, phone, address)</li>
          <li>Emergency contact information</li>
          <li>Payment method (credit card or other accepted payment)</li>
          <li>Medical information (allergies, medications, conditions)</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Step-by-Step Registration</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Click the registration link</strong>
            <p className="ml-6 mt-1">This takes you to the event&apos;s registration page.</p>
          </li>
          <li>
            <strong>Select &quot;Register as Individual&quot;</strong>
            <p className="ml-6 mt-1">Choose this option if you&apos;re not part of a parish or school group.</p>
          </li>
          <li>
            <strong>Create your account</strong>
            <p className="ml-6 mt-1">Enter your email and create a password. You&apos;ll use this to access your registration later.</p>
          </li>
          <li>
            <strong>Enter your information</strong>
            <p className="ml-6 mt-1">Fill in all required fields: name, contact info, date of birth, etc.</p>
          </li>
          <li>
            <strong>Select your registration type</strong>
            <p className="ml-6 mt-1">Choose the appropriate option (on-campus, off-campus, day pass, etc.).</p>
          </li>
          <li>
            <strong>Add any extras</strong>
            <p className="ml-6 mt-1">Select optional add-ons like t-shirts, meals, or workshop sessions.</p>
          </li>
          <li>
            <strong>Review and pay</strong>
            <p className="ml-6 mt-1">Confirm your information and complete payment.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">After Registration</h3>
        <p>You&apos;ll receive:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Confirmation email with your registration details</li>
          <li>QR code for event check-in</li>
          <li>Link to complete your liability form</li>
          <li>Payment receipt</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Completing Your Liability Form</h3>
        <p>
          After registering, you must complete a liability form before attending:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Click the liability form link in your confirmation email</li>
          <li>Fill in all required medical and emergency information</li>
          <li>Sign electronically</li>
          <li>If you&apos;re under 18, a parent/guardian must also sign</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Managing Your Registration</h3>
        <p>
          Sign in to your account at any time to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View your registration status</li>
          <li>Update your contact information</li>
          <li>Make additional payments</li>
          <li>Download your QR code</li>
          <li>View your housing assignment (when available)</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Save your confirmation email and QR code to your phone
            for easy access at check-in. You can also take a screenshot of your QR code.
          </p>
        </div>
      </div>
    )
  },
  "payment-options": {
    title: "Payment Options",
    content: (
      <div className="space-y-4">
        <p>
          ChiRho Events offers flexible payment options to make registration accessible
          for everyone.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Accepted Payment Methods</h3>
        <div className="space-y-4 mt-4">
          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Credit & Debit Cards</h4>
            <p className="text-sm text-gray-600 mt-1">
              Visa, Mastercard, American Express, and Discover are accepted.
              Payments are processed securely through Stripe.
            </p>
          </div>

          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Digital Wallets</h4>
            <p className="text-sm text-gray-600 mt-1">
              Apple Pay and Google Pay are supported for quick checkout on
              compatible devices.
            </p>
          </div>

          <div className="border-l-4 border-gold pl-4">
            <h4 className="font-semibold text-navy">Check (Group Registrations)</h4>
            <p className="text-sm text-gray-600 mt-1">
              Groups may be able to pay by check. Select &quot;Pay by Check&quot; at checkout
              and follow the mailing instructions.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Payment Timing</h3>
        <p>Depending on the event, you may have options for when to pay:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Pay in full</strong> - Complete payment at registration</li>
          <li><strong>Deposit + balance</strong> - Pay a deposit now, balance due later</li>
          <li><strong>Payment plan</strong> - Split into multiple installments</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Scholarships & Financial Aid</h3>
        <p>
          Many events offer scholarships or sliding scale pricing. If you need financial
          assistance:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Contact the event organizer before registering</li>
          <li>Ask about scholarship availability</li>
          <li>Complete any required scholarship application</li>
          <li>You may receive a discount code to use during registration</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Refund Policy</h3>
        <p>
          Refund policies vary by event. Typical terms include:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Full refund if cancelled 30+ days before the event</li>
          <li>Partial refund (minus deposit) if cancelled 14-30 days before</li>
          <li>No refund for cancellations within 14 days of the event</li>
          <li>Transfers to another participant may be allowed</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">
          Check the specific event&apos;s refund policy before registering.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Payment Security</h3>
        <p>
          Your payment information is secure:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Payments processed by Stripe (PCI-compliant)</li>
          <li>Card numbers are never stored on ChiRho servers</li>
          <li>All transactions use HTTPS encryption</li>
          <li>Receipts are emailed immediately after payment</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> If you need to request a refund or have payment questions,
            contact the event organizer directly. Their contact information is in your confirmation email.
          </p>
        </div>
      </div>
    )
  },
  "completing-forms": {
    title: "Completing Liability Forms",
    content: (
      <div className="space-y-4">
        <p>
          Every participant must complete a liability form before attending an event.
          This guide explains the form types and how to complete them.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Form Types</h3>
        <p>
          ChiRho uses different forms based on your role and age:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Youth Under 18</strong> - Requires parent/guardian signature</li>
          <li><strong>Youth 18+ / Chaperone</strong> - Adult liability form with Safe Environment section</li>
          <li><strong>Clergy</strong> - Special form for priests, deacons, and religious</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Accessing Your Form</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Check your email</strong>
            <p className="ml-6 mt-1">After registration, you&apos;ll receive an email with your personal form link.</p>
          </li>
          <li>
            <strong>Click the form link</strong>
            <p className="ml-6 mt-1">The link takes you directly to your pre-filled form.</p>
          </li>
          <li>
            <strong>Or use your access code</strong>
            <p className="ml-6 mt-1">Go to the event&apos;s Poros portal and enter your access code.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Information Required</h3>
        <p>Be prepared to provide:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Personal info</strong> - Full legal name, date of birth, address</li>
          <li><strong>Emergency contacts</strong> - Two contacts with phone numbers</li>
          <li><strong>Medical information</strong>
            <ul className="list-disc list-inside ml-6 mt-1">
              <li>Allergies (food, medication, environmental)</li>
              <li>Current medications</li>
              <li>Medical conditions</li>
              <li>Insurance information</li>
            </ul>
          </li>
          <li><strong>Dietary restrictions</strong> - Vegetarian, gluten-free, etc.</li>
          <li><strong>Photo release consent</strong> - Permission to use photos from the event</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">For Youth Under 18</h3>
        <p>
          If you&apos;re under 18, a parent or guardian must also complete parts of your form:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>You fill out your personal information</li>
          <li>Your parent/guardian receives an email to complete their section</li>
          <li>They provide consent for medical treatment, photo release, etc.</li>
          <li>They sign electronically</li>
          <li>Once both sections are complete, your form is submitted</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">For Adults (18+)</h3>
        <p>
          Adults complete the form themselves and may also need to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Upload Safe Environment certification</li>
          <li>Confirm background check completion</li>
          <li>Agree to chaperone responsibilities</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Signing Your Form</h3>
        <p>
          E-signatures are legally binding. You&apos;ll:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Type your full legal name</li>
          <li>Check the agreement box</li>
          <li>Click &quot;Sign and Submit&quot;</li>
          <li>Receive confirmation email</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Troubleshooting</h3>
        <p>Common issues and solutions:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Can&apos;t find form link?</strong> - Check spam folder or contact your group leader</li>
          <li><strong>Form won&apos;t submit?</strong> - Ensure all required fields are filled</li>
          <li><strong>Need to make changes?</strong> - Contact the event organizer</li>
          <li><strong>Parent email not received?</strong> - Verify email address and resend</li>
        </ul>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Complete your form well before the deadline. Last-minute
            issues with forms can cause stress on arrival day.
          </p>
        </div>
      </div>
    )
  },
  "event-checkin": {
    title: "What to Expect at Check-In",
    content: (
      <div className="space-y-4">
        <p>
          You&apos;ve registered, completed your forms, and now you&apos;re heading to the event!
          Here&apos;s what to expect when you arrive.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">What to Bring</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Your QR code</strong> - On your phone or printed out</li>
          <li><strong>Photo ID</strong> - For identity verification (adults)</li>
          <li><strong>Confirmation email</strong> - Just in case</li>
          <li><strong>Any required documents</strong> - Safe Environment certificate, etc.</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Arrival & Check-In</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-600">
          <li>
            <strong>Find the check-in area</strong>
            <p className="ml-6 mt-1">Look for signs directing you to registration/check-in. Staff will be there to help.</p>
          </li>
          <li>
            <strong>Get in the right line</strong>
            <p className="ml-6 mt-1">There may be separate lines for groups, individuals, or those with issues to resolve.</p>
          </li>
          <li>
            <strong>Present your QR code</strong>
            <p className="ml-6 mt-1">Staff will scan your code to pull up your registration.</p>
          </li>
          <li>
            <strong>Verify your information</strong>
            <p className="ml-6 mt-1">Confirm your name and check that all your forms are complete.</p>
          </li>
          <li>
            <strong>Receive your materials</strong>
            <p className="ml-6 mt-1">Get your name tag, welcome packet, and other event materials.</p>
          </li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Your Name Tag</h3>
        <p>
          Your name tag is important—it&apos;s your &quot;passport&quot; for the event:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Shows your name and group/parish</li>
          <li>Contains a QR code for meal access and sessions</li>
          <li>May have color-coding for your participant type</li>
          <li>Displays dietary flags (different colored dot or icon)</li>
          <li>Wear it throughout the event!</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Your Welcome Packet</h3>
        <p>Your packet typically includes:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Event schedule with session times and locations</li>
          <li>Campus/venue map</li>
          <li>Your housing assignment (building, room number)</li>
          <li>Meal schedule and any meal tickets</li>
          <li>Emergency contact numbers</li>
          <li>WiFi information</li>
          <li>Event swag (t-shirt, water bottle, etc.)</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Getting to Your Room</h3>
        <p>After check-in:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Find your housing assignment in your packet</li>
          <li>Use the campus map to locate your building</li>
          <li>Look for your room number</li>
          <li>Meet your roommates!</li>
          <li>Unpack and settle in</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">If There&apos;s a Problem</h3>
        <p>Don&apos;t worry—staff are there to help with common issues:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Form incomplete?</strong> - Visit the issues desk to complete it</li>
          <li><strong>Payment problem?</strong> - Registration desk can help resolve it</li>
          <li><strong>Housing issue?</strong> - Housing desk can address concerns</li>
          <li><strong>Lost your QR code?</strong> - Staff can look you up by name</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">First Steps After Check-In</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Go to your room and unpack</li>
          <li>Review the event schedule</li>
          <li>Note when and where the first session or meal is</li>
          <li>Find the dining hall, chapel, and main session areas</li>
          <li>Connect with your group if applicable</li>
          <li>Enjoy the event!</li>
        </ol>

        <div className="bg-beige p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Take a photo of your housing assignment and the campus map.
            It&apos;s much easier than digging through your packet every time!
          </p>
        </div>
      </div>
    )
  },

  // ===== ORG ADMIN DOCUMENTATION =====

  "event-visibility": {
    title: "Event Visibility & Registration Status",
    content: (
      <div className="space-y-4">
        <p>
          Control how your event appears to the public and manage registration availability using
          the visibility and status toggles in your event settings.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Event Visibility Toggle</h3>
        <p>Found in <strong>Settings &gt; Event Settings</strong>, this controls whether your event is visible:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Visible (Public):</strong> Event appears on your landing page and can be found by anyone with the link</li>
          <li><strong>Hidden (Draft):</strong> Event is only visible to organization admins in the dashboard</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Registration Status Toggle</h3>
        <p>This controls whether people can actively register:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Open:</strong> Registration buttons are active and people can sign up</li>
          <li><strong>Closed:</strong> Event is visible but registration is disabled (shows &quot;Registration Closed&quot;)</li>
          <li><strong>Coming Soon:</strong> Event is visible with a countdown to when registration opens</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">How It Appears on the Landing Page</h3>
        <p>Based on your settings, visitors will see:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Registration Open:</strong> &quot;Register Now&quot; button is clickable</li>
          <li><strong>Registration Closed:</strong> Button shows &quot;Registration Closed&quot; and is disabled</li>
          <li><strong>Coming Soon:</strong> Countdown timer displays time until registration opens</li>
          <li><strong>Event Full + Waitlist:</strong> &quot;Join Waitlist&quot; button appears instead</li>
        </ul>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Tip:</strong> You can set registration to open and close automatically by configuring
            the registration start and end dates in your event settings.
          </p>
        </div>
      </div>
    )
  },

  "access-codes": {
    title: "Managing Access Codes",
    content: (
      <div className="space-y-4">
        <p>
          Access codes provide unique identifiers for groups to access their registration portal
          and manage their participants. Each group receives a unique code when they register.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">How Access Codes Work</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Generated automatically when a group registers</li>
          <li>Sent to the group leader via email confirmation</li>
          <li>Used to access the Group Leader Portal</li>
          <li>Required for participants to complete liability forms</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Managing Access Codes</h3>
        <p>As an admin, you can manage access codes from the <strong>Registrations</strong> tab:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Navigate to your event&apos;s <strong>Registrations</strong> section</li>
          <li>Find the group in the list</li>
          <li>Click on the group to view details</li>
          <li>The access code is displayed in the group information</li>
          <li>Use &quot;Resend Code&quot; to email the code to the group leader again</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Access Code Security</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Codes are unique to each registration</li>
          <li>Cannot be reused across different events</li>
          <li>Group leaders should keep codes confidential</li>
          <li>Admins can regenerate codes if compromised</li>
        </ul>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Note:</strong> Individual registrations also receive confirmation codes that work
            similarly for accessing their personal portal.
          </p>
        </div>
      </div>
    )
  },

  "waitlist-queue": {
    title: "Waitlist & Queue System",
    content: (
      <div className="space-y-4">
        <p>
          The waitlist system allows interested participants to join a queue when your event reaches
          capacity. When spots open up, you can invite people from the waitlist to complete their registration.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Enabling the Waitlist</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to your event&apos;s <strong>Edit</strong> page</li>
          <li>Navigate to <strong>Step 6: Landing Page</strong></li>
          <li>Find the <strong>Waitlist Settings</strong> section</li>
          <li>Toggle <strong>Enable Waitlist</strong> on</li>
          <li>Optionally set a maximum waitlist capacity (leave blank for unlimited)</li>
          <li>Save your changes</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">How the Queue Works</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>When event is full, visitors see a &quot;Join Waitlist&quot; button instead of &quot;Register&quot;</li>
          <li>People provide: name, email, phone, party size, and any preferences</li>
          <li>They receive a confirmation email with their position in the queue</li>
          <li>Queue position is first-come, first-served based on join time</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Managing the Waitlist (Admin)</h3>
        <p>Access waitlist management from <strong>Event Dashboard &gt; Waitlist</strong>:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>View Queue:</strong> See all entries sorted by position with contact info and preferences</li>
          <li><strong>Contact Person:</strong> Send an invitation email to register (48-hour expiration)</li>
          <li><strong>Update Status:</strong> Mark entries as pending, contacted, registered, or expired</li>
          <li><strong>Analytics:</strong> View conversion rates, average wait times, and spots filled</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Inviting from Waitlist</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Click <strong>Contact</strong> next to a waitlist entry</li>
          <li>System generates a secure registration link (valid for 48 hours)</li>
          <li>Invitation email is sent automatically</li>
          <li>Entry status changes to &quot;Contacted&quot;</li>
          <li>When they complete registration, status becomes &quot;Registered&quot;</li>
          <li>If 48 hours pass without registration, status becomes &quot;Expired&quot;</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Recommendations</h3>
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Enable waitlist before your event fills up so the button is ready</li>
            <li>Check waitlist regularly and invite people promptly when spots open</li>
            <li>Consider party size when inviting (invite people whose party size matches available spots)</li>
            <li>Expired invitations can be re-sent if the person is still interested</li>
            <li>Use the analytics to track your conversion rate and optimize timing</li>
          </ul>
        </div>
      </div>
    )
  },

  "capacity-management": {
    title: "Managing Capacity",
    content: (
      <div className="space-y-4">
        <p>
          Capacity management helps you control how many participants can register for your event,
          with separate tracking for groups and individuals, housing types, and room configurations.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Setting Event Capacity</h3>
        <p>Configure capacity in <strong>Event Settings &gt; Registration</strong>:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Total Event Capacity:</strong> Maximum number of participants overall</li>
          <li><strong>Group Registration Slots:</strong> Maximum number of group registrations allowed</li>
          <li><strong>Individual Registration Slots:</strong> Maximum individual registrations allowed</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Adding & Dropping Slots</h3>

        <h4 className="text-lg font-medium text-navy mt-4">For Group Registration:</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Dashboard &gt; Registrations &gt; Groups</strong></li>
          <li>Find the group you want to modify</li>
          <li>Click to open group details</li>
          <li>Use <strong>Add Participant</strong> to increase group size</li>
          <li>Use <strong>Remove Participant</strong> to decrease (refund may be needed)</li>
          <li>Changes update capacity counters automatically</li>
        </ol>

        <h4 className="text-lg font-medium text-navy mt-4">For Individual Registration:</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Dashboard &gt; Registrations &gt; Individuals</strong></li>
          <li>Find the individual registration</li>
          <li>Use <strong>Cancel Registration</strong> to free up the slot</li>
          <li>Process any necessary refunds</li>
          <li>Slot becomes available for new registrations</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Recalculating Capacities</h3>
        <p>
          If your capacity numbers seem incorrect (due to cancelled registrations, system issues, etc.),
          use the <strong>Recalculate Capacities</strong> feature:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Settings &gt; Advanced</strong></li>
          <li>Find the <strong>Recalculate Capacities</strong> button</li>
          <li>Click to trigger a full recount of all registrations</li>
          <li>System recalculates: total participants, housing counts, room type counts</li>
          <li>Capacity remaining is updated across all categories</li>
        </ol>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
          <p className="text-sm">
            <strong>When to Recalculate:</strong> Use this feature if you&apos;ve manually edited registrations
            in the database, imported data, or notice capacity numbers don&apos;t match your actual registrations.
          </p>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Capacity by Housing Type</h3>
        <p>You can also set capacity limits for specific housing types:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>On-Campus Housing:</strong> Limit based on available dorm rooms</li>
          <li><strong>Off-Campus Housing:</strong> For those staying at nearby hotels</li>
          <li><strong>Day Pass:</strong> For commuters not requiring overnight accommodation</li>
        </ul>
      </div>
    )
  },

  "housing-daypass": {
    title: "Housing & Day Pass Options",
    content: (
      <div className="space-y-4">
        <p>
          Configure different housing options for your event participants, from on-campus dormitories
          to day passes for commuters.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Housing Types</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>On-Campus:</strong> Staying in venue dormitories/rooms with room type selection</li>
          <li><strong>Off-Campus:</strong> Staying at nearby hotels (you arrange or they arrange)</li>
          <li><strong>Day Pass:</strong> Attending without overnight accommodation</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Setting Up Housing Capacities</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Edit &gt; Step 2: Registration</strong></li>
          <li>Enable the housing types you want to offer</li>
          <li>Set capacity for each type (total beds/spots available)</li>
          <li>Configure pricing for each housing option</li>
          <li>Save your settings</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Room Types (On-Campus)</h3>
        <p>For on-campus housing, you can offer different room configurations:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Single:</strong> Private room for one person</li>
          <li><strong>Double:</strong> Room shared by two people</li>
          <li><strong>Triple:</strong> Room shared by three people</li>
          <li><strong>Quad:</strong> Room shared by four people</li>
        </ul>
        <p className="mt-2">Each room type can have its own capacity limit and pricing.</p>

        <h3 className="text-xl font-semibold text-navy mt-6">Day Pass Options</h3>
        <p>
          Day passes are now offered as a flexible option for commuters. You can configure:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Full Event Day Pass:</strong> Access to all sessions without housing</li>
          <li><strong>Single Day Pass:</strong> Access for specific days only</li>
          <li><strong>Day Pass with Meals:</strong> Include meal plan for day attendees</li>
          <li><strong>Custom Options:</strong> Create specific day pass tiers with different inclusions</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Configuring Day Pass</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>In event settings, enable <strong>Day Pass</strong> as a housing type</li>
          <li>Set the base price for day passes</li>
          <li>Optionally create multiple day pass tiers with different prices</li>
          <li>Set capacity limits if needed</li>
          <li>Configure what&apos;s included (meals, materials, etc.)</li>
        </ol>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Tip:</strong> Day passes are great for local participants, speakers who only attend
            part of the event, or when your housing is full but you have session capacity.
          </p>
        </div>
      </div>
    )
  },

  "coupon-codes": {
    title: "Coupon & Discount Codes",
    content: (
      <div className="space-y-4">
        <p>
          Create promotional codes to offer discounts to specific groups, early registrants,
          or for special circumstances.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Creating Coupon Codes</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Dashboard &gt; Coupons</strong></li>
          <li>Click <strong>Create New Coupon</strong></li>
          <li>Enter a unique code (e.g., &quot;EARLYBIRD2025&quot;)</li>
          <li>Select discount type: percentage or fixed amount</li>
          <li>Set the discount value</li>
          <li>Configure usage limits (optional)</li>
          <li>Set expiration date (optional)</li>
          <li>Save the coupon</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Discount Types</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Percentage Off:</strong> Reduces total by a percentage (e.g., 10% off)</li>
          <li><strong>Fixed Amount:</strong> Reduces total by a dollar amount (e.g., $25 off)</li>
          <li><strong>Per Person:</strong> Applies discount to each participant in a group</li>
          <li><strong>Per Registration:</strong> Applies once to the total registration</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Coupon Settings</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Usage Limit:</strong> Maximum number of times the code can be used</li>
          <li><strong>Expiration Date:</strong> Code becomes invalid after this date</li>
          <li><strong>Minimum Purchase:</strong> Require minimum amount before discount applies</li>
          <li><strong>Applies To:</strong> Restrict to specific registration types (group, individual, etc.)</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">How Registrants Use Coupons</h3>
        <p>During registration, participants can:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Enter the coupon code in the &quot;Promo Code&quot; field</li>
          <li>Click &quot;Apply&quot; to validate the code</li>
          <li>See the discount reflected in their total</li>
          <li>Proceed with the discounted payment</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Tracking Coupon Usage</h3>
        <p>Monitor your coupons from the <strong>Coupons</strong> dashboard:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View total uses and remaining uses</li>
          <li>See total discount amount given</li>
          <li>View which registrations used each code</li>
          <li>Disable or delete codes as needed</li>
        </ul>
      </div>
    )
  },

  "email-participants": {
    title: "Emailing Participants",
    content: (
      <div className="space-y-4">
        <p>
          Send emails directly to your event participants from within ChiRho Events.
          This feature allows you to communicate important updates, reminders, and information
          to groups or individuals.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Sending Emails to Groups</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Dashboard &gt; Registrations</strong></li>
          <li>Select the <strong>Groups</strong> tab</li>
          <li>Select one or more groups using the checkboxes</li>
          <li>Click the <strong>Email Selected</strong> button</li>
          <li>Compose your message with subject and body</li>
          <li>Preview and send</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Email Options</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Email Group Leaders:</strong> Send to the primary contact for each group</li>
          <li><strong>Email All Participants:</strong> Send to everyone in selected groups</li>
          <li><strong>Email by Status:</strong> Filter by payment status, form completion, etc.</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Bulk Email Features</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Send to all registered participants at once</li>
          <li>Filter recipients by registration type (group, individual, staff, vendor)</li>
          <li>Include event details automatically</li>
          <li>Track delivery status</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Common Use Cases</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Reminder about upcoming payment deadlines</li>
          <li>Form completion reminders</li>
          <li>Event schedule or location updates</li>
          <li>Packing list and what to bring</li>
          <li>Last-minute changes or announcements</li>
          <li>Post-event thank you messages</li>
        </ul>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Note:</strong> Emails are sent from your organization&apos;s configured email address
            and include automatic unsubscribe links for compliance.
          </p>
        </div>
      </div>
    )
  },

  "virtual-terminal": {
    title: "Virtual Terminal (Phone Payments)",
    content: (
      <div className="space-y-4">
        <p>
          The Virtual Terminal allows you to process payments over the phone or in person
          when participants can&apos;t complete online payment themselves.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">When to Use Virtual Terminal</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Participant calls to pay by phone with a credit card</li>
          <li>Processing payment for someone without internet access</li>
          <li>Taking payment at a registration table or event</li>
          <li>Handling special payment situations that require admin assistance</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Accessing Virtual Terminal</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Dashboard &gt; Registrations</strong></li>
          <li>Find the registration that needs payment</li>
          <li>Click on the registration to open details</li>
          <li>Click <strong>Process Payment</strong> or <strong>Virtual Terminal</strong></li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Processing a Payment</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Verify the participant&apos;s identity and registration</li>
          <li>Confirm the amount to be charged</li>
          <li>Enter the card details provided by the participant</li>
          <li>Process the payment through Stripe</li>
          <li>Provide confirmation number to the participant</li>
          <li>Receipt is automatically emailed</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Payment Options</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Full Payment:</strong> Pay the entire remaining balance</li>
          <li><strong>Partial Payment:</strong> Pay a specific amount toward the balance</li>
          <li><strong>Deposit Only:</strong> Pay just the required deposit</li>
        </ul>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Security Note:</strong> Never store or write down card numbers. Enter them directly
            into the secure payment form and confirm the transaction is complete before ending the call.
          </p>
        </div>
      </div>
    )
  },

  "staff-volunteer": {
    title: "Staff & Volunteer Registration",
    content: (
      <div className="space-y-4">
        <p>
          ChiRho Events provides a separate registration pathway for staff, volunteers, and vendor
          booth workers. This option appears at the bottom of your event&apos;s registration page.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Enabling Staff/Volunteer Registration</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Edit &gt; Step 2: Registration</strong></li>
          <li>Find the <strong>Staff & Volunteer Settings</strong> section</li>
          <li>Toggle <strong>Enable Staff Registration</strong> on</li>
          <li>Optionally enable <strong>Volunteer Registration</strong></li>
          <li>Set pricing for staff/volunteer registration (can be $0 for free)</li>
          <li>Save your settings</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Where It Appears</h3>
        <p>
          Once enabled, a link appears at the <strong>bottom of your event registration page</strong>:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>&quot;Are you staff or a volunteer? Register here&quot;</li>
          <li>&quot;Vendor booth staff? Click here to register&quot;</li>
        </ul>
        <p className="mt-2">
          This keeps the main registration flow clean while providing easy access for staff.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Staff Registration Types</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Event Staff:</strong> Your organization&apos;s team members</li>
          <li><strong>Volunteers:</strong> People helping at the event</li>
          <li><strong>Vendor Booth Staff:</strong> Workers for registered vendors (use vendor code)</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Vendor Booth Staff</h3>
        <p>When vendors are approved, they receive a <strong>Vendor Code</strong>. Their booth workers:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Click the staff registration link</li>
          <li>Select &quot;Vendor Booth Staff&quot;</li>
          <li>Enter the vendor code provided by their employer</li>
          <li>Complete registration with their personal details</li>
          <li>Are linked to the vendor for tracking purposes</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Staff Registration Fields</h3>
        <p>Staff registrations collect:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Name and contact information</li>
          <li>Role/position at event</li>
          <li>T-shirt size</li>
          <li>Dietary restrictions</li>
          <li>Emergency contact</li>
          <li>Housing needs (if applicable)</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Managing Staff Registrations</h3>
        <p>View and manage staff from <strong>Event Dashboard &gt; Registrations &gt; Staff</strong>:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View all staff and volunteer registrations</li>
          <li>Filter by type (staff, volunteer, vendor booth)</li>
          <li>Track form completion and payment status</li>
          <li>Export staff lists for badges and scheduling</li>
        </ul>
      </div>
    )
  },

  "liability-individual": {
    title: "Liability Forms for Individuals",
    content: (
      <div className="space-y-4">
        <p>
          Individual registrations can require liability forms just like group registrations.
          The form type is automatically determined based on the participant&apos;s age.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Enabling Liability Forms</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Edit &gt; Step 3: Features</strong></li>
          <li>Find <strong>Liability Forms</strong> section</li>
          <li>Toggle <strong>Require Forms for Individual Registration</strong> on</li>
          <li>Save your settings</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">How It Works</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Form type is determined by age at time of event</li>
          <li><strong>Under 18:</strong> Youth U18 form (requires parent/guardian completion)</li>
          <li><strong>18 and older:</strong> Adult form (self-completion)</li>
          <li>Form link is included in registration confirmation email</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Under-18 Flow</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Youth registers and provides parent/guardian email</li>
          <li>Parent receives email with secure link</li>
          <li>Link is valid for 7 days</li>
          <li>Parent completes medical info, emergency contacts, and signature</li>
          <li>Form is submitted and PDF generated</li>
          <li>Both youth and parent receive confirmation</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Adult Flow</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Individual registers for the event</li>
          <li>Receives email with form completion link</li>
          <li>Completes form directly (no parent needed)</li>
          <li>Provides medical info, emergency contacts, insurance</li>
          <li>Signs electronically</li>
          <li>PDF is generated and stored</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Information Collected</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Medical conditions and medications</li>
          <li>Allergies (food and medication)</li>
          <li>Dietary restrictions</li>
          <li>ADA accommodations needed</li>
          <li>Two emergency contacts</li>
          <li>Insurance information (provider, policy number)</li>
          <li>Electronic signature with consent acknowledgments</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Admin Management</h3>
        <p>Track individual forms from <strong>Event Dashboard &gt; Poros/Liability &gt; Individuals</strong>:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View completion status: Not Started, Pending (waiting on parent), Completed</li>
          <li>Resend form emails</li>
          <li>Download completed PDFs</li>
          <li>View medical alerts and emergency contacts</li>
          <li>Approve or deny forms if review is required</li>
        </ul>
      </div>
    )
  },

  "landing-page": {
    title: "Customizing Your Landing Page",
    content: (
      <div className="space-y-4">
        <p>
          Create a beautiful, branded landing page for your event with customizable colors,
          images, and content sections.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Accessing Landing Page Settings</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Edit</strong></li>
          <li>Navigate to <strong>Step 6: Landing Page</strong></li>
          <li>All customization options are on this page</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Theme Customization</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Background Image:</strong> Upload a hero image (recommended 1920x1080px, max 5MB)</li>
          <li><strong>Primary Color:</strong> Main color for buttons and headers (default: navy)</li>
          <li><strong>Secondary Color:</strong> Accent color for highlights (default: gold)</li>
          <li><strong>Overlay Color:</strong> Color overlay on background image</li>
          <li><strong>Overlay Opacity:</strong> 0-100% to control image darkness</li>
        </ul>

        <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Important:</strong> When uploading a background image, make sure to <strong>save your
            settings</strong> after the upload completes. The image upload and settings save are separate
            actions—if you don&apos;t save, your image may not appear!
          </p>
        </div>

        <h3 className="text-xl font-semibold text-navy mt-6">Content Sections</h3>
        <p>Toggle these sections on or off and customize their content:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Show Price:</strong> Display pricing information</li>
          <li><strong>Show Schedule:</strong> Event agenda/schedule</li>
          <li><strong>Show FAQ:</strong> Frequently asked questions (use Q: and A: format)</li>
          <li><strong>Show What&apos;s Included:</strong> What participants get</li>
          <li><strong>Show What to Bring:</strong> Packing list</li>
          <li><strong>Show Contact Info:</strong> How to reach organizers</li>
          <li><strong>Show Event Capacity:</strong> Total attendee count</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Countdown Timer</h3>
        <p>Display countdown timers before registration opens or closes:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Location:</strong> Hero section, sticky top bar, or registration section</li>
          <li><strong>Before Opening:</strong> Show countdown until registration opens</li>
          <li><strong>Before Closing:</strong> Show countdown until registration closes</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Availability Display</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Show Spots Remaining:</strong> Display available capacity</li>
          <li><strong>Threshold:</strong> Only show when spots drop below this number (default: 20)</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Tips for a Great Landing Page</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Use high-quality images that represent your event</li>
          <li>Keep descriptions concise and scannable</li>
          <li>Include all essential information (dates, location, what to expect)</li>
          <li>Test on mobile—most visitors will view on phones</li>
          <li>Always save after making changes!</li>
        </ul>
      </div>
    )
  },

  "poros-public": {
    title: "Public Poros Portal",
    content: (
      <div className="space-y-4">
        <p>
          The Public Poros Portal allows participants to look up their housing assignments,
          meal schedules, and other information using their access code or QR code.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">What is the Public Portal?</h3>
        <p>
          Poros (Greek: &quot;Gateway&quot;) provides a participant-facing portal where attendees can:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View their housing/room assignment</li>
          <li>See their meal schedule and colors</li>
          <li>Check their small group assignment</li>
          <li>View seating section</li>
          <li>Access event schedule and information</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">How It Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Participants receive their access code via registration email</li>
          <li>They visit the public portal URL for your event</li>
          <li>Enter their access code or scan their QR code</li>
          <li>View their personalized event information</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Portal URL Structure</h3>
        <p>The public portal is accessible at:</p>
        <code className="block bg-gray-100 p-2 rounded mt-2">
          yoursite.com/poros/[access-code]
        </code>

        <h3 className="text-xl font-semibold text-navy mt-6">Enabling Features</h3>
        <p>Control what appears in the public portal from <strong>Event Settings &gt; Poros Features</strong>:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Housing assignments</li>
          <li>Meal schedules</li>
          <li>Small group assignments</li>
          <li>Seating sections</li>
          <li>Custom event information</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">QR Code Posters</h3>
        <p>
          Generate QR code posters for your event that participants can scan to quickly access
          their information:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Dashboard &gt; Poros</strong></li>
          <li>Click <strong>Generate QR Poster</strong></li>
          <li>Download and print for posting around your venue</li>
        </ol>

        <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Tip:</strong> Post QR codes at check-in, in common areas, and dining halls so
            participants can quickly look up their assignments without asking staff.
          </p>
        </div>
      </div>
    )
  },

  "custom-reports": {
    title: "Custom Report Builder",
    content: (
      <div className="space-y-4">
        <p>
          The custom report builder allows you to create tailored reports with exactly the data
          you need, selecting specific fields and filters.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Accessing Custom Reports</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Event Dashboard &gt; Reports</strong></li>
          <li>Click <strong>Custom Report</strong> or <strong>Create New Report</strong></li>
          <li>Configure your report settings</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Building a Custom Report</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Select Data Type:</strong> Groups, Individuals, Staff, Vendors, etc.</li>
          <li><strong>Choose Fields:</strong> Select which columns to include</li>
          <li><strong>Apply Filters:</strong> Narrow down by status, date, housing type, etc.</li>
          <li><strong>Set Sort Order:</strong> Organize results by any field</li>
          <li><strong>Preview:</strong> See a sample of your report</li>
          <li><strong>Export:</strong> Download as CSV or PDF</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Available Fields</h3>
        <p>Common fields you can include:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Registration:</strong> Name, email, phone, registration date, type</li>
          <li><strong>Financial:</strong> Amount due, amount paid, balance, payment status</li>
          <li><strong>Housing:</strong> Housing type, room assignment, building</li>
          <li><strong>Forms:</strong> Liability form status, completion date</li>
          <li><strong>Medical:</strong> Dietary restrictions, allergies, medications</li>
          <li><strong>Check-in:</strong> Check-in status, check-in time</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Filter Options</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Registration date range</li>
          <li>Payment status (paid, partial, unpaid)</li>
          <li>Form completion status</li>
          <li>Housing type</li>
          <li>Registration type (group, individual, staff)</li>
          <li>Check-in status</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Saving Report Templates</h3>
        <p>Save your custom report configuration to reuse later:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Build your report with desired fields and filters</li>
          <li>Click <strong>Save Template</strong></li>
          <li>Give it a descriptive name</li>
          <li>Access saved templates from the Reports dropdown</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Export Formats</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>CSV:</strong> Open in Excel, Google Sheets for further analysis</li>
          <li><strong>PDF:</strong> Formatted document for printing or sharing</li>
        </ul>
      </div>
    )
  },

  "notifications": {
    title: "Notifications & Email Digest",
    content: (
      <div className="space-y-4">
        <p>
          Stay informed about your event activity with automated notifications and
          configurable email digests.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Notification Types</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>New Registration:</strong> When someone registers for your event</li>
          <li><strong>Payment Received:</strong> When a payment is processed</li>
          <li><strong>Form Completed:</strong> When a liability form is submitted</li>
          <li><strong>Waitlist Join:</strong> When someone joins the waitlist</li>
          <li><strong>Capacity Alerts:</strong> When event approaches capacity</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Enabling Email Digest</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Organization Settings &gt; Notifications</strong></li>
          <li>Find the <strong>Email Digest</strong> section</li>
          <li>Toggle <strong>Enable Email Digest</strong> on</li>
          <li>Select frequency: Daily or Weekly</li>
          <li>Choose which events to include</li>
          <li>Save your preferences</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Email Digest Contents</h3>
        <p>Your digest email includes:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Summary of new registrations since last digest</li>
          <li>Total payments received</li>
          <li>Outstanding balances</li>
          <li>Form completion progress</li>
          <li>Capacity status for each event</li>
          <li>Waitlist activity</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Configuring Notifications</h3>
        <p>Choose which notifications you want to receive:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to <strong>Organization Settings &gt; Notifications</strong></li>
          <li>Toggle individual notification types on/off</li>
          <li>Set thresholds for capacity alerts</li>
          <li>Choose delivery method (email, in-app, or both)</li>
          <li>Save your settings</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Team Notifications</h3>
        <p>Different team members can have different notification preferences:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Each team member configures their own preferences</li>
          <li>Admins can set organization-wide defaults</li>
          <li>Event-specific notifications can be customized per event</li>
        </ul>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Tip:</strong> Daily digests are great during busy registration periods,
            while weekly digests work well for events further out.
          </p>
        </div>
      </div>
    )
  },

  // ===== VENDOR DOCUMENTATION =====

  "vendor-registration": {
    title: "Vendor Booth Registration",
    content: (
      <div className="space-y-4">
        <p>
          Vendors can apply to have a booth at events through the vendor registration system.
          This guide explains the application process and what to expect.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Finding Vendor Registration</h3>
        <p>
          Vendor registration is available on event pages where the organizer has enabled it.
          Look for a link at the bottom of the registration page:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>&quot;Interested in being a vendor? Apply here&quot;</li>
          <li>&quot;Vendor booth registration&quot;</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Application Process</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Submit Application:</strong> Provide business information and booth preferences</li>
          <li><strong>Wait for Review:</strong> Event organizers will review your application</li>
          <li><strong>Receive Decision:</strong> You&apos;ll be notified of approval or rejection</li>
          <li><strong>Pay Invoice:</strong> If approved, pay the booth fee</li>
          <li><strong>Access Portal:</strong> Use your vendor code to manage your booth</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Application Requirements</h3>
        <p>Be prepared to provide:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Business name and contact information</li>
          <li>Description of products/services</li>
          <li>Booth size preference (small, medium, large)</li>
          <li>Special requirements (electricity, table setup, etc.)</li>
          <li>Contact email and phone number</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Booth Tiers</h3>
        <p>Events typically offer different booth options:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li><strong>Small Booth:</strong> Basic space, typically 10x10 feet</li>
          <li><strong>Medium Booth:</strong> Larger space with extras like electricity</li>
          <li><strong>Large/Premium Booth:</strong> Premium location with full amenities</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">After Approval</h3>
        <p>Once approved, you&apos;ll receive:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Approval email with payment instructions</li>
          <li>Invoice for booth fees</li>
          <li><strong>Vendor Code</strong> for booth staff registration</li>
          <li><strong>Access Code</strong> for the vendor portal</li>
          <li>Link to register your booth staff</li>
        </ul>
      </div>
    )
  },

  "vendor-portal": {
    title: "Using the Vendor Portal",
    content: (
      <div className="space-y-4">
        <p>
          The Vendor Portal is your hub for managing your booth, staff, payments,
          and business information.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Accessing the Portal</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Go to the vendor portal link provided in your approval email</li>
          <li>Enter your <strong>Access Code</strong></li>
          <li>Confirm your business name</li>
          <li>Access your dashboard</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Portal Features</h3>

        <h4 className="text-lg font-medium text-navy mt-4">Business Information</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View your submitted application details</li>
          <li>See your selected booth tier and description</li>
          <li>Check your application status</li>
        </ul>

        <h4 className="text-lg font-medium text-navy mt-4">Vendor Code</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Display your unique vendor code</li>
          <li>Copy code to share with your booth staff</li>
          <li>Link to staff registration page</li>
        </ul>

        <h4 className="text-lg font-medium text-navy mt-4">Booth Staff Management</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View all registered booth staff</li>
          <li>See staff details: name, email, role, t-shirt size</li>
          <li>Track liability form completion</li>
          <li>Monitor check-in status at event</li>
        </ul>

        <h4 className="text-lg font-medium text-navy mt-4">Invoice & Payment</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>View itemized invoice</li>
          <li>See total due, amount paid, and balance</li>
          <li>Pay online with credit card</li>
          <li>Download payment receipts</li>
        </ul>

        <h4 className="text-lg font-medium text-navy mt-4">Logo Upload</h4>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Upload your business logo</li>
          <li>Accepted formats: JPEG, PNG, GIF, WebP</li>
          <li>Maximum file size: 5MB</li>
          <li>Logo may be displayed on event materials</li>
        </ul>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
          <p className="text-sm">
            <strong>Tip:</strong> Keep your vendor code confidential and only share it with
            people you want to register as your booth staff.
          </p>
        </div>
      </div>
    )
  },

  "vendor-staff": {
    title: "Managing Booth Staff",
    content: (
      <div className="space-y-4">
        <p>
          Register your booth workers so they have access to the event and can help
          run your vendor booth.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Registering Booth Staff</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
          <li>Get your <strong>Vendor Code</strong> from the vendor portal</li>
          <li>Share the staff registration link with your workers</li>
          <li>Staff visit the link and enter the vendor code</li>
          <li>They complete the registration form</li>
          <li>Staff may need to complete a liability form</li>
          <li>Staff appear in your portal once registered</li>
        </ol>

        <h3 className="text-xl font-semibold text-navy mt-6">Staff Registration Info</h3>
        <p>Each staff member provides:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Name and contact information</li>
          <li>Role at your booth</li>
          <li>T-shirt size</li>
          <li>Dietary restrictions</li>
          <li>Emergency contact</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Staff Pricing</h3>
        <p>
          Booth staff registration may have a fee set by the event organizer. This covers:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Event access badge</li>
          <li>Meals (if included)</li>
          <li>Event materials</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Tracking Your Staff</h3>
        <p>From your vendor portal, you can see:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>List of all registered booth workers</li>
          <li>Their contact information</li>
          <li>Liability form completion status</li>
          <li>Check-in status at the event</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Staff Liability Forms</h3>
        <p>If required by the event, staff must complete liability forms:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Form link is sent via email after registration</li>
          <li>Must be completed before check-in</li>
          <li>Includes medical and emergency contact information</li>
        </ul>
      </div>
    )
  },

  "vendor-future": {
    title: "Upcoming Vendor Features",
    content: (
      <div className="space-y-4">
        <p>
          We&apos;re continuously improving the vendor experience. Here are some features
          we&apos;re working on bringing to ChiRho Events.
        </p>

        <h3 className="text-xl font-semibold text-navy mt-6">Lead Scanning (Coming Soon)</h3>
        <p>
          Capture leads directly from event attendees who visit your booth:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Scan attendee badges to capture contact information</li>
          <li>Add notes about conversations and interests</li>
          <li>Export leads for follow-up marketing</li>
          <li>Track engagement metrics</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Enhanced Vendor Portal</h3>
        <p>Future portal improvements:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Real-time booth traffic analytics</li>
          <li>Attendee messaging capabilities</li>
          <li>Product/service showcase pages</li>
          <li>Appointment scheduling with attendees</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Vendor Directory</h3>
        <p>Public vendor listings for events:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Showcase your business on the event page</li>
          <li>Display your logo and description</li>
          <li>Allow attendees to browse vendors before the event</li>
          <li>Enable pre-event engagement</li>
        </ul>

        <h3 className="text-xl font-semibold text-navy mt-6">Reporting & Analytics</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
          <li>Detailed reports on booth performance</li>
          <li>Lead conversion tracking</li>
          <li>Event ROI calculations</li>
          <li>Historical comparison across events</li>
        </ul>

        <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mt-4">
          <p className="text-sm">
            Have suggestions for vendor features? Contact the event organizers with your
            feedback—we&apos;re always looking to improve!
          </p>
        </div>
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
          <div className="mt-4 space-x-6">
            <a href="/privacy" className="text-gray-400 hover:text-gold transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-gray-400 hover:text-gold transition-colors">Terms of Service</a>
            <a href="/cookies" className="text-gray-400 hover:text-gold transition-colors">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
