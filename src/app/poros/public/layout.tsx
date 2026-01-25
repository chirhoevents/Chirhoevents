export default function PorosPublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/*
        Set html/body background to match the Poros theme.
        This prevents white flashes on desktop browsers (especially Chrome)
        during page load or hydration.
      */}
      <style>{`
        html, body {
          background-color: #1E3A5F !important;
        }
      `}</style>
      <div
        className="min-h-screen bg-[#1E3A5F]"
        style={{
          // Ensure the background color covers the full viewport on all browsers
          minHeight: '100vh',
          backgroundColor: '#1E3A5F',
        }}
      >
        {children}
      </div>
    </>
  )
}
