import Link from 'next/link'
import { PublicNav } from '@/components/PublicNav'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy - ChiRho Events',
  description: 'Privacy Policy for ChiRho Events - Learn how we collect, use, and protect your information.',
}

// Change this only when the policy text itself changes.
const LAST_UPDATED = 'October 18, 2026'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav currentPage="/privacy" />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center text-gold hover:text-gold-600 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-navy mb-4">Privacy Policy</h1>
            <p className="text-gray-600">Last Updated: {LAST_UPDATED}</p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                ChiRho Events (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides registration and event
                management software built to serve Catholic parishes, dioceses, schools, seminaries, and
                ministries. Families trust these ministries with personal details, often about their
                children, their health, and their sacramental life. We treat that information with the
                care that trust deserves.
              </p>
              <p className="text-gray-700 leading-relaxed">
                This Privacy Policy explains what information we collect, how we use and protect it, and
                the choices you have. It applies to the ChiRho Events website and platform, including
                event registration, group and housing tools, check-in, medical tools, and Lux parish
                registration for faith formation and sacramental preparation.
              </p>
            </section>

            {/* Our Role */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Our Role and the Organization&apos;s Role</h2>
              <p className="text-gray-700 mb-4">
                When you register for an event or program, you are giving your information to the
                parish, diocese, school, or ministry running it (the &quot;Organization&quot;). The
                Organization decides what it asks for and how it uses your answers. We store and process
                that information on the Organization&apos;s behalf so it can run its event or program.
              </p>
              <p className="text-gray-700">
                For questions about how a particular Organization uses your information (for example,
                how a parish keeps sacramental records), please contact that Organization. We will help
                it respond. We are directly responsible for the information we collect for our own
                purposes, such as Organization accounts, billing, support requests, and use of our
                website.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Information We Collect</h2>
              <p className="text-gray-700 mb-4">
                What is collected depends on the event or program and on what the Organization asks for.
                It may include:
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Participant and Family Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Name, email address, phone number, and mailing address</li>
                <li>Date of birth or age, gender, grade, school, and t-shirt size</li>
                <li>Parent or guardian information and emergency contacts</li>
                <li>Parish membership and answers to questions the Organization adds</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Health and Safety Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Medical conditions, medications, and allergies</li>
                <li>Dietary needs and accessibility (ADA) accommodations</li>
                <li>Health insurance information</li>
                <li>Records of medical incidents or care provided during an event</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Sacramental and Faith Formation Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Dates and parishes of Baptism, First Communion, and Confirmation</li>
                <li>
                  Documents such as baptismal certificates, birth certificates, and sponsor or
                  godparent letters
                </li>
                <li>Program enrollment, class times, and fee assistance requests</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Forms and Signatures</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Liability, permission, and consent forms</li>
                <li>Electronic signatures and when they were made</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Leaders, Clergy, Staff, Volunteers, and Vendors</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Roles, contact information, and volunteer shifts</li>
                <li>Safe Environment certificates and training records</li>
                <li>Clergy and religious information such as diocese of incardination</li>
                <li>Vendor business and booth information</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Event Operations</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Housing, room, and small group assignments</li>
                <li>Check-in records, QR codes, and name badges</li>
                <li>
                  Survey responses (anonymous surveys are never linked back to who answered in
                  results)
                </li>
                <li>Waitlist and virtual waiting room entries</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Payment and Account Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>
                  Payment amounts and status. Card details are entered directly with Stripe; we never
                  see or store full card numbers.
                </li>
                <li>Organization details, team members, subscription, and billing information</li>
                <li>Messages you send us, including support tickets and emails</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>IP address and browser or device information</li>
                <li>Pages visited, measured with privacy-friendly analytics that do not use cookies</li>
                <li>Security and audit logs, such as who viewed or changed an uploaded document</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Process registrations, forms, and payments for the Organization</li>
                <li>Run event tools such as housing, check-in, surveys, and medical records</li>
                <li>
                  Send confirmations, receipts, reminders, and secure family access links on the
                  Organization&apos;s behalf
                </li>
                <li>Help keep participants safe, and support Organizations&apos; Safe Environment compliance</li>
                <li>Provide customer support and bill Organizations for their subscription</li>
                <li>Protect the platform against fraud, abuse, and unauthorized access</li>
                <li>Improve the platform, using aggregated information that does not identify you</li>
                <li>Comply with the law</li>
              </ul>
              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <p className="text-green-800">
                  We do not use your information for advertising. We never use health, sacramental, or
                  other faith-related information for any purpose other than providing the service to
                  the Organization you registered with.
                </p>
              </div>
            </section>

            {/* Data Sharing */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">How Information Is Shared</h2>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <p className="text-green-800 font-semibold">
                  We do NOT sell or rent your personal information, and we do not share it for targeted
                  advertising.
                </p>
              </div>
              <p className="text-gray-700 mb-4">We share information only with:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>The Organization:</strong> The parish, diocese, school, or ministry running
                  your event or program, and the team members it authorizes (for example, its
                  administrators, medical staff, or housing coordinators). Group leaders see information
                  for the participants in their own group.
                </li>
                <li>
                  <strong>Service providers:</strong> Companies that help us run the platform, listed
                  under Third-Party Services below. They may use your information only to provide their
                  services to us.
                </li>
                <li>
                  <strong>ChiRho Events support staff:</strong> When needed to help an Organization,
                  fix a problem, or at the Organization&apos;s request, a limited number of our staff
                  may access an Organization&apos;s account.
                </li>
                <li>
                  <strong>Legal and safety reasons:</strong> When required by law, or when needed to
                  protect someone&apos;s health or safety.
                </li>
                <li>
                  <strong>Business transfers:</strong> If ChiRho Events is merged or acquired, your
                  information would remain protected by this policy.
                </li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Children and Minors</h2>
              <p className="text-gray-700 mb-4">
                Many events and programs on ChiRho Events serve young people, including youth ministry,
                faith formation, and sacramental preparation. For participants under 18:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>
                  Information is provided by a parent or guardian, or by the Organization or group
                  leader with a parent&apos;s permission. Children do not create accounts.
                </li>
                <li>A parent or guardian must complete and sign liability and medical forms</li>
                <li>Parents receive copies of the forms they sign</li>
                <li>Medical information is collected only to keep participants safe</li>
              </ul>
              <p className="text-gray-700 mb-4">
                We do not knowingly collect personal information directly from children under 13
                without a parent&apos;s consent. If you believe this has happened, contact us and we
                will work with the Organization to delete it.
              </p>
              <p className="text-gray-700">
                Parents and guardians may review, correct, or ask us to delete their child&apos;s
                information by contacting the Organization or us.
              </p>
            </section>

            {/* Sensitive Information */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Sensitive Information</h2>
              <p className="text-gray-700 mb-4">
                We treat health, insurance, sacramental, and Safe Environment information as highly
                sensitive:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Uploaded documents are kept in private storage, not on public links</li>
                <li>
                  Authorized Organization staff view documents through links that expire after a few
                  minutes
                </li>
                <li>Views and changes to uploaded family documents are logged</li>
                <li>Access is limited by role within each Organization</li>
              </ul>
              <p className="text-gray-700">
                ChiRho Events is not a healthcare provider, and health information collected for event
                safety is generally not covered by HIPAA. We protect it carefully all the same.
              </p>
            </section>

            {/* Data Security */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Data Security</h2>
              <p className="text-gray-700 mb-4">We use industry-standard safeguards, including:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Encrypted storage with our hosting and database providers</li>
                <li>Role-based access controls that keep each Organization&apos;s data separate</li>
                <li>Secure, expiring links for family access</li>
                <li>Card payments handled by Stripe, a PCI-certified payment processor</li>
              </ul>
              <p className="text-gray-700">
                No system is perfectly secure. If a security incident affects your information, we will
                notify the affected Organizations and individuals as required by law.
              </p>
            </section>

            {/* Data Retention */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Data Retention</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  Registration information is kept while the Organization&apos;s account is active,
                  or until the Organization deletes it
                </li>
                <li>
                  Organizations can set uploaded documents in Lux programs to delete automatically
                  after 1, 2, or 5 years
                </li>
                <li>Family access links expire automatically</li>
                <li>Payment and financial records are kept as long as tax and accounting laws require</li>
                <li>
                  When an Organization closes its account, we delete or anonymize its data within a
                  reasonable time, except where the law requires us to keep it
                </li>
              </ul>
            </section>

            {/* Your Rights */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">You may ask to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Access or receive a copy of your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your information</li>
                <li>Opt out of non-essential emails</li>
                <li>Withdraw consent you have given</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Because Organizations control their registration records, many requests are best sent
                to the Organization. You can also contact us and we will pass your request along and
                help. Some requests may affect your ability to take part in an event or program (for
                example, deleting required medical information). We may need to verify your identity
                first. Some U.S. states give their residents additional privacy rights, and we honor
                those rights as the law requires.
              </p>
              <p className="text-gray-700">
                To exercise these rights, contact us at:{' '}
                <a href="mailto:privacy@chirhoevents.com" className="text-gold hover:underline">
                  privacy@chirhoevents.com
                </a>
              </p>
            </section>

            {/* Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Cookies</h2>
              <p className="text-gray-700 mb-4">
                We use a small number of cookies to keep you signed in, hold your place in registration
                waiting rooms, and remember your language. We do not use advertising or cross-site
                tracking cookies, and our analytics do not use cookies.
              </p>
              <p className="text-gray-700">
                See our{' '}
                <Link href="/cookies" className="text-gold hover:underline">
                  Cookie Policy
                </Link>{' '}
                for the full list.
              </p>
            </section>

            {/* Third-Party Services */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Third-Party Services</h2>
              <p className="text-gray-700 mb-4">We use:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Clerk:</strong> Sign-in and account management
                </li>
                <li>
                  <strong>Stripe:</strong> Payment processing. Payments go to the Organization&apos;s
                  own Stripe account.
                </li>
                <li>
                  <strong>Cloudflare R2:</strong> File and document storage
                </li>
                <li>
                  <strong>Resend:</strong> Email delivery
                </li>
                <li>
                  <strong>Vercel:</strong> Website hosting and cookie-free analytics
                </li>
                <li>
                  <strong>Cloud database provider:</strong> Secure storage of platform data
                </li>
              </ul>
              <p className="text-gray-700 mt-4">
                Each has its own privacy policy and may use your information only to provide its
                services to us.
              </p>
            </section>

            {/* Where Data Is Stored */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Where Your Information Is Stored</h2>
              <p className="text-gray-700">
                ChiRho Events is operated in the United States, and your information is stored and
                processed in the United States. If you use the platform from another country, your
                information will be transferred to the United States.
              </p>
            </section>

            {/* Changes to This Policy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy. Changes will be posted on this page with a new
                &quot;Last Updated&quot; date. If we make significant changes, we will also notify
                Organizations by email.
              </p>
            </section>

            {/* Contact Us */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">Questions about this Privacy Policy?</p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:privacy@chirhoevents.com" className="text-gold hover:underline">
                    privacy@chirhoevents.com
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* Related Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-navy mb-4">Related Legal Documents</h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/terms"
                className="text-gold hover:underline"
              >
                Terms of Service
              </Link>
              <Link
                href="/cookies"
                className="text-gold hover:underline"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-navy text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">&copy; {new Date().getFullYear()} ChiRho Events. All rights reserved.</p>
          <div className="mt-4 space-x-6">
            <Link href="/privacy" className="text-gold hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gold hover:underline">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-gold hover:underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
