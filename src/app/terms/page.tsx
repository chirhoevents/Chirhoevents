import Link from 'next/link'
import { PublicNav } from '@/components/PublicNav'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service - ChiRho Events',
  description: 'Terms of Service for ChiRho Events - Review the terms and conditions for using our platform.',
}

// Change this only when the terms themselves change.
const LAST_UPDATED = 'October 18, 2026'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav currentPage="/terms" />

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
            <h1 className="text-4xl font-bold text-navy mb-4">Terms of Service</h1>
            <p className="text-gray-600">Last Updated: {LAST_UPDATED}</p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* Acceptance of Terms */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By using ChiRho Events, you agree to these Terms of Service and our{' '}
                <Link href="/privacy" className="text-gold hover:underline">
                  Privacy Policy
                </Link>
                . If you do not agree, do not use our platform.
              </p>
              <p className="text-gray-700 leading-relaxed">
                If you use ChiRho Events on behalf of a parish, diocese, school, or other organization,
                you confirm that you are authorized to accept these Terms for it.
              </p>
            </section>

            {/* Description of Service */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                ChiRho Events provides registration and event management software built to serve the
                Catholic Church: diocesan retreats, conferences, youth pilgrimages, parish events,
                seminary programs, volunteer sign-ups, and, through Lux, faith formation and sacramental
                preparation. Tools include online registration and payments, forms and signatures,
                housing, check-in, and medical records.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">These Terms use two names:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Organizations:</strong> The parishes, dioceses, schools, seminaries, and
                  ministries that subscribe to ChiRho Events and run events or programs on it
                </li>
                <li>
                  <strong>Registrants:</strong> Everyone who signs up through an Organization,
                  including participants, parents and guardians, group leaders, staff, volunteers, and
                  vendors
                </li>
              </ul>
            </section>

            {/* User Accounts */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">User Accounts</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Account Creation</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>You must provide accurate information</li>
                <li>You are responsible for maintaining account security</li>
                <li>You must be 18 or older to create an account</li>
                <li>
                  Participants under 18 are registered by a parent or guardian, or by an Organization
                  or group leader with a parent&apos;s permission
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Account Responsibilities</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Keep your password and any access codes or family links secure</li>
                <li>Notify us of unauthorized access</li>
                <li>Do not share your account</li>
                <li>Comply with all applicable laws</li>
              </ul>
            </section>

            {/* Event Registration */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Registrations and Payments</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Your Registration Is With the Organization</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>
                  When you register, you are registering with the Organization, not with ChiRho Events
                </li>
                <li>
                  The Organization sets its own deadlines, deposits, late fees, cancellation policy, and
                  refund policy, and these apply to your registration
                </li>
                <li>
                  Depending on the Organization, you may pay online, pay a deposit, pay at the parish
                  office, or ask for fee assistance. Decisions about fee assistance are made by the
                  Organization.
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Online Payments</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Card payments are processed by Stripe and paid to the Organization</li>
                <li>
                  Questions about charges, refunds, or balances should go to the Organization first
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Forms and Signatures</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Required forms must be completed before attending an event</li>
                <li>A parent or guardian must complete and sign forms for participants under 18</li>
                <li>
                  Electronic signatures on ChiRho Events have the same effect as handwritten signatures
                </li>
                <li>Medical and emergency information must be accurate and kept current</li>
              </ul>
            </section>

            {/* Organization Responsibilities */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Organization Responsibilities</h2>
              <p className="text-gray-700 mb-4">Organizations agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Provide accurate event and program information, pricing, and policies</li>
                <li>
                  Collect only the information they need, use it as described in our Privacy Policy and
                  as the law allows, and obtain any required consents, including from parents
                </li>
                <li>
                  Control who on their team has access, and remove access when someone leaves
                </li>
                <li>
                  Follow their diocese&apos;s Safe Environment policies, the USCCB Charter for the
                  Protection of Children and Young People, and any background check requirements.
                  ChiRho Events stores Safe Environment certificates but does not verify them or run
                  background checks.
                </li>
                <li>Supervise their events and keep participants safe</li>
                <li>Have the rights to any logos, images, and content they upload</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Payments to Organizations</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  To accept online payments, Organizations connect their own Stripe account and agree to
                  Stripe&apos;s terms
                </li>
                <li>
                  The Organization is the seller for its registrations and is responsible for refunds,
                  payment disputes (chargebacks), and any taxes
                </li>
              </ul>
            </section>

            {/* Subscriptions and Fees */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Subscriptions and Fees</h2>
              <p className="text-gray-700 mb-4">For Organizations:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>
                  Plans are billed monthly or annually at the prices shown when you subscribe. A setup
                  fee may apply.
                </li>
                <li>
                  Online registration payments include a platform fee and Stripe&apos;s processing
                  fees, as described in your plan
                </li>
                <li>Fees for extra events or extra help apply as described in your plan</li>
                <li>Subscriptions continue for each billing period until canceled</li>
                <li>We will give advance notice before changing prices for an existing subscription</li>
                <li>
                  Fees already paid are not refundable, except where the law requires or we agree
                  otherwise
                </li>
                <li>Unpaid balances may lead to suspension of the account</li>
              </ul>
              <p className="text-gray-700">
                Registrants do not pay ChiRho Events directly. Any fees on a registration are set by
                the Organization.
              </p>
            </section>

            {/* Your Data */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Organization Data</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Organizations own the registration information they collect</li>
                <li>We handle it as described in our Privacy Policy</li>
                <li>Organizations can export their data before closing their account</li>
              </ul>
            </section>

            {/* User Conduct */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">User Conduct</h2>
              <p className="text-gray-700 mb-4">You agree NOT to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Provide false information</li>
                <li>Impersonate others</li>
                <li>Violate any laws</li>
                <li>Harass others or misuse anyone&apos;s personal information</li>
                <li>Interfere with platform operation</li>
                <li>Upload malicious content</li>
                <li>Attempt unauthorized access</li>
                <li>Copy or scrape data from the platform</li>
              </ul>
              <p className="text-gray-700">
                ChiRho Events exists to serve the Catholic Church. We may decline or end service to an
                Organization whose use of the platform is inconsistent with that mission.
              </p>
            </section>

            {/* Intellectual Property */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Intellectual Property</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Our Content</h3>
              <p className="text-gray-700 mb-6">
                All platform content (text, graphics, logos) is owned by ChiRho Events or licensors.
                You may not copy, modify, or distribute without permission.
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">User Content</h3>
              <p className="text-gray-700">
                You retain rights to content you upload (photos, documents). You grant us a license to
                use this content only to operate the platform for you and the Organization.
              </p>
            </section>

            {/* Disclaimers */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Disclaimers</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Service &quot;As Is&quot;</h3>
              <p className="text-gray-700 mb-6">
                ChiRho Events is provided &quot;as is&quot; without warranties of any kind. We work to
                keep the platform available but cannot promise it will always be uninterrupted or
                error-free.
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Not Medical Advice</h3>
              <p className="text-gray-700 mb-6">
                Medical tools help Organizations keep records. They are not medical advice and do not
                replace professional medical care or emergency services. In an emergency, call 911.
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Event Organizer Responsibility</h3>
              <p className="text-gray-700 mb-4">Organizations are solely responsible for:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Event safety and supervision</li>
                <li>Compliance with laws and regulations</li>
                <li>Safe Environment policies</li>
                <li>Refund policies</li>
              </ul>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-blue-800">We are a technology platform only.</p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">To the fullest extent permitted by law:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>
                  Our total liability is limited to the greater of the amount you paid ChiRho Events in
                  the 12 months before the claim, or $100
                </li>
                <li>We are not liable for the actions of Organizations or for what happens at events</li>
              </ul>
            </section>

            {/* Indemnification */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to indemnify ChiRho Events from claims arising from:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Your use of the platform</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any laws</li>
              </ul>
              <p className="text-gray-700">
                Organizations also agree to indemnify ChiRho Events from claims arising from their
                events and programs, the information they collect, and the content they upload.
              </p>
            </section>

            {/* Event Cancellation */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Event Cancellation</h2>
              <p className="text-gray-700 mb-4">If an event is cancelled:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>The Organization determines the refund policy</li>
                <li>We are not responsible for refunds</li>
                <li>Payment processing fees may not be refundable</li>
              </ul>
            </section>

            {/* Termination */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Terms violations</li>
                <li>Fraudulent activity</li>
                <li>Non-payment</li>
                <li>Protecting the safety or privacy of others</li>
                <li>At our discretion</li>
              </ul>
              <p className="text-gray-700">
                Organizations may cancel at any time. After cancellation, we keep and delete data as
                described in our Privacy Policy.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Dispute Resolution</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Informal Resolution</h3>
              <p className="text-gray-700 mb-6">
                Before filing a claim, please contact us at legal@chirhoevents.com so we can try to
                resolve the issue. Most concerns can be settled this way.
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Governing Law</h3>
              <p className="text-gray-700 mb-6">
                These Terms are governed by the laws of the State of Ohio, United States.
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Arbitration</h3>
              <p className="text-gray-700">
                Disputes that cannot be resolved informally will be resolved through binding
                arbitration, except for matters that may be brought in small claims court.
              </p>
            </section>

            {/* Changes to Terms */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Changes to Terms</h2>
              <p className="text-gray-700">
                We may modify these Terms. Changes will be posted on this page with a new &quot;Last
                Updated&quot; date, and we will notify Organizations by email of significant changes.
                Continued use after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Contact</h2>
              <p className="text-gray-700 mb-4">Questions about these Terms?</p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:legal@chirhoevents.com" className="text-gold hover:underline">
                    legal@chirhoevents.com
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
                href="/privacy"
                className="text-gold hover:underline"
              >
                Privacy Policy
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
