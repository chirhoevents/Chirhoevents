'use client'

import { PublicNav } from "@/components/PublicNav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Building2, Users, FileText, Mail, HelpCircle, CreditCard, Calendar, Settings } from "lucide-react"
import Link from "next/link"

const faqCategories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: HelpCircle,
    questions: [
      {
        q: "How do I create an account?",
        a: "Click \"Get Started\" on our homepage and fill out the application form with your organization details. Our team will review your application within 24-48 hours. Once approved, you'll receive an invoice and can begin setting up your events."
      },
      {
        q: "What subscription plan is right for me?",
        a: "It depends on how many events you run per year and how many participants you expect. The Starter plan ($25/mo) works for small parishes with up to 3 events and 500 people. For diocesan-level events, consider Cathedral ($89/mo) or Shrine ($120/mo) plans. Cathedral and above include POROS, SALVE, and RAPHA modules."
      },
      {
        q: "How long does setup take?",
        a: "Initial account setup takes about 30 minutes. Creating your first event typically takes 1-2 hours depending on complexity. Our onboarding team provides support during your first 30 days."
      },
    ]
  },
  {
    id: "billing",
    title: "Billing & Payments",
    icon: CreditCard,
    questions: [
      {
        q: "What fees does ChiRho charge?",
        a: "ChiRho charges a 1% platform fee on all event registrations plus a monthly or annual subscription fee based on your plan. Standard Stripe processing fees (2.9% + $0.30) also apply to credit card transactions. There's also a one-time $250 setup fee."
      },
      {
        q: "Can I pay by check?",
        a: "Yes! Organizations on annual plans can pay by check. We'll send you an invoice with mailing instructions. Monthly plans require credit card payment."
      },
      {
        q: "What if I need more events than my plan allows?",
        a: "You can either upgrade to a higher tier or pay a $50 overage fee for each additional event. Contact us to discuss the best option for your needs."
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes! You can cancel your subscription at any time with no penalties. Your data is archived and can be reactivated for a $75-$250 fee depending on your plan."
      },
      {
        q: "How do refunds work for participants?",
        a: "Refund policies are set by each event organizer. ChiRho provides tools for administrators to process full or partial refunds directly through the platform."
      },
    ]
  },
  {
    id: "registration",
    title: "Registration & Events",
    icon: Calendar,
    questions: [
      {
        q: "How do I register my group?",
        a: "Get your access code from the event organizer, then sign in as a Group Leader. Enter your group information, add participants, and complete payment. You'll receive confirmation and liability form links to distribute."
      },
      {
        q: "What are liability forms?",
        a: "Liability forms collect essential information including medical details, emergency contacts, and legal waivers. ChiRho offers three form types: Youth (for minors), Chaperone (for adult volunteers), and Clergy (for priests and religious)."
      },
      {
        q: "Can participants register individually?",
        a: "Yes, if the event organizer enables individual registration. Participants can register directly on the event page without needing a group leader."
      },
      {
        q: "How do I edit a registration after submitting?",
        a: "Group leaders can edit registrations through their dashboard until the event deadline. For changes after the deadline, contact the event organizer directly."
      },
    ]
  },
  {
    id: "technical",
    title: "Technical Support",
    icon: Settings,
    questions: [
      {
        q: "I'm having trouble logging in",
        a: "Try resetting your password using the \"Forgot Password\" link. Make sure you're using the correct portal (Organization Admin, Group Leader, or Staff). If issues persist, email support@chirhoevents.com."
      },
      {
        q: "QR codes aren't scanning at check-in",
        a: "Make sure your device's camera has permission to access the SALVE check-in app. Try increasing screen brightness on the participant's phone. If the QR code is damaged, you can search for the participant by name."
      },
      {
        q: "My data isn't syncing with Google Sheets",
        a: "Check that your Google account is still connected in Settings > Integrations. Try disconnecting and reconnecting the integration. If data still isn't syncing, contact support."
      },
      {
        q: "Is my data secure?",
        a: "Absolutely. We use AES-256 encryption at rest, TLS 1.3 in transit, and are COPPA compliant for minor data. All data is backed up daily with point-in-time recovery."
      },
    ]
  },
  {
    id: "waitlist-vendors",
    title: "Waitlist & Vendors",
    icon: Users,
    questions: [
      {
        q: "How does the waitlist work?",
        a: "When an event reaches capacity, visitors can join a waitlist. They provide their info and receive a queue position. When spots open, admins can invite people from the waitlist with a 48-hour registration link."
      },
      {
        q: "How do I enable the waitlist for my event?",
        a: "Go to Event Edit > Step 6: Landing Page > Waitlist Settings. Toggle 'Enable Waitlist' on and optionally set a maximum capacity. Save your changes and the waitlist button will appear when your event is full."
      },
      {
        q: "How do I become a vendor at an event?",
        a: "Look for 'Vendor Registration' link at the bottom of the event's registration page. Submit your application with business details and booth preferences. Event organizers will review and notify you of approval."
      },
      {
        q: "Where do I find my vendor code?",
        a: "After approval, your vendor code is in your approval email and the Vendor Portal dashboard. Use this code for booth staff registration - share it only with people you want working at your booth."
      },
      {
        q: "How do I register booth staff?",
        a: "Share your vendor code with staff members. They visit the staff registration link on the event page, select 'Vendor Booth Staff', enter your code, and complete their registration."
      },
    ]
  },
]

