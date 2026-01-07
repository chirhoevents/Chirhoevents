'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Home, Clipboard, Heart, BarChart3, Check, Shield, Clock, Smartphone } from "lucide-react";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <PublicNav currentPage="/features" />

      {/* Hero Section */}
      <section className="bg-navy text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Everything You Need in One Platform
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-6">
              ChiRho Events brings together registration, forms, housing, check-in, medical tracking, and reporting—all built specifically for Catholic ministry.
            </p>
            <Link href="/get-started">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 bg-beige">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-gold rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">Built for Catholic Ministry</h3>
                <p className="text-gray-600">
                  Fields for priests, safe environment tracking, and tiered liability forms—all the unique needs of Catholic events.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-gold rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">Save Time & Money</h3>
                <p className="text-gray-600">
                  One platform replaces multiple tools. Save 30% on costs and countless hours on event management.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-gold rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">Secure & Compliant</h3>
                <p className="text-gray-600">
                  AES-256 encryption, COPPA compliant, and built with the highest security standards for protecting participant data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-navy mb-12">
              Comprehensive Feature Set
            </h2>

            {/* Registration System */}
            <div className="mb-16">
              <Card className="border-2 border-gold">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Users className="h-12 w-12 text-gold flex-shrink-0" />
                    <div>
                      <CardTitle className="text-2xl mb-2">Registration System</CardTitle>
                      <CardDescription className="text-base">
                        Flexible registration options for groups and individuals with intelligent pricing
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Group Registration</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Youth group registration with leader portal</li>
                        <li>• Automatic participant categorization (youth U18, O18, chaperones, priests)</li>
                        <li>• Customizable pricing tiers and deposits</li>
                        <li>• Unique access codes for each group</li>
                        <li>• Housing type selection (on-campus, off-campus, commuter)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Individual Registration</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Direct individual sign-ups</li>
                        <li>• Room preference selection (single, double, triple, quad)</li>
                        <li>• Roommate matching preferences</li>
                        <li>• Add-on selection (meals, t-shirts, activities)</li>
                        <li>• QR code generation for check-in</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Liability Forms */}
            <div className="mb-16">
              <Card className="border-2 border-gold">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <FileText className="h-12 w-12 text-gold flex-shrink-0" />
                    <div>
                      <CardTitle className="text-2xl mb-2">Three-Tiered Liability Forms</CardTitle>
                      <CardDescription className="text-base">
                        Catholic-specific liability forms with e-signatures and safe environment tracking
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Youth Under 18</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Parent email workflow</li>
                        <li>• Medical information collection</li>
                        <li>• Allergy & dietary tracking</li>
                        <li>• Emergency contacts (2 required)</li>
                        <li>• Insurance information</li>
                        <li>• Parent/guardian e-signature</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Youth Over 18 & Chaperones</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Self-completion workflow</li>
                        <li>• Medical & allergy information</li>
                        <li>• Safe environment certificate upload</li>
                        <li>• ADA accommodation tracking</li>
                        <li>• Personal e-signature</li>
                        <li>• PDF generation & storage</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Clergy</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Title selection (Priest, Deacon, Bishop)</li>
                        <li>• Diocese of incardination</li>
                        <li>• Faculty information</li>
                        <li>• Medical information</li>
                        <li>• Specialized clergy fields</li>
                        <li>• Secure document storage</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Poros Housing */}
            <div className="mb-16">
              <Card className="border-2 border-gold">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Home className="h-12 w-12 text-gold flex-shrink-0" />
                    <div>
                      <CardTitle className="text-2xl mb-2">Poros Portal (Housing & Assignments)</CardTitle>
                      <CardDescription className="text-base italic">
                        Πόρος (Greek: Gateway) - The complete assignment management system
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Housing Management</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ul className="space-y-2 text-gray-600">
                          <li>• Drag-and-drop room assignments</li>
                          <li>• Auto-recommendations based on group size</li>
                          <li>• Gender & age restriction enforcement</li>
                          <li>• Separate priest housing tracking</li>
                          <li>• ADA accessibility tracking</li>
                        </ul>
                        <ul className="space-y-2 text-gray-600">
                          <li>• Visual capacity indicators</li>
                          <li>• Conflict detection & prevention</li>
                          <li>• Real-time utilization statistics</li>
                          <li>• Building & room management</li>
                          <li>• Roommate preference matching</li>
                        </ul>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Additional Assignment Features</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ul className="space-y-2 text-gray-600">
                          <li>• Seating section assignments</li>
                          <li>• Meal color scheduling</li>
                          <li>• Small group room assignments</li>
                        </ul>
                        <ul className="space-y-2 text-gray-600">
                          <li>• Seminarian (SGL) assignments</li>
                          <li>• Religious staff assignments</li>
                          <li>• Customizable features per event</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SALVE Check-In */}
            <div className="mb-16">
              <Card className="border-2 border-gold">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Clipboard className="h-12 w-12 text-gold flex-shrink-0" />
                    <div>
                      <CardTitle className="text-2xl mb-2">SALVE Check-In System</CardTitle>
                      <CardDescription className="text-base italic">
                        SALVE (Latin: Greetings) - Streamlined participant check-in and packet printing
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Check-In Features</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• QR code scanning (camera-based)</li>
                        <li>• Name & phone search</li>
                        <li>• Real-time status display (payment, forms, certificates)</li>
                        <li>• Dietary restriction highlighting</li>
                        <li>• Override capabilities for exceptions</li>
                        <li>• Multi-device support for multiple stations</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Printing & Documents</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Group packet printing (housing, meals, schedule)</li>
                        <li>• Individual packet printing</li>
                        <li>• Name tag printing (customizable templates)</li>
                        <li>• Dietary icons & meal color dots</li>
                        <li>• Custom document attachment</li>
                        <li>• Reprint functionality</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-6">
                    <h4 className="font-semibold text-navy mb-3">Dashboard & Analytics</h4>
                    <ul className="space-y-2 text-gray-600 md:columns-2">
                      <li>• Real-time check-in statistics</li>
                      <li>• Check-ins by hour charts</li>
                      <li>• Payment status overview</li>
                      <li>• Form completion tracking</li>
                      <li>• Live check-in feed</li>
                      <li>• Average check-in time tracking</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rapha Medical */}
            <div className="mb-16">
              <Card className="border-2 border-gold">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Heart className="h-12 w-12 text-gold flex-shrink-0" />
                    <div>
                      <CardTitle className="text-2xl mb-2">Rapha Medical Platform</CardTitle>
                      <CardDescription className="text-base italic">
                        Ραφά (Greek: To Heal) - Instant access to medical information and incident tracking
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Medical Information Access</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Instant participant lookup</li>
                        <li>• Medical conditions display</li>
                        <li>• Current medications list</li>
                        <li>• Allergy alerts (highlighted)</li>
                        <li>• Emergency contact information</li>
                        <li>• Insurance details</li>
                        <li>• Read-only access for safety</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Incident Reporting</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Comprehensive incident form</li>
                        <li>• Date, time, location tracking</li>
                        <li>• Injury description & treatment</li>
                        <li>• Medication administration log</li>
                        <li>• Hospital transport documentation</li>
                        <li>• Parent contact tracking</li>
                        <li>• Printable incident reports</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports & Integrations */}
            <div className="mb-16">
              <Card className="border-2 border-gold">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <BarChart3 className="h-12 w-12 text-gold flex-shrink-0" />
                    <div>
                      <CardTitle className="text-2xl mb-2">Reports & Integrations</CardTitle>
                      <CardDescription className="text-base">
                        Powerful reporting and seamless integration with your existing tools
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Export & Reporting</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ul className="space-y-2 text-gray-600">
                          <li>• Pre-built report templates</li>
                          <li>• Custom report builder</li>
                          <li>• CSV export functionality</li>
                          <li>• Financial reports</li>
                        </ul>
                        <ul className="space-y-2 text-gray-600">
                          <li>• Housing assignment reports</li>
                          <li>• Dietary restriction summaries</li>
                          <li>• Check-in status reports</li>
                          <li>• One-click report generation</li>
                        </ul>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy mb-3">Third-Party Integrations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="font-semibold text-navy mb-2">Google Sheets</p>
                          <ul className="space-y-1 text-gray-600 text-sm">
                            <li>• Live data sync</li>
                            <li>• Auto-updates every 5 min</li>
                            <li>• Custom templates</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-navy mb-2">Mailchimp</p>
                          <ul className="space-y-1 text-gray-600 text-sm">
                            <li>• Email list export</li>
                            <li>• Automatic tagging</li>
                            <li>• Audience segmentation</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-navy mb-2">QuickBooks Online</p>
                          <ul className="space-y-1 text-gray-600 text-sm">
                            <li>• Invoice sync</li>
                            <li>• Payment tracking</li>
                            <li>• Daily reconciliation</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Features */}
            <div>
              <h3 className="text-2xl font-bold text-navy mb-6">Additional Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Group Leader Portal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Payment management</li>
                      <li>• Form completion tracking</li>
                      <li>• Certificate uploads</li>
                      <li>• Automated reminders</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Processing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Stripe integration</li>
                      <li>• Deposit & balance payments</li>
                      <li>• Late fee management</li>
                      <li>• Coupon & discount codes</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Public Portal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Mobile-optimized</li>
                      <li>• Assignment lookup</li>
                      <li>• Custom branding</li>
                      <li>• QR code posters</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Security & Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-gray-600">
                      <li>• AES-256 encryption</li>
                      <li>• COPPA compliant</li>
                      <li>• Daily backups</li>
                      <li>• Role-based access</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Communication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Automated email confirmations</li>
                      <li>• Payment receipts</li>
                      <li>• Form completion reminders</li>
                      <li>• Custom email templates</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mobile Support</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Responsive design</li>
                      <li>• Mobile check-in</li>
                      <li>• Camera QR scanning</li>
                      <li>• Touch-optimized interface</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-navy text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Transform Your Event Management?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Join dioceses and organizations across the country using ChiRho Events to run smoother, safer, and more successful Catholic events.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/get-started">
                <Button size="lg" className="text-lg px-8 py-6">
                  Get Started Today
                </Button>
              </Link>
              <Link href="/#pricing">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white hover:text-navy">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                <li><Link href="/#pricing" className="hover:text-gold transition-colors">Pricing</Link></li>
                <li><a href="#" className="hover:text-gold transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-gold transition-colors">About</Link></li>
                <li><Link href="/#contact" className="hover:text-gold transition-colors">Contact</Link></li>
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
