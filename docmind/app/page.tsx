'use client'

import { useSession, signOut } from 'next-auth/react'
import LoginPage from '@/components/LoginPage'
import AppShell from '@/components/AppShell'

export default function Home() {
  const { data: session, status } = useSession()

  const handleLogout = async () => {
    await signOut()
  }

  if (status === 'loading') {
    return <div className="h-screen flex items-center justify-center text-sm font-bold text-violet-700">Loading DocMind AI...</div>
  }

  if (status === 'authenticated' && session.user) {
    const user = {
      name: session.user.name || 'User',
      email: session.user.email || ''
    }
    return <AppShell user={user} onLogout={handleLogout} />
  }

  return <LoginPage />
}