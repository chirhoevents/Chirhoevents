import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-[#E8DCC8]">Sign in to your ChiRho Events account</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-white border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#F5F1E8]",
              formButtonPrimary: "bg-[#9C8466] hover:bg-[#8B7355] text-[#1E3A5F]",
              formFieldInput: "border-[#D1D5DB] focus:border-[#9C8466] focus:ring-[#9C8466]",
              footerActionLink: "text-[#9C8466] hover:text-[#8B7355]"
            }
          }}
        />
      </div>
    </div>
  )
}
