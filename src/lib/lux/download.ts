'use client'

/**
 * Download a file from a Lux staff API (which needs the session token, so a
 * plain link won't do): fetch it, then save it through a temporary link.
 */
export async function downloadFromApi(getToken: () => Promise<string | null>, url: string, fallbackName: string) {
  const token = await getToken()
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Download failed')
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = match?.[1] || fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
