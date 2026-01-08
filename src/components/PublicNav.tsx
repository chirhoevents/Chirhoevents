'use client'

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, Users, FileText, Shield, Stethoscope, ClipboardCheck, ChevronDown, Menu, X } from "lucide-react"
import { useState } from "react"

interface PublicNavProps {
  currentPage?: string
}

export function PublicNav({ currentPage }: PublicNavProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/docs", label: "Documentation" },
    { href: "/support", label: "Support" },
  ]

  const SignInDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          Sign In
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Choose Your Portal</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer py-3"
          onClick={() => router.push('/sign-in?portal=org-admin')}
        >
          <Building2 className="mr-3 h-5 w-5 text-navy" />
          <div>
            <div className="font-medium">Organization Admin</div>
            <div className="text-xs text-gray-500">Manage events & settings</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer py-3"
          onClick={() => router.push('/sign-in?portal=group-leader')}
        >
          <Users className="mr-3 h-5 w-5 text-navy" />
          <div>
            <div className="font-medium">Group Leader</div>
            <div className="text-xs text-gray-500">Manage your group registration</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer py-3"
          onClick={() => router.push('/poros')}
        >
          <FileText className="mr-3 h-5 w-5 text-navy" />
          <div>
            <div className="font-medium">Liability Forms</div>
            <div className="text-xs text-gray-500">Complete participant forms</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-gray-400">Staff Portals</DropdownMenuLabel>

        <DropdownMenuItem
          className="cursor-pointer py-3"
          onClick={() => router.push('/sign-in?portal=rapha')}
        >
          <Stethoscope className="mr-3 h-5 w-5 text-red-600" />
          <div>
            <div className="font-medium">Rapha Coordinator</div>
            <div className="text-xs text-gray-500">Medical information portal</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer py-3"
          onClick={() => router.push('/sign-in?portal=salve')}
        >
          <ClipboardCheck className="mr-3 h-5 w-5 text-emerald-600" />
          <div>
            <div className="font-medium">SALVE Coordinator</div>
            <div className="text-xs text-gray-500">Check-in portal</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer py-3"
          onClick={() => router.push('/sign-in?portal=master-admin')}
        >
          <Shield className="mr-3 h-5 w-5 text-navy" />
          <div>
            <div className="font-medium">Master Admin</div>
            <div className="text-xs text-gray-500">Platform administration</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/dark-logo-horizontal.png"
                alt="ChiRho Events"
                width={200}
                height={60}
                className="h-10 md:h-14 w-auto cursor-pointer"
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-navy hover:text-gold transition-colors font-medium ${
                  currentPage === link.href ? 'text-gold' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <SignInDropdown />
            <Link href="/get-started">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-navy hover:text-gold transition-colors font-medium px-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-sm font-semibold text-gray-500 px-2 mb-3">Sign In Options</p>
                <div className="space-y-2">
                  <Link
                    href="/sign-in?portal=org-admin"
                    className="flex items-center px-2 py-2 text-navy hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Building2 className="mr-3 h-5 w-5" />
                    <div>
                      <div className="font-medium">Organization Admin</div>
                      <div className="text-xs text-gray-500">Manage events & settings</div>
                    </div>
                  </Link>
                  <Link
                    href="/sign-in?portal=group-leader"
                    className="flex items-center px-2 py-2 text-navy hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="mr-3 h-5 w-5" />
                    <div>
                      <div className="font-medium">Group Leader</div>
                      <div className="text-xs text-gray-500">Manage your group registration</div>
                    </div>
                  </Link>
                  <Link
                    href="/poros"
                    className="flex items-center px-2 py-2 text-navy hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FileText className="mr-3 h-5 w-5" />
                    <div>
                      <div className="font-medium">Liability Forms</div>
                      <div className="text-xs text-gray-500">Complete participant forms</div>
                    </div>
                  </Link>
                  <p className="text-xs font-semibold text-gray-400 px-2 mt-3 mb-1">Staff Portals</p>
                  <Link
                    href="/sign-in?portal=rapha"
                    className="flex items-center px-2 py-2 text-navy hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Stethoscope className="mr-3 h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium">Rapha Coordinator</div>
                      <div className="text-xs text-gray-500">Medical information portal</div>
                    </div>
                  </Link>
                  <Link
                    href="/sign-in?portal=salve"
                    className="flex items-center px-2 py-2 text-navy hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ClipboardCheck className="mr-3 h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="font-medium">SALVE Coordinator</div>
                      <div className="text-xs text-gray-500">Check-in portal</div>
                    </div>
                  </Link>
                  <Link
                    href="/sign-in?portal=master-admin"
                    className="flex items-center px-2 py-2 text-navy hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Shield className="mr-3 h-5 w-5" />
                    <div>
                      <div className="font-medium">Master Admin</div>
                      <div className="text-xs text-gray-500">Platform administration</div>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="pt-4 px-2">
                <Link href="/get-started" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
