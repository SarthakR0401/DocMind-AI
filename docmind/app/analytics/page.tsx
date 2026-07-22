'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  BarChart3, 
  Users, 
  Eye, 
  LogIn, 
  ArrowLeft, 
  Activity, 
  Globe, 
  UserCheck, 
  Clock, 
  RefreshCw 
} from 'lucide-react'

interface Stats {
  total_views: number
  total_users: number
  total_logins: number
  recent_logins: Array<{
    email: string
    provider: string
    timestamp: string
    name: string | null
  }>
  recent_users: Array<{
    email: string
    name: string
    created_at: string
  }>
  path_summary: Array<{
    path: string
    views: number
  }>
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      setError(null)
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const res = await fetch(`${apiUrl}/api/admin/stats`)
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.statusText}`)
      }
      const data = await res.json()
      setStats(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to connect to backend analytics API')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-center items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="text-sm font-medium tracking-wide text-gray-500 animate-pulse">Loading analytics dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-300">
      
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              DocMind AI Admin Console
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Real-time system usage & user tracking</p>
          </div>
        </div>

        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-550 hover:bg-indigo-650 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          style={{ background: 'var(--violet)' }}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </header>

      {/* ── Main Content Area ────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 flex flex-col gap-8 animate-fade-up">
        
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex flex-col gap-1">
            <span className="font-semibold">Connection Error</span>
            <span>{error}. Please ensure the python backend is running and Aiven MySQL is connected.</span>
          </div>
        )}

        {/* ── KPI Stats Cards Grid ────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Page Views */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Page Views</span>
              <span className="text-3xl font-extrabold tracking-tight">{stats?.total_views ?? 0}</span>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-1">
                <Globe className="h-3 w-3" /> Live traffic tracked
              </span>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Eye className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Registered Users */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Registered Users</span>
              <span className="text-3xl font-extrabold tracking-tight">{stats?.total_users ?? 0}</span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 mt-1">
                <UserCheck className="h-3 w-3" /> Credentials & Google Auth
              </span>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: User Login Sessions */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Logins</span>
              <span className="text-3xl font-extrabold tracking-tight">{stats?.total_logins ?? 0}</span>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1 mt-1">
                <LogIn className="h-3 w-3" /> Active tracking enabled
              </span>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>

        </section>

        {/* ── Table Grid Section ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* 1. Recent Signups Table */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Users className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-bold">New User Records</h2>
              <span className="ml-auto text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">Last 50</span>
            </div>

            <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2 text-right">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {stats?.recent_users && stats.recent_users.length > 0 ? (
                    stats.recent_users.map((u, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="py-2.5 font-medium">{u.name || 'Anonymous User'}</td>
                        <td className="py-2.5 text-gray-500 dark:text-gray-400">{u.email}</td>
                        <td className="py-2.5 text-right text-xs text-gray-400 font-mono">{u.created_at}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-gray-400 text-xs">No user registration records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Page View Hotspots Table */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Eye className="h-5 w-5 text-blue-500" />
              <h2 className="text-base font-bold">Page View Hotspots</h2>
              <span className="ml-auto text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full font-medium">Top routes</span>
            </div>

            <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="pb-2">Path / Route</th>
                    <th className="pb-2 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {stats?.path_summary && stats.path_summary.length > 0 ? (
                    stats.path_summary.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400">{p.path}</td>
                        <td className="py-2.5 text-right font-semibold">{p.views}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-gray-400 text-xs">No page view stats recorded yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </section>

        {/* ── 3. Login Session Logs Table (Full Width) ───────────────────────── */}
        <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <LogIn className="h-5 w-5 text-purple-500" />
            <h2 className="text-base font-bold">Login Session Logs</h2>
            <span className="text-xs text-gray-400 font-normal ml-2">Tracks custom logins & Google sign-ins</span>
            <span className="ml-auto text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-full font-medium">Last 50 Logins</span>
          </div>

          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">User Name</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">Auth Provider</th>
                  <th className="pb-3 text-right">Login Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {stats?.recent_logins && stats.recent_logins.length > 0 ? (
                  stats.recent_logins.map((log, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 font-medium">{log.name || 'Anonymous User'}</td>
                      <td className="py-3 text-gray-650 dark:text-gray-350">{log.email}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          log.provider === 'google' 
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-950/40' 
                            : 'bg-indigo-550/10 dark:bg-indigo-400/10 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950/40'
                        }`}>
                          {log.provider === 'google' ? 'Google' : 'Credentials'}
                        </span>
                      </td>
                      <td className="py-3 text-right text-xs text-gray-400 font-mono">{log.timestamp}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">No user logins recorded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
      
      <footer className="border-t border-gray-200 dark:border-gray-800 text-center py-6 text-xs text-gray-400 dark:text-gray-550 mt-12 bg-white/40 dark:bg-[#111827]/40">
        DocMind AI Analytics Framework · Persisted securely to Aiven Cloud MySQL database.
      </footer>
    </div>
  )
}
