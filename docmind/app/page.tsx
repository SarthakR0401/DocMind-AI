'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import LoginPage from '@/components/LoginPage'
import AppShell from '@/components/AppShell'

export default function Home() {
  const { data: session, status } = useSession()
  const [manualUser, setManualUser] = useState<{name: string, email: string} | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('manual-user')
    if (saved) {
      try {
        setManualUser(JSON.parse(saved))
      } catch (e) {
        console.error("Manual user parse failed", e)
      }
    }
  }, [])

  const handleLogout = async () => {
    localStorage.removeItem('manual-user')
    await signOut()
  }

  // Determine current user
  const currentUser = (status === 'authenticated' && session?.user) 
    ? { name: session.user.name || 'User', email: session.user.email || '' } 
    : manualUser

  if (status === 'loading') {
    return <div className="h-screen flex items-center justify-center text-sm font-bold text-violet-700">Loading DocMind AI...</div>
  }

  if (currentUser) {
    return <AppShell user={currentUser} onLogout={handleLogout} />
  }

  return <LoginPage />
}