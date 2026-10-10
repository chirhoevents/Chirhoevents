'use client'

export default function FamilySignOut({ slug }: { slug: string }) {
  return (
    <button
      type="button"
      className="text-sm text-gray-500 hover:text-[#1E3A5F] underline"
      onClick={async () => {
        await fetch('/api/lux/public/family/logout', { method: 'POST' }).catch(() => null)
        window.location.href = `/lux/${slug}`
      }}
    >
      Sign out
    </button>
  )
}
