'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
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
  RefreshCw,
  Lock
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
    country: string | null
    city: string | null
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
  recent_page_views: Array<{
    email: string | null
    path: string
    timestamp: string
    name: string | null
    country: string | null
    city: string | null
  }>
  country_summary: Array<{
    country: string
    count: number
  }>
  daily_activity: Array<{
    date: string
    views: number
  }>
}

export default function AnalyticsDashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Auto-authorize if logged in via Google with admin email
  useEffect(() => {
    if (status === 'loading') return
    if (session?.user?.email && session.user.email === 'sarthakrathi04@gmail.com') {
      setIsAuthorized(true)
    } else {
      setIsAuthorized(false)
    }
  }, [session, status])

  const fetchStats = async () => {
    const adminEmail = session?.user?.email
    if (!adminEmail || adminEmail !== 'sarthakrathi04@gmail.com') {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      
      const res = await fetch(`${apiUrl}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${adminEmail}`
        }
      })
      
      if (!res.ok) {
        if (res.status === 403) {
          setIsAuthorized(false)
          throw new Error('Access Denied: Invalid administrator session')
        }
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
    if (isAuthorized) {
      fetchStats()
    } else if (status !== 'loading') {
      setLoading(false)
    }
  }, [isAuthorized, status])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  if (status === 'loading' || (isAuthorized && loading)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-center items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="text-sm font-medium tracking-wide text-gray-500 animate-pulse">Loading analytics dashboard...</p>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center p-6 text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-300">
        <div className="max-w-md w-full bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl flex flex-col gap-6 animate-fade-up">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl animate-float">
              <Lock className="h-8 w-8 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Access Denied</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Only the authorized administrator account is allowed to view this console.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {session ? (
              <>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Currently logged in as: <span className="font-semibold text-gray-800 dark:text-gray-200">{session.user?.email}</span>
                </p>
                <button
                  onClick={() => signOut({ callbackUrl: '/analytics' })}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-md transition-colors"
                >
                  Sign Out of Current Account
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn('google', { callbackUrl: '/analytics' })}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-semibold shadow-md transition-colors"
                style={{ background: 'var(--violet)' }}
              >
                Sign In with Admin Google Account
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-150 dark:border-gray-800 pt-4 mt-2">
            <Link href="/" className="text-xs font-semibold text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Home
            </Link>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DocMind Security</span>
          </div>
        </div>
      </div>
    )
  }

  // Daily activity SVG chart calculations
  const activityData = stats?.daily_activity || []
  const maxViews = Math.max(...activityData.map(d => d.views), 10)
  const chartWidth = 500
  const chartHeight = 200
  const chartPadding = 40
  
  const chartPoints = activityData.map((d, i) => {
    const x = chartPadding + (i * (chartWidth - 2 * chartPadding)) / Math.max(activityData.length - 1, 1)
    const y = chartHeight - chartPadding - (d.views * (chartHeight - 2 * chartPadding)) / maxViews
    return { x, y, views: d.views, date: d.date }
  })
  
  const linePathD = chartPoints.length > 0 
    ? `M ${chartPoints[0].x} ${chartPoints[0].y} ` + chartPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : ''
    
  const fillPathD = chartPoints.length > 0
    ? `${linePathD} L ${chartPoints[chartPoints.length - 1].x} ${chartHeight - chartPadding} L ${chartPoints[0].x} ${chartHeight - chartPadding} Z`
    : ''
    
  const totalCountryViews = stats?.country_summary?.reduce((sum, c) => sum + c.count, 0) || 1

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

        {/* ── Visual Analytics Section (SVG Charts & Geolocation) ─────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Daily Activity Chart Card */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Activity className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-bold">Daily Page Views (Last 7 Days)</h2>
              <span className="ml-auto text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">Activity Trend</span>
            </div>
            
            <div className="w-full flex items-center justify-center py-2">
              {activityData.length > 0 ? (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1={chartPadding} y1={chartPadding} x2={chartWidth - chartPadding} y2={chartPadding} stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-gray-800" strokeWidth="1" />
                  <line x1={chartPadding} y1={(chartHeight) / 2} x2={chartWidth - chartPadding} y2={(chartHeight) / 2} stroke="#E2E8F0" strokeDasharray="3 3" className="dark:stroke-gray-800" strokeWidth="1" />
                  <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="#94A3B8" className="dark:stroke-gray-700" strokeWidth="1.5" />
                  
                  {/* Grid Line Y-Axis labels */}
                  <text x={chartPadding - 10} y={chartPadding + 4} textAnchor="end" className="text-[10px] font-semibold fill-gray-400 dark:fill-gray-500">{maxViews}</text>
                  <text x={chartPadding - 10} y={(chartHeight) / 2 + 4} textAnchor="end" className="text-[10px] font-semibold fill-gray-400 dark:fill-gray-500">{Math.round(maxViews / 2)}</text>
                  <text x={chartPadding - 10} y={chartHeight - chartPadding + 4} textAnchor="end" className="text-[10px] font-semibold fill-gray-400 dark:fill-gray-500">0</text>
                  
                  {/* Area fill */}
                  <path d={fillPathD} fill="url(#chart-grad)" />
                  
                  {/* Line */}
                  <path d={linePathD} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Dots & Labels */}
                  {chartPoints.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="4" 
                        fill="#FFFFFF" 
                        stroke="#4F46E5" 
                        strokeWidth="2.5" 
                        className="transition-all hover:r-6 hover:fill-[#4F46E5]" 
                      />
                      {/* Tooltip on hover */}
                      <rect 
                        x={p.x - 22} 
                        y={p.y - 30} 
                        width="44" 
                        height="20" 
                        rx="6" 
                        fill="#0F172A" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" 
                      />
                      <text 
                        x={p.x} 
                        y={p.y - 16} 
                        textAnchor="middle" 
                        className="text-[10px] font-bold fill-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                      >
                        {p.views}
                      </text>
                      
                      {/* X Axis Labels */}
                      <text 
                        x={p.x} 
                        y={chartHeight - chartPadding + 18} 
                        textAnchor="middle" 
                        className="text-[9px] font-semibold fill-gray-400 dark:fill-gray-500"
                      >
                        {p.date.substring(5)}
                      </text>
                    </g>
                  ))}
                </svg>
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs">No daily activity data recorded yet</div>
              )}
            </div>
          </div>
          
          {/* Geolocation Country breakdown */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Globe className="h-5 w-5 text-blue-500" />
              <h2 className="text-base font-bold">Top Countries (Visitor Geolocation)</h2>
              <span className="ml-auto text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full font-medium">Locations Map</span>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              {stats?.country_summary && stats.country_summary.length > 0 ? (
                stats.country_summary.map((c, i) => {
                  const pct = Math.round((c.count / totalCountryViews) * 100)
                  return (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {c.country}
                        </span>
                        <span className="text-gray-450">{c.count} views ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs">No location records tracked yet</div>
              )}
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
                  <th className="pb-3">Location</th>
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
                      <td className="py-3 text-xs text-gray-500 dark:text-gray-400">
                        {log.city && log.country ? `${log.city}, ${log.country}` : 'Localhost / Unknown'}
                      </td>
                      <td className="py-3 text-right text-xs text-gray-400 font-mono">{log.timestamp}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No user logins recorded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 4. Recent Page Views Log (Full Width) ───────────────────────── */}
        <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Eye className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-bold">Recent Page Views Log</h2>
            <span className="text-xs text-gray-400 font-normal ml-2">Real-time user visitor tracking</span>
            <span className="ml-auto text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full font-medium">Last 50 Views</span>
          </div>

          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">User Name</th>
                  <th className="pb-3">Email / Gmail ID</th>
                  <th className="pb-3">Path / Route</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3 text-right">Access Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {stats?.recent_page_views && stats.recent_page_views.length > 0 ? (
                  stats.recent_page_views.map((pv, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 font-medium">{pv.name || 'Anonymous Visitor'}</td>
                      <td className="py-3 text-gray-650 dark:text-gray-350">{pv.email || 'guest / not signed in'}</td>
                      <td className="py-3">
                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{pv.path}</span>
                      </td>
                      <td className="py-3 text-xs text-gray-500 dark:text-gray-400">
                        {pv.city && pv.country ? `${pv.city}, ${pv.country}` : 'Localhost / Unknown'}
                      </td>
                      <td className="py-3 text-right text-xs text-gray-400 font-mono">{pv.timestamp}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No page views recorded yet</td>
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