const helpCards = [
  {
    title: "Organization Admin Support",
    description: "Already have an account? Submit a support ticket from your dashboard.",
    icon: Building2,
    href: "/sign-in?portal=org-admin&redirect=/dashboard/admin/support",
    buttonText: "Sign In to Submit Ticket",
    color: "bg-navy",
  },
  {
    title: "Group Leader Support",
    description: "Need help with registration or liability forms?",
    icon: Users,
    href: "/sign-in?portal=group-leader",
    buttonText: "Group Leader Login",
    color: "bg-gold",
  },
  {
    title: "Liability Forms Help",
    description: "Just need to complete a liability form?",
    icon: FileText,
    href: "/poros",
    buttonText: "Access Liability Platform",
    color: "bg-green-600",
  },
  {
    title: "Contact Us",
    description: "We typically respond within 24 hours.",
    icon: Mail,
    href: "mailto:support@chirhoevents.com",
    buttonText: "Send Email",
    color: "bg-gray-600",
    email: "support@chirhoevents.com",
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav currentPage="/support" />

      {/* Navy Header */}
      <header className="bg-navy text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold">Support & Help</h1>
          <p className="text-gray-300 mt-2">Get answers to your questions</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-navy mb-8">Frequently Asked Questions</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {faqCategories.map((category) => (
              <Card key={category.id} className="overflow-hidden">
                <div className="bg-beige px-6 py-4 border-b">
                  <h3 className="flex items-center text-lg font-semibold text-navy">
                    <category.icon className="h-5 w-5 mr-2 text-gold" />
                    {category.title}
                  </h3>
                </div>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible>
                    {category.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`${category.id}-${index}`} className="border-b last:border-b-0">
                        <AccordionTrigger className="px-6 py-4 text-left text-sm font-medium text-navy hover:no-underline">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4 text-sm text-gray-600">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Need More Help Section */}
        <section>
          <h2 className="text-2xl font-bold text-navy mb-8">Need More Help?</h2>
          <p className="text-gray-600 mb-8">Choose what you need help with:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpCards.map((card) => (
              <Card key={card.title} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`${card.color} p-4`}>
                  <card.icon className="h-8 w-8 text-white" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-navy mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{card.description}</p>
                  {card.email && (
                    <p className="text-sm text-gold mb-4">{card.email}</p>
                  )}
                  <Link href={card.href}>
                    <Button variant="outline" className="w-full">
                      {card.buttonText}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Additional Help */}
        <section className="mt-16">
          <Card className="bg-navy text-white">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold mb-4">Still need assistance?</h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Our support team is here to help. Check out our{" "}
                <Link href="/docs" className="text-gold hover:underline">documentation</Link>{" "}
                for detailed guides, or reach out directly and we&apos;ll get back to you within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/docs">
                  <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-navy">
                    Browse Documentation
                  </Button>
                </Link>
                <a href="mailto:support@chirhoevents.com">
                  <Button className="bg-gold text-navy hover:bg-gold/90">
                    Email Support Team
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
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
