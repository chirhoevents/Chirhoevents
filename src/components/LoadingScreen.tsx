'use client'

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
        {/* Custom spinning loader */}
        <div className="relative w-20 h-20 mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gold/30"></div>
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gold animate-spin"></div>
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-gold/10"></div>
          {/* Center dot */}
          <div className="absolute inset-1/3 rounded-full bg-gold/50 animate-pulse"></div>
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
