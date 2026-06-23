'use client'

import { useState } from 'react'
import { PublicNav } from "@/components/PublicNav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Building2, Users, FileText, Mail, HelpCircle, CreditCard, Calendar, Settings, Search, X } from "lucide-react"
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
        a: "It depends on how many events you run per year and how many participants you expect. The Chapel plan ($39/mo) works for small parishes with 1 event and up to 500 people. Parish ($59/mo) covers up to 3 events and 750 people. For diocesan-level events, consider Cathedral ($109/mo, 5 events / 1,250 people) or Shrine ($159/mo, 10 events / 3,000 people). Cathedral and above include POROS, SALVE, and RAPHA modules plus a 1-hour setup phone call. Basilica is custom, starting at $5,000/year."
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
        a: "ChiRho charges a 1% platform fee on all event registrations plus a monthly or annual subscription fee based on your plan. Standard Stripe processing fees (2.9% + $0.30) also apply to credit card transactions. There's also a one-time setup fee that varies by plan: $50 for Chapel/Parish (basic access), $250 for Cathedral, $400 for Shrine, and custom for Basilica. Need extra help, training, or custom setup work? We're available at $90/hour."
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
        a: "Yes! You can cancel your subscription at any time with no penalties. Your data is archived and can be reactivated for a $75-$400 fee depending on your plan."
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
  {
    id: "poros-liability",
    title: "Liability Forms (Poros)",
    icon: FileText,
    questions: [
      {
        q: "What is Poros and who uses it?",
        a: "Poros is ChiRho's liability form platform. Every registered participant — youth, chaperones, and clergy — must complete a liability form through Poros before the event. Group leaders coordinate this for their group, and admins track completion from their dashboard."
      },
      {
        q: "How does a group leader share Poros with their participants?",
        a: "After registering, the group leader receives a unique access code in their confirmation email and in their Group Leader Portal. They share two things with every participant: (1) the access code, and (2) the link chirhoevents.com/poros. Each person uses that code to access the forms."
      },
      {
        q: "What do participants do on the Poros platform?",
        a: "1. Go to chirhoevents.com/poros. 2. Enter the group access code provided by your group leader. 3. Confirm your group name and event. 4. Select your role — Youth Under 18, Youth 18+ or Chaperone, or Clergy/Religious. 5. Complete and submit your liability form. Youth under 18 will enter a parent's email; the parent receives a separate link to sign on the minor's behalf."
      },
      {
        q: "What are the three liability form types?",
        a: "Youth Under 18 (ages 12–17): The participant starts the form and enters a parent or guardian email. The parent receives a secure link to review, complete medical details, and sign the form digitally. Youth 18+ or Chaperone: The participant completes and signs the form entirely on their own. Clergy & Religious (Priest, Deacon, Seminarian, Sister, Brother): A specialized form with clergy-specific fields. This option only appears if the group registration included a priest count."
      },
      {
        q: "What if a parent doesn't receive the email for a minor's form?",
        a: "Ask the youth to re-enter Poros with the same access code and resubmit with the correct parent email. Also check spam/junk folders. If still missing, contact the event organizer — admins can resend the parent link from their Liability Forms dashboard."
      },
      {
        q: "How do admins enable liability forms for their event?",
        a: "Liability forms are automatically active for all group registrations — no extra setup is needed. For individual registrations, go to Event Settings and enable 'Individual Registration', then check the 'Youth Event (Participants Under 18)' box. Admins can view all submitted forms under Admin Dashboard → Liability Forms."
      },
      {
        q: "Where can admins track who has and hasn't submitted their form?",
        a: "Go to Admin Dashboard → Liability Forms, or open the specific event and click the 'Poros / Liability' tab. You'll see each participant's name, form type, and completion status. Incomplete forms are highlighted so you can follow up with the group leader."
      },
      {
        q: "How do I set up the wording on each Poros liability form page?",
        a: "Go to Admin Dashboard → Events → [Your Event] → Poros / Liability. There are two tabs that control all wording:\n\n1. WAIVER TEMPLATES — Controls the legal consent text participants read and agree to. Select the form type (Youth U18, Youth 18+/Chaperone, Clergy, or Religious), then edit any of the five text fields: General Waiver & Release (shown at the top of the consent section), Medical Release Authorization, Photo & Video Consent, Transportation Consent, and Emergency Treatment Authorization. Click 'Fill Defaults' to start from pre-written text, then customize as needed. Use 'Preview Form' to see exactly how it will look before saving.\n\n2. SECTION CONFIG — Controls the section headings and help text shown throughout the form. Select the participant type, then for each section you can: change the label (e.g. rename 'Medical Information' to something specific to your org), add Help Text that appears below the section heading, toggle sections on or off, mark sections as required or optional, and reorder sections with the up/down arrows.\n\nChanges in both tabs take effect immediately for anyone opening a form with your event's access code."
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
  const [searchQuery, setSearchQuery] = useState('')

  const query = searchQuery.trim().toLowerCase()

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (faq) =>
          faq.q.toLowerCase().includes(query) ||
          faq.a.toLowerCase().includes(query)
      ),
    }))
    .filter((category) => category.questions.length > 0)

  const totalResults = filteredCategories.reduce((sum, c) => sum + c.questions.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav currentPage="/support" />

      {/* Navy Header */}
      <header className="bg-navy text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold">Support & Help</h1>
          <p className="text-gray-300 mt-2">Get answers to your questions</p>

          {/* Search Bar */}
          <div className="mt-6 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for answers..."
              className="w-full pl-12 pr-10 py-3 rounded-lg text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gold text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* FAQ Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-navy">Frequently Asked Questions</h2>
            {query && (
              <p className="text-sm text-gray-500">
                {totalResults === 0
                  ? 'No results found'
                  : `${totalResults} result${totalResults === 1 ? '' : 's'} for "${searchQuery}"`}
              </p>
            )}
          </div>

          {query && totalResults === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No results found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-gray-400 text-sm">Try different keywords or <button onClick={() => setSearchQuery('')} className="text-gold hover:underline">clear the search</button> to browse all topics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredCategories.map((category) => (
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
                          <AccordionContent className="px-6 pb-4 text-sm text-gray-600 whitespace-pre-line">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
