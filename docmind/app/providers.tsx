'use client'

import { SessionProvider } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useSession } from "next-auth/react"

function PageViewTracker() {
  const pathname = usePathname()
  const { data: session } = useSession()

  useEffect(() => {
    let email: string | null = null
    if (session?.user?.email) {
      email = session.user.email
    } else {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('manual-user') : null
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed && parsed.email) {
            email = parsed.email
          }
        } catch (e) {}
      }
    }

    const logPageView = async () => {
      try {
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        await fetch(`${apiUrl}/api/analytics/pageview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, path: pathname })
        });
      } catch (err) {
        console.error("Failed to log page view:", err);
      }
    }

    logPageView()
  }, [pathname, session])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PageViewTracker />
      {children}
    </SessionProvider>
  )
}
