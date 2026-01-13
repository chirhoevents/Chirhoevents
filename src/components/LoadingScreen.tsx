'use client'

import Image from 'next/image'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundImage: `url('/ChiRho Event Logos/ChiRho events BG.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-navy/80"></div>

      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Custom spinning loader with logo */}
        <div className="relative w-28 h-28 mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gold/30"></div>
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gold border-r-gold animate-spin"></div>
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-white/10"></div>
          {/* Logo in center */}
          <div className="absolute inset-4 flex items-center justify-center">
            <Image
              src="/ChiRho Event Logos/Chrirho Events Square White Logo.png"
              alt="ChiRho Events"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
        </div>

        {/* Loading text */}
        <p className="text-white text-lg font-medium">{message}</p>

        {/* Animated dots */}
        <div className="flex gap-1 mt-2">
          <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  )
}
