'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <PublicNav currentPage="/about" />

      {/* Hero Section */}
      <section className="bg-navy text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              About ChiRho Events
            </h1>
            <p className="text-lg sm:text-xl text-gray-300">
              Built by ministry, for ministry
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8 sm:p-12">
                <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                  <p>
                    Hello! My name is Juan. I&apos;ve always loved working behind the scenes—seeing how things can run more smoothly, more efficiently, and ultimately more faithfully. In ministry, the last thing we need is to scramble for an assignment system, figure out first-aid logistics, or track allergies across multiple spreadsheets. So my goal was simple:
                  </p>

                  <p className="font-semibold text-navy text-center py-4">
                    Create a system that could handle all of this—and more.
                  </p>

                  <p>
                    It&apos;s not perfect yet, but by God&apos;s grace and with the help of those who use it, we are continually improving it.
                  </p>

                  <p>
                    I first worked as a registration assistant for the Steubenville Conferences at Franciscan University (Class of 2024). Today, I am a seminarian for the Archdiocese of Oklahoma City, studying at Mount St. Mary&apos;s Seminary. Each winter, we host a major retreat—and every year I saw how difficult it was to find a system that truly serves the needs of ministry.
                  </p>

                  <p>
                    What began as a project to build a housing-assignment tool eventually grew into a full registration platform.
                  </p>

                  <p className="font-semibold text-navy text-center py-4">
                    At the heart of ChiRho Events is one mission:<br />
                    to make it easier to bring young people and families to Christ.
                  </p>

                  <p className="text-center italic text-gray-600">
                    If this system helps even one soul draw closer to Him, then it has done its job.
                  </p>

                  <div className="pt-8 text-center">
                    <p className="text-gold font-semibold text-xl">
                      — Juan
                    </p>
                    <p className="text-gray-600 mt-2">
                      Founder, ChiRho Events<br />
                      Seminarian, Archdiocese of Oklahoma City<br />
                      Mount St. Mary&apos;s Seminary
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA Section */}
            <div className="mt-12 text-center">
              <h3 className="text-2xl font-bold text-navy mb-4">
                Ready to simplify your event management?
              </h3>
              <p className="text-gray-600 mb-6">
                Join the growing number of Catholic organizations using ChiRho Events
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/get-started">
                  <Button size="lg" className="text-lg px-8 py-6">
                    Get Started
                  </Button>
                </Link>
                <Link href="/features">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                    Explore Features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-12 mt-auto">
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
              <a href="#" className="hover:text-gold transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gold transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
