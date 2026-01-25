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
          min-height: 100vh;
          min-height: 100dvh;
        }
      `}</style>
      {children}
    </>
  )
}
