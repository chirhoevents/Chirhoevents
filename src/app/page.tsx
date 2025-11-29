import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Users, FileText, Home, Clipboard, Heart, BarChart3, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-horizontal.png"
                  alt="ChiRho Events"
                  width={150}
                  height={40}
                  className="h-10 w-auto cursor-pointer"
                  priority
                />
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-navy hover:text-gold transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-navy hover:text-gold transition-colors font-medium">Pricing</a>
              <a href="#faq" className="text-navy hover:text-gold transition-colors font-medium">FAQ</a>
              <a href="#contact" className="text-navy hover:text-gold transition-colors font-medium">Contact</a>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">Sign In</Button>
              <a href="#contact">
                <Button size="sm">Get Started</Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <section className="relative bg-gradient-to-br from-navy to-navy-700 text-white py-20 sm:py-32">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              The Complete Catholic Registration Platform for Ministry
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-gray-200">
              Built for conferences, retreats, and many Catholic events—at 30% lower cost than competitors.
            </p>
            <div className="space-y-4 mb-10">
              <div className="flex items-center justify-center space-x-2">
                <Check className="h-6 w-6 text-gold" />
                <span className="text-lg">All-in-one registration & event management</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Check className="h-6 w-6 text-gold" />
                <span className="text-lg">Catholic-specific forms & safe environment tracking</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Check className="h-6 w-6 text-gold" />
                <span className="text-lg">Complete housing, seating, and meal assignments</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#contact">
                <Button size="lg" className="text-lg px-8 py-6">
                  Get Started
                </Button>
              </a>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white hover:text-navy">
                  See Pricing
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Cost Comparison */}
      <section className="py-16 bg-beige">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-12">
            Why Organizations Choose Us
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-navy text-white">
                  <tr>
                    <th className="py-4 px-6 text-left">Platform</th>
                    <th className="py-4 px-6 text-left">Fee</th>
                    <th className="py-4 px-6 text-left">Monthly</th>
                    <th className="py-4 px-6 text-left">Total (1K people)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gold-50 border-2 border-gold">
                    <td className="py-4 px-6 font-bold text-navy">ChiRho ✅</td>
                    <td className="py-4 px-6">3.06%</td>
                    <td className="py-4 px-6">$49-$149</td>
                    <td className="py-4 px-6 font-bold text-gold-700">$3,060 + monthly</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6">Eventbrite</td>
                    <td className="py-4 px-6">4.30%</td>
                    <td className="py-4 px-6">$0</td>
                    <td className="py-4 px-6">$4,300</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6">Cvent</td>
                    <td className="py-4 px-6">6.20%+</td>
                    <td className="py-4 px-6">$500+</td>
                    <td className="py-4 px-6">$6,200+</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-center mt-6">
              <p className="text-2xl font-bold text-gold-700">💰 Save $1,240+ per event</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Features */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-12">
            Everything You Need in One Platform
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-gold mb-4" />
                <CardTitle>Registration System</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• Group & individual registration</li>
                  <li>• Customizable pricing tiers</li>
                  <li>• Youth, chaperone, priest categories</li>
                  <li>• Automatic access codes</li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card>
              <CardHeader>
                <FileText className="h-12 w-12 text-gold mb-4" />
                <CardTitle>Liability Forms</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• 3 form types (youth, chaperone, clergy)</li>
                  <li>• E-signature collection</li>
                  <li>• Parent consent for minors</li>
                  <li>• Safe environment tracking</li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card>
              <CardHeader>
                <Home className="h-12 w-12 text-gold mb-4" />
                <CardTitle>Housing (Poros Portal)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• Drag-and-drop assignments</li>
                  <li>• Auto-recommendations</li>
                  <li>• Separate youth/chaperone/priest housing</li>
                  <li>• ADA tracking</li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card>
              <CardHeader>
                <Clipboard className="h-12 w-12 text-gold mb-4" />
                <CardTitle>Check-In (SALVE)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• QR code scanning</li>
                  <li>• Print packets on-demand</li>
                  <li>• Dietary highlighting</li>
                  <li>• Name tag printing</li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card>
              <CardHeader>
                <Heart className="h-12 w-12 text-gold mb-4" />
                <CardTitle>Medical (Rapha)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• Instant medical access</li>
                  <li>• Allergy alerts</li>
                  <li>• Incident reports</li>
                  <li>• Emergency contacts</li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card>
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-gold mb-4" />
                <CardTitle>Reports & Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• Google Sheets sync</li>
                  <li>• Mailchimp export</li>
                  <li>• QuickBooks accounting</li>
                  <li>• Custom reports</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 4: Founder Story */}
      <section className="py-16 bg-navy text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8">
              Built BY Youth Ministry, FOR Youth Ministry
            </h2>
            <div className="bg-navy-600 rounded-lg p-8 text-left space-y-4 text-lg">
              <p>
                As housing director for Mount 2000, I watched us pay Eventbrite $4,300 in fees—while still needing separate tools for housing, check-in, and medical tracking.
              </p>
              <p>
                None of these tools understood Catholic youth ministry. No fields for priests. No safe environment tracking. No three-tiered liability forms.
              </p>
              <p>
                So we built ChiRho Events—the all-in-one platform we wish we&apos;d had.
              </p>
              <p>
                Now dioceses across the country save 30% while getting features specifically built for Catholic events.
              </p>
              <p className="text-gold font-semibold pt-4">
                - Juanito, Founder<br />
                Mount Saint Mary Seminary
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Pricing */}
      <section id="pricing" className="py-16 bg-beige">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Processing Fee: 3.06% + $0.30 per ticket • Setup Fee: $250 (one-time)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {/* Starter */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">$49</span>
                  <span className="text-gray-600">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• 2 events/year</p>
                <p className="text-sm text-gray-600">• 500 people max</p>
                <p className="text-sm text-gray-600">• 5GB storage</p>
                <a href="#contact">
                  <Button className="w-full mt-6">Get Started</Button>
                </a>
              </CardContent>
            </Card>

            {/* Small Diocese */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl">Small Diocese</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">$99</span>
                  <span className="text-gray-600">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• 5 events/year</p>
                <p className="text-sm text-gray-600">• 1,000 people max</p>
                <p className="text-sm text-gray-600">• 15GB storage</p>
                <a href="#contact">
                  <Button className="w-full mt-6">Get Started</Button>
                </a>
              </CardContent>
            </Card>

            {/* Growing - Popular */}
            <Card className="border-2 border-gold shadow-lg scale-105">
              <div className="bg-gold text-navy text-center py-1 text-sm font-semibold">
                POPULAR
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Growing</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">$149</span>
                  <span className="text-gray-600">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• 10 events/year</p>
                <p className="text-sm text-gray-600">• 3,000 people max</p>
                <p className="text-sm text-gray-600">• 40GB storage</p>
                <a href="#contact">
                  <Button className="w-full mt-6">Get Started</Button>
                </a>
              </CardContent>
            </Card>

            {/* Conference */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl">Conference</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">$249</span>
                  <span className="text-gray-600">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• 25 events/year</p>
                <p className="text-sm text-gray-600">• 8,000 people max</p>
                <p className="text-sm text-gray-600">• 100GB storage</p>
                <a href="#contact">
                  <Button className="w-full mt-6">Get Started</Button>
                </a>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="border-2 border-navy">
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">Custom</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• Unlimited events</p>
                <p className="text-sm text-gray-600">• Unlimited people</p>
                <p className="text-sm text-gray-600">• Dedicated support</p>
                <a href="#contact">
                  <Button variant="outline" className="w-full mt-6">Contact Sales</Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 6: FAQ */}
      <section id="faq" className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  How does pricing work?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  You pay a monthly subscription based on your tier, plus a processing fee of 3.06% + $0.30 per ticket. There&apos;s a one-time $250 setup fee. No hidden costs!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  Can I cancel anytime?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Yes! You can cancel your subscription at any time with no penalties. Your data is archived and can be reactivated for a $75-$250 fee.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  What if I exceed my tier limits?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  We offer flexible upgrades! You can upgrade to the next tier anytime. Contact us if you need a custom solution.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  Do you integrate with QuickBooks, Sheets, and Mailchimp?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Yes! We have built-in integrations with Google Sheets (live sync), Mailchimp (email lists), and QuickBooks Online (accounting).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  Is my data secure?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Absolutely. We use AES-256 encryption at rest, TLS 1.3 in transit, and are COPPA compliant for minor data. All data is backed up daily with point-in-time recovery.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  How long does setup take?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Most organizations are up and running in 1-2 hours. We provide onboarding support to help you configure your first event.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  Can I import from Eventbrite?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Yes! We support CSV import from Eventbrite and other platforms. Our team can help you migrate your data.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Section 7: Contact Form */}
      <section id="contact" className="py-16 bg-beige">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-12">
              Ready to Get Started?
            </h2>
            <Card>
              <CardContent className="p-8">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">Name *</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">Email *</label>
                      <input
                        type="email"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">Phone *</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">Organization *</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-2">What do you need? *</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold" required>
                      <option value="">Select...</option>
                      <option value="diocesan">Diocesan retreat</option>
                      <option value="conference">Large conference (1,000+)</option>
                      <option value="parish">Parish event</option>
                      <option value="seminary">Seminary program</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-2">Message</label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold focus:border-gold"
                    ></textarea>
                  </div>
                  <Button type="submit" size="lg" className="w-full">
                    Get Started
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    Or email us at <a href="mailto:hello@chirhoevents.com" className="text-gold hover:underline">hello@chirhoevents.com</a>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 8: Footer */}
      <footer className="bg-navy text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">ChiRho Events</h3>
              <p className="text-gray-400">
                The complete Catholic registration platform for ministry.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-gold transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-gold transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-gold transition-colors">About</a></li>
                <li><a href="#contact" className="hover:text-gold transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-gold transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Tutorials</a></li>
                <li><a href="mailto:hello@chirhoevents.com" className="hover:text-gold transition-colors">Email</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-navy-500 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ChiRho Events. All rights reserved.</p>
            <div className="mt-4 space-x-6">
              <a href="#" className="hover:text-gold transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gold transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
