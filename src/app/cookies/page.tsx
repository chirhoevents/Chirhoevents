import Link from 'next/link'
import { PublicNav } from '@/components/PublicNav'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Cookie Policy - ChiRho Events',
  description: 'Cookie Policy for ChiRho Events - Learn about how we use cookies on our platform.',
}

// Change this only when the policy text itself changes.
const LAST_UPDATED = 'October 18, 2026'

const OUR_COOKIES = [
  {
    name: 'queue_session_id',
    purpose: 'Holds your place in the virtual waiting room during high-demand registrations',
    duration: '24 hours',
  },
  {
    name: 'lux_family',
    purpose: 'Keeps your family signed in after you open a secure link from your parish',
    duration: '4 hours',
  },
  {
    name: 'lux_lang',
    purpose: 'Remembers whether you chose English or Spanish on parish pages',
    duration: '1 year',
  },
  {
    name: 'impersonating_org, impersonating_user, impersonating_org_name, master_admin_id',
    purpose:
      'Used only when ChiRho Events support staff open an Organization’s account to help it. Never set for registrants.',
    duration: '4 hours',
  },
]

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav currentPage="/cookies" />

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
            <h1 className="text-4xl font-bold text-navy mb-4">Cookie Policy</h1>
            <p className="text-gray-600">Last Updated: {LAST_UPDATED}</p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* What Are Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">What Are Cookies?</h2>
              <p className="text-gray-700 leading-relaxed">
                Cookies are small text files that are placed on your computer or mobile device when
                you visit a website. They are widely used to make websites work, for example to keep
                you signed in.
              </p>
            </section>

            {/* Our Approach */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Our Approach</h2>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <p className="text-green-800 font-semibold">
                  We do not use advertising cookies or cookies that track you across other websites.
                </p>
              </div>
              <p className="text-gray-700">
                ChiRho Events only uses cookies needed to run the platform (signing in, registration
                waiting rooms, and payments) plus one cookie that remembers your language. Our website
                analytics do not use cookies.
              </p>
            </section>

            {/* Sign-In Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Cookies We Use</h2>

              <div className="space-y-6 mb-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-navy mb-3">Sign-In Cookies (Clerk)</h3>
                  <p className="text-gray-700 mb-2">
                    <strong>Purpose:</strong> Our sign-in provider, Clerk, sets cookies that keep
                    administrators, group leaders, staff, and other account holders signed in securely.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Duration:</strong> While you are signed in. Clerk may remember your device
                    so you stay signed in between visits.
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-navy mb-3">Payment Cookies (Stripe)</h3>
                  <p className="text-gray-700 mb-2">
                    <strong>Purpose:</strong> When you pay online, Stripe sets cookies to process the
                    payment securely and prevent fraud.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Duration:</strong> From 30 minutes up to 1 year
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-4">ChiRho Events also sets these cookies:</p>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-navy text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Cookie</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Purpose</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {OUR_COOKIES.map((cookie, i) => (
                      <tr key={cookie.name} className={i % 2 === 1 ? 'bg-gray-50' : undefined}>
                        <td className="px-6 py-4 text-gray-700 font-mono text-sm break-words">{cookie.name}</td>
                        <td className="px-6 py-4 text-gray-700">{cookie.purpose}</td>
                        <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{cookie.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Browser Storage */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Browser Storage</h2>
              <p className="text-gray-700 mb-4">
                Like cookies, your browser&apos;s local storage can hold small pieces of information.
                We use it only for convenience:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  Saving a registration form you are filling out, so you don&apos;t lose your work if
                  the page reloads. This is cleared when you close the tab.
                </li>
                <li>Remembering dashboard choices, such as the event you last selected</li>
              </ul>
            </section>

            {/* Analytics */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Analytics</h2>
              <p className="text-gray-700">
                We use Vercel Web Analytics to count page visits so we can improve the platform. It
                does not use cookies, does not follow you to other websites, and reports only
                aggregated numbers.
              </p>
            </section>

            {/* Third-Party Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Third-Party Providers</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-navy text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Provider</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Purpose</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">More Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-gray-700">Clerk</td>
                      <td className="px-6 py-4 text-gray-700">Sign-in</td>
                      <td className="px-6 py-4">
                        <a
                          href="https://clerk.com/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:underline"
                        >
                          Privacy Policy
                        </a>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">Stripe</td>
                      <td className="px-6 py-4 text-gray-700">Payment Processing</td>
                      <td className="px-6 py-4">
                        <a
                          href="https://stripe.com/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:underline"
                        >
                          Privacy Policy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-gray-700">Vercel</td>
                      <td className="px-6 py-4 text-gray-700">Hosting and cookie-free analytics</td>
                      <td className="px-6 py-4">
                        <a
                          href="https://vercel.com/legal/privacy-policy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:underline"
                        >
                          Privacy Policy
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Managing Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Managing Cookies</h2>
              <p className="text-gray-700 mb-4">
                Most web browsers allow you to control cookies through their settings. Here&apos;s how
                to access cookie settings in popular browsers:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>
                  <strong>Chrome:</strong> Settings &gt; Privacy and Security &gt; Cookies
                </li>
                <li>
                  <strong>Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Cookies
                </li>
                <li>
                  <strong>Safari:</strong> Settings &gt; Privacy &gt; Manage Website Data
                </li>
                <li>
                  <strong>Edge:</strong> Settings &gt; Cookies and Site Permissions
                </li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-yellow-800">
                  <strong>Note:</strong> Because our cookies are needed to sign in, register, and pay,
                  blocking them will stop those features from working.
                </p>
              </div>
            </section>

            {/* Do Not Track */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Do Not Track</h2>
              <p className="text-gray-700">
                Some browsers have a &quot;Do Not Track&quot; setting. Because we do not track you
                across websites, the platform works the same whether or not it is turned on. See our{' '}
                <Link href="/privacy" className="text-gold hover:underline">
                  Privacy Policy
                </Link>{' '}
                for more about your privacy choices.
              </p>
            </section>

            {/* Updates to This Policy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Updates to This Policy</h2>
              <p className="text-gray-700">
                We may update this Cookie Policy from time to time. We will post the new policy on
                this page with a new &quot;Last Updated&quot; date.
              </p>
            </section>

            {/* Contact Us */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about our use of cookies, please contact us:
              </p>
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
                href="/privacy"
                className="text-gold hover:underline"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gold hover:underline"
              >
                Terms of Service
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
