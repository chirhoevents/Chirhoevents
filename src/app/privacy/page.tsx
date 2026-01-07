import Link from 'next/link'
import { PublicNav } from '@/components/PublicNav'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy - ChiRho Events',
  description: 'Privacy Policy for ChiRho Events - Learn how we collect, use, and protect your information.',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

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
            <p className="text-gray-600">Last Updated: {lastUpdated}</p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                ChiRho Events (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Information We Collect</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Personal Information</h3>
              <p className="text-gray-700 mb-4">When you register for events, we collect:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Name, email address, phone number</li>
                <li>Age, gender, t-shirt size</li>
                <li>Emergency contact information</li>
                <li>Medical information (for safety purposes)</li>
                <li>Payment information (processed securely by Stripe)</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Organizational Information</h3>
              <p className="text-gray-700 mb-4">For group leaders and administrators:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Organization name and details</li>
                <li>Leadership contact information</li>
                <li>Safe Environment certificates</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>IP addresses</li>
                <li>Browser type and version</li>
                <li>Usage data and analytics</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Process event registrations</li>
                <li>Facilitate payment processing</li>
                <li>Send confirmation emails and event updates</li>
                <li>Ensure participant safety (medical information)</li>
                <li>Comply with Safe Environment requirements</li>
                <li>Improve our platform</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Data Sharing</h2>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <p className="text-green-800 font-semibold">We do NOT sell your personal information.</p>
              </div>
              <p className="text-gray-700 mb-4">We share your information only with:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Stripe:</strong> For payment processing
                </li>
                <li>
                  <strong>Event Organizers:</strong> Your registration information is shared with the
                  organization running the event you registered for
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law
                </li>
              </ul>
            </section>

            {/* Your Rights */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent</li>
              </ul>
              <p className="text-gray-700">
                To exercise these rights, contact us at:{' '}
                <a href="mailto:privacy@chirhoevents.com" className="text-gold hover:underline">
                  privacy@chirhoevents.com
                </a>
              </p>
            </section>

            {/* Data Security */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Data Security</h2>
              <p className="text-gray-700 mb-4">We implement industry-standard security measures:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Secure database storage</li>
                <li>Regular security audits</li>
                <li>Limited access to personal information</li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Children&apos;s Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our platform is designed for ministry events. For participants under 18:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Parental consent is required for liability forms</li>
                <li>Parents receive copies of all forms</li>
                <li>Medical information is collected for safety</li>
              </ul>
              <p className="text-gray-700">We comply with applicable children&apos;s privacy laws.</p>
            </section>

            {/* Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Cookies</h2>
              <p className="text-gray-700 mb-4">We use cookies to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Maintain your login session</li>
                <li>Remember your preferences</li>
                <li>Analyze site usage</li>
              </ul>
              <p className="text-gray-700">
                You can disable cookies in your browser, but some features may not work properly.
                See our{' '}
                <Link href="/cookies" className="text-gold hover:underline">
                  Cookie Policy
                </Link>{' '}
                for more details.
              </p>
            </section>

            {/* Third-Party Services */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Third-Party Services</h2>
              <p className="text-gray-700 mb-4">We use:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Clerk:</strong> Authentication and user management
                </li>
                <li>
                  <strong>Stripe:</strong> Payment processing
                </li>
                <li>
                  <strong>Cloudflare R2:</strong> File storage
                </li>
                <li>
                  <strong>Resend:</strong> Email delivery
                </li>
              </ul>
              <p className="text-gray-700 mt-4">Each has their own privacy policies.</p>
            </section>

            {/* Data Retention */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Data Retention</h2>
              <p className="text-gray-700 mb-4">We retain your data:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>For the duration of your account</li>
                <li>As long as necessary for legal compliance</li>
                <li>You may request deletion at any time</li>
              </ul>
            </section>

            {/* Changes to This Policy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy. Changes will be posted on this page with a new
                &quot;Last Updated&quot; date.
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
          <p className="text-gray-400">&copy; 2025 ChiRho Events. All rights reserved.</p>
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
