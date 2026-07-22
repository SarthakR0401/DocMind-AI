'use client'

import { SessionProvider } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useSession } from "next-auth/react"

function PageViewTracker() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Prompt user for location access on mount (asks once per browser session)
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('user-lat')) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            sessionStorage.setItem('user-lat', position.coords.latitude.toString())
            sessionStorage.setItem('user-lon', position.coords.longitude.toString())
            // Re-trigger a log with precise coordinates once resolved
            window.dispatchEvent(new Event('coords-resolved'))
          },
          (error) => {
            console.warn("Geolocation permission denied or unavailable:", error)
          },
          { enableHighAccuracy: true, timeout: 5000 }
        )
      }
    }
  }, [])

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
        
        const lat = typeof window !== 'undefined' ? sessionStorage.getItem('user-lat') : null
        const lon = typeof window !== 'undefined' ? sessionStorage.getItem('user-lon') : null
        
        await fetch(`${apiUrl}/api/analytics/pageview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            path: pathname,
            latitude: lat ? parseFloat(lat) : null,
            longitude: lon ? parseFloat(lon) : null
          })
        });
      } catch (err) {
        console.error("Failed to log page view:", err);
      }
    }

    logPageView()

    // Listen for coordinate resolutions to re-submit with coordinates if prompt was slow
    const handleCoordsChange = () => {
      logPageView()
    }
    window.addEventListener('coords-resolved', handleCoordsChange)
    return () => {
      window.removeEventListener('coords-resolved', handleCoordsChange)
    }
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
