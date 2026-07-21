'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import LoginPage from '@/components/LoginPage'
import AppShell from '@/components/AppShell'
import { AppShellSkeleton } from '@/components/Skeleton'

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
    return <AppShellSkeleton />
  }

  if (currentUser) {
    return (
      <div className="h-full w-full animate-fade-in">
        <AppShell user={currentUser} onLogout={handleLogout} />
      </div>
    )
  }

  return (
    <div className="h-full w-full animate-fade-in">
      <LoginPage />
    </div>
  )
}