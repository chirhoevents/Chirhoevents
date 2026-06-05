'use client'

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Users, FileText, Home, Clipboard, Heart, BarChart3, Mail, Phone, MapPin, Play, Pause, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PublicNav } from "@/components/PublicNav";
import { PortalAccessSection } from "@/components/PortalAccessSection";

export default function LandingPage() {
  const [contactFormSubmitted, setContactFormSubmitted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Attempt autoplay when component mounts
    const video = videoRef.current;
    if (video) {
      video.play().then(() => {
        setIsVideoPlaying(true);
      }).catch(() => {
        // Autoplay was prevented, user will need to click play
        setIsVideoPlaying(false);
      });
    }
  }, []);

  const toggleVideoPlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
        setIsVideoPlaying(true);
      } else {
        video.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  const toggleVideoMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsVideoMuted(video.muted);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with actual contact form API
    setContactFormSubmitted(true);
    setTimeout(() => {
      setContactFormSubmitted(false);
    }, 5000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <PublicNav currentPage="/" />

      {/* Section 1: Hero */}
      <section
        className="relative text-white py-12 sm:py-20"
        style={{
          backgroundImage: `url('/ChiRho Event Logos/ChiRho events BG.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-navy/70"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              The Complete Catholic Registration Platform for Ministry
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-gray-200">
              A registration and event-management platform built specifically for Catholic ministry so you can spend less time on spreadsheets and more time forming disciples.
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
            <div className="flex flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/get-started" className="flex-1 sm:flex-initial">
                <Button size="lg" className="w-full text-base sm:text-lg px-4 sm:px-8 py-5 sm:py-6">
                  Get Started
                </Button>
              </Link>
              <a href="#pricing" className="flex-1 sm:flex-initial">
                <Button size="lg" variant="outline" className="w-full text-base sm:text-lg px-4 sm:px-8 py-5 sm:py-6 bg-transparent border-white text-white hover:bg-white hover:text-navy">
                  See Pricing
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Portal Access — helps attendees & group leaders find their portal */}
      <section className="py-16 bg-beige">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <PortalAccessSection variant="full" />
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
                <CardTitle>Housing (Poros)</CardTitle>
                <CardDescription className="text-sm italic text-gray-500 mt-2">
                  Πόρος (Greek: Gateway) - The entryway to your event
                </CardDescription>
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
                <CardDescription className="text-sm italic text-gray-500 mt-2">
                  SALVE (Latin: Greetings) - Welcome your attendees
                </CardDescription>
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
                <CardDescription className="text-sm italic text-gray-500 mt-2">
                  Ραφά (Greek: To Heal) - Care for your participants
                </CardDescription>
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

      {/* Section: Security & Compliance */}
      <section id="security" className="py-16 bg-beige">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-4">
            Security & Compliance
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Your participants&apos; data is protected with industry-leading security measures.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="bg-navy rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-navy mb-2">Encrypted Data</h3>
              <p className="text-sm text-gray-600">All data encrypted in transit (HTTPS) and at rest (AES-256)</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="bg-navy rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-navy mb-2">Secure Payments</h3>
              <p className="text-sm text-gray-600">PCI-compliant payment processing through Stripe</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="bg-navy rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-navy mb-2">Safe Environment</h3>
              <p className="text-sm text-gray-600">Built-in tracking for diocesan Safe Environment compliance</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="bg-navy rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-navy mb-2">COPPA Compliant</h3>
              <p className="text-sm text-gray-600">Proper handling of minor data with parental consent workflows</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Founder Story */}
      <section id="about" className="py-16 bg-navy text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8">
              Built by ministry for ministry
            </h2>
            <div className="bg-navy-600 rounded-lg p-8 text-left space-y-4 text-lg">
              <p>
                As a registration assistant for the Steubenville Conferences, housing director for Mount 2000, and event manager for countless smaller retreats, I often found myself juggling a patchwork of tools—registration platforms, housing spreadsheets, check-in lists, medical forms, and more.
              </p>
              <p>
                But none of those tools truly understood Catholic youth ministry.
              </p>
              <p>
                There were no fields for priests.<br />
                No safe-environment tracking.<br />
                No tiered liability forms.<br />
                No assessment systems.<br />
                No way to respect the unique structure of our parishes, youth groups, and sacramental life.
              </p>
              <p>
                So we built ChiRho Events—the all-in-one system we wish we&apos;d had.
              </p>
              <p>
                Our mission is simple: To help Catholic events run more smoothly, more safely, and more beautifully, using tools intentionally crafted for the Church&apos;s pastoral needs—at a fair and honest price.
              </p>
              <p className="text-gold font-semibold pt-4">
                — Juanito, Founder
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Pricing */}
      <section id="pricing" className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-gray-600 mb-4 text-lg">
            Processing Fee: 2.9% + $0.30 per ticket (Stripe) • Platform Fee: 1% • Setup Fee: $250 (one-time)
          </p>
          <p className="text-center text-sm text-gray-500 mb-12">
            All payments are processed securely via Stripe. The 1% platform fee helps us maintain and improve ChiRho Events.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {/* Chapel */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl">Chapel</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">$29</span>
                  <span className="text-gray-600">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• 3 events/year</p>
                <p className="text-sm text-gray-600">• 500 people max</p>
                <p className="text-sm text-gray-600">• 5GB storage</p>
                <p className="text-sm text-gray-600">• Basic registration only</p>
                <div className="mt-4 text-xs text-gray-600">
                  <p className="font-semibold mb-1">Additional Fees:</p>
                  <ul className="space-y-1">
                    <li>• $250 one-time setup fee</li>
                    <li>• Stripe fees: 2.9% + $0.30 per transaction</li>
                    <li>• ChiRho platform fee: 1% of registrations</li>
                  </ul>
                </div>
                <Link href="/get-started?tier=chapel">
                  <Button className="w-full mt-6">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Parish */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl">Parish</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">$45</span>
                  <span className="text-gray-600">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• 5 events/year</p>
                <p className="text-sm text-gray-600">• 1,000 people max</p>
                <p className="text-sm text-gray-600">• 10GB storage</p>
                <p className="text-sm text-gray-600">• Basic registration only</p>
                <div className="mt-4 text-xs text-gray-600">
                  <p className="font-semibold mb-1">Additional Fees:</p>
                  <ul className="space-y-1">
                    <li>• $250 one-time setup fee</li>
                    <li>• Stripe fees: 2.9% + $0.30 per transaction</li>
                    <li>• ChiRho platform fee: 1% of registrations</li>
                  </ul>
                </div>
                <Link href="/get-started?tier=parish">
                  <Button className="w-full mt-6">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Cathedral - Popular */}
            <Card className="border-2 border-gold shadow-lg scale-105">
              <div className="bg-gold text-navy text-center py-1 text-sm font-semibold">
                POPULAR
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Cathedral</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">$89</span>
                  <span className="text-gray-600">/mo</span>
                  <p className="text-sm text-gray-500 mt-1">or $900/year</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• 10 events/year</p>
                <p className="text-sm text-gray-600">• 2,000 people max</p>
                <p className="text-sm text-gray-600">• 25GB storage</p>
                <p className="text-sm font-semibold text-green-700">• Includes POROS, SALVE, RAPHA</p>
                <div className="mt-4 text-xs text-gray-600">
                  <p className="font-semibold mb-1">Additional Fees:</p>
                  <ul className="space-y-1">
                    <li>• $250 one-time setup fee</li>
                    <li>• Stripe fees: 2.9% + $0.30 per transaction</li>
                    <li>• ChiRho platform fee: 1% of registrations</li>
                  </ul>
                </div>
                <Link href="/get-started?tier=cathedral">
                  <Button className="w-full mt-6">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Shrine */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl">Shrine</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-navy">$120</span>
                  <span className="text-gray-600">/mo</span>
                  <p className="text-sm text-gray-500 mt-1">or $1,200/year</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• 20 events/year</p>
                <p className="text-sm text-gray-600">• 4,000 people max</p>
                <p className="text-sm text-gray-600">• 100GB storage</p>
                <p className="text-sm font-semibold text-green-700">• Includes POROS, SALVE, RAPHA</p>
                <div className="mt-4 text-xs text-gray-600">
                  <p className="font-semibold mb-1">Additional Fees:</p>
                  <ul className="space-y-1">
                    <li>• $250 one-time setup fee</li>
                    <li>• Stripe fees: 2.9% + $0.30 per transaction</li>
                    <li>• ChiRho platform fee: 1% of registrations</li>
                  </ul>
                </div>
                <Link href="/get-started?tier=shrine">
                  <Button className="w-full mt-6">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Basilica */}
            <Card className="border-2 border-navy">
              <CardHeader>
                <CardTitle className="text-2xl">Basilica</CardTitle>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-navy">Custom Pricing</span>
                  <p className="text-sm text-gray-600 mt-1">Starting at $15,000/year</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">• Unlimited events</p>
                <p className="text-sm text-gray-600">• 10,000+ people</p>
                <p className="text-sm text-gray-600">• 500GB storage</p>
                <p className="text-sm font-semibold text-green-700">• All features included</p>
                <p className="text-sm text-gray-600">• Dedicated account manager</p>
                <div className="mt-4 text-xs text-gray-600">
                  <p className="font-semibold mb-1">Additional Fees:</p>
                  <ul className="space-y-1">
                    <li>• Custom setup fee</li>
                    <li>• Stripe fees: 2.9% + $0.30 per transaction</li>
                    <li>• ChiRho platform fee: 1% of registrations</li>
                  </ul>
                </div>
                <Link href="/get-started?tier=basilica">
                  <Button variant="outline" className="w-full mt-6">Contact Us</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Example */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p className="font-semibold mb-2">Example: On a $100 registration:</p>
            <p>• Participant pays: $100.00</p>
            <p>• Stripe fee: $3.20</p>
            <p>• ChiRho fee (1%): $1.00</p>
            <p className="mt-2"><strong>You receive: $95.80</strong></p>
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
                  What fees does ChiRho charge?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  ChiRho charges a 1% platform fee on all event registrations plus a monthly or annual subscription fee based on your plan. Standard Stripe processing fees (2.9% + $0.30) also apply to credit card transactions.
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
                  What if I need more events than my plan allows?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  You can either upgrade to a higher tier or pay a $50 overage fee for each additional event.
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
                  Initial account setup takes about 30 minutes. Creating your first event typically takes 1-2 hours depending on complexity. We provide onboarding support and documentation to help you get started.
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

              <AccordionItem value="item-8">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  Is this only for Catholic events?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  While ChiRho Events is built specifically with Catholic events in mind—with features like priest tracking, safe environment compliance, and three-tiered liability forms—it works beautifully for any conference, retreat, or gathering. The platform is flexible enough to adapt to your event&apos;s unique needs.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  Can I pay by check?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Yes! Organizations on annual plans can pay by check. We&apos;ll send you an invoice with mailing instructions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-10">
                <AccordionTrigger className="text-left text-lg font-semibold text-navy">
                  Is there a free trial?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  We don&apos;t offer free trials, but we do offer a $250 setup fee that includes onboarding assistance and dedicated support for your first 30 days.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Section: Video Demo */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">
              See ChiRho Events in Action
            </h2>
            <p className="text-gray-600">
              Watch a quick overview of how ChiRho Events simplifies event management for your organization.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-xl overflow-hidden shadow-2xl bg-navy">
              <video
                ref={videoRef}
                className="w-full aspect-video"
                src="/Videos/features-demo.mp4"
                muted
                loop
                playsInline
                poster="/og-image.png"
              />
              {/* Video Controls Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Play/Pause Button - Center */}
                <button
                  onClick={toggleVideoPlay}
                  className={`bg-white/90 hover:bg-white rounded-full p-4 shadow-lg transition-all duration-300 ${
                    isVideoPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                  }`}
                  aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                >
                  {isVideoPlaying ? (
                    <Pause className="h-8 w-8 text-navy" />
                  ) : (
                    <Play className="h-8 w-8 text-navy ml-1" />
                  )}
                </button>
              </div>
              {/* Mute/Unmute Button - Bottom Right */}
              <button
                onClick={toggleVideoMute}
                className="absolute bottom-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-300"
                aria-label={isVideoMuted ? 'Unmute video' : 'Mute video'}
              >
                {isVideoMuted ? (
                  <VolumeX className="h-5 w-5 text-navy" />
                ) : (
                  <Volume2 className="h-5 w-5 text-navy" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Get More Information */}
      <section id="contact" className="py-16 bg-beige">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Quick Links for More Information */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-4">
              Get More Information
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Not ready to sign up yet? Explore these resources to learn more about ChiRho Events.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="bg-navy rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-navy mb-2">Explore Features</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    See all the tools ChiRho offers for registration, housing, check-in, and more.
                  </p>
                  <Link href="/features">
                    <Button variant="outline" className="w-full">View Features</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="bg-navy rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <Clipboard className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-navy mb-2">Read Documentation</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Learn how the platform works with step-by-step guides and tutorials.
                  </p>
                  <Link href="/docs">
                    <Button variant="outline" className="w-full">View Docs</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="bg-navy rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-navy mb-2">Get Support</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Have questions? Check our FAQ or contact our support team directly.
                  </p>
                  <Link href="/support">
                    <Button variant="outline" className="w-full">Visit Support</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-center text-navy mb-8">
              Or Send Us a Message
            </h3>
            <Card>
              <CardContent className="p-8">
                {contactFormSubmitted ? (
                  <div className="text-center py-12">
                    <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-navy mb-2">Thank You!</h3>
                    <p className="text-gray-600">
                      We&apos;ve received your message and will get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => setContactFormSubmitted(false)}
                      className="mt-6"
                    >
                      Submit Another
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-6">
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
                      Submit Inquiry
                    </Button>
                    <p className="text-center text-sm text-gray-600">
                      Or email us at <a href="mailto:hello@chirhoevents.com" className="text-gold hover:underline">hello@chirhoevents.com</a>
                    </p>
                  </form>
                )}
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
                <li><Link href="/features" className="hover:text-gold transition-colors">Features</Link></li>
                <li><a href="#pricing" className="hover:text-gold transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-gold transition-colors">About</Link></li>
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
              <Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gold transition-colors">Terms of Service</Link>
              <Link href="/cookies" className="hover:text-gold transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
