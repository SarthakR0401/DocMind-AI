'use client'

import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatView from '@/components/ChatView'
import HistoryView from '@/components/HistoryView'
import { Sun, Moon } from 'lucide-react'

export type View = 'chat' | 'history' | 'archived'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

export interface ChatSession {
  id: string
  pdf: string
  email: string
  name: string
  timestamp: string
  messages: Message[]
  count: number
}

interface AppShellProps {
  user: { name: string; email: string }
  onLogout: () => void
}

export default function AppShell({ user, onLogout }: AppShellProps) {
  const [view, setView] = useState<View>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [chunks, setChunks] = useState<string[]>([])
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfPages, setPdfPages] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [chatArchive, setChatArchive] = useState<ChatSession[]>([])
  const [archivedIdx, setArchivedIdx] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [setupData, setSetupData] = useState({ name: '', password: '' })

  useEffect(() => {
    const saved = localStorage.getItem('docmind-theme')
    if (saved === 'dark') setIsDark(true)
    
    // Check if user needs setup (simple local check for demo)
    const isSetupDone = localStorage.getItem(`setup-done-${user.email}`)
    if (!isSetupDone) {
      setShowSetup(true)
    }
  }, [user.email])

  useEffect(() => {
    localStorage.setItem('docmind-theme', isDark ? 'dark' : 'light')
  }, [isDark])


  const firstName = user.name.split(' ')[0]

  const saveChat = () => {
    if (!messages.length) return
    const session: ChatSession = {
      id: Date.now().toString(),
      pdf: pdfName || 'Untitled',
      email: user.email,
      name: user.name,
      timestamp: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: [...messages],
      count: messages.filter(m => m.role === 'user').length,
    }
    setChatArchive(prev => [...prev, session])
  }

  const clearChat = () => {
    setMessages([])
  }

  const handlePdfLoad = (name: string, pages: number, words: number, textChunks: string[], url: string) => {
    saveChat()
    setPdfName(name)
    setPdfUrl(url)
    setPdfPages(pages)
    setWordCount(words)
    setChunks(textChunks)
    setMessages([])
    setView('chat')
  }

  const handleViewArchived = (idx: number) => {
    setArchivedIdx(idx)
    setView('archived')
  }

  const handleContinueArchived = (idx: number) => {
    const session = chatArchive[idx]
    setMessages([...session.messages])
    setChatArchive(prev => prev.filter((_, i) => i !== idx))
    setView('chat')
  }

  const handleDeleteArchived = (idx: number) => {
    setChatArchive(prev => prev.filter((_, i) => i !== idx))
    if (view === 'archived') setView('history')
  }

  return (
    <div className={`flex h-screen overflow-hidden relative ${isDark ? 'dark' : ''}`} style={{ background: 'var(--bg)' }}>


      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Adaptive Positioning */}
      <div className={`
        fixed inset-y-0 left-0 z-50 md:relative md:z-auto transition-transform duration-300
        flex flex-col h-full
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          user={user}
          view={view}
          setView={(v) => { setView(v); if (window.innerWidth < 768) setSidebarOpen(false); }}
          pdfName={pdfName}
          pdfPages={pdfPages}
          wordCount={wordCount}
          archiveCount={chatArchive.length}
          onPdfLoad={handlePdfLoad}
          onSave={saveChat}
          onClear={clearChat}
          onLogout={onLogout}
          hasMessages={messages.length > 0}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', opacity: 0.95, backdropFilter: 'blur(12px)' }}>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: '#8080B0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F3EEFF')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg" style={{ color: 'var(--text)' }}>
              {view === 'history' ? 'Chat History'
               : view === 'archived' ? 'Archived Chat'
               : pdfName ? `Chat — ${pdfName.length > 30 ? pdfName.slice(0,30)+'…' : pdfName}`
               : `Good day, ${firstName}!`}
            </h1>
          </div>
          
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--violet)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="text-xs font-bold tracking-widest uppercase flex items-center gap-1.5"
            style={{ color: '#C4B5FD' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
            DocMind AI
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
          </div>
        </div>

        {/* View router */}
        <div className="flex-1 overflow-hidden">
          {view === 'history' && (
            <HistoryView
              archive={chatArchive}
              onView={handleViewArchived}
              onContinue={handleContinueArchived}
              onDelete={handleDeleteArchived}
            />
          )}
          {view === 'archived' && archivedIdx !== null && (
            <ArchivedView
              session={chatArchive[archivedIdx]}
              onBack={() => setView('history')}
              onContinue={() => handleContinueArchived(archivedIdx)}
            />
          )}
          {(view === 'chat') && (
            <ChatView
              messages={messages}
              setMessages={setMessages}
              chunks={chunks}
              pdfName={pdfName}
              pdfUrl={pdfUrl}
              firstName={firstName}
            />
          )}
        </div>

        {/* Profile Setup Modal */}
        {showSetup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
            <div className="bg-[var(--surface)] border-[1.5px] border-[var(--border)] rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-up">
              <div className="text-4xl mb-4 text-center">🎉</div>
              <h2 className="font-display text-2xl text-center mb-2" style={{ color: 'var(--text)' }}>Complete your profile</h2>
              <p className="text-sm text-center mb-6" style={{ color: 'var(--muted)' }}>
                Just a few more details to get you started with DocMind.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>Your Name</label>
                  <input 
                    type="text" 
                    value={setupData.name}
                    onChange={e => setSetupData({...setupData, name: e.target.value})}
                    placeholder="Enter your name"
                    className="w-full px-5 py-3 rounded-2xl border-2 border-[var(--bg)] focus:border-[var(--violet)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>Create Password</label>
                  <input 
                    type="password" 
                    value={setupData.password}
                    onChange={e => setSetupData({...setupData, password: e.target.value})}
                    placeholder="Min 6 characters"
                    className="w-full px-5 py-3 rounded-2xl border-2 border-[var(--bg)] focus:border-[var(--violet)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (setupData.name && setupData.password) {
                      try {
                        const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                        const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
                        
                        const res = await fetch(`${apiUrl}/api/auth/signup`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            email: user.email, 
                            password: setupData.password, 
                            name: setupData.name 
                          })
                        })
                        
                        if (res.ok) {
                          localStorage.setItem(`setup-done-${user.email}`, 'true')
                          setShowSetup(false)
                          alert('Profile completed! You can now also login with your email and password.')
                        } else {
                          const data = await res.json()
                          alert(data.detail || 'Setup failed')
                        }
                      } catch (err) {
                        alert('Network error connecting to backend')
                      }
                    } else {
                      alert('Please fill all fields')
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, var(--violet2), var(--indigo))' }}
                >
                  Finish Setup
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  )
}

// ── Archived chat view ─────────────────────────────────────────────────────
function ArchivedView({ session, onBack, onContinue }: {
  session: ChatSession
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="h-full flex flex-col page-enter">
      <div className="px-6 pt-5 pb-3">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold mb-4 transition-colors"
          style={{ color: '#7C3AED' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#5B21B6')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7C3AED')}
        >
          ← Back to History
        </button>
        <div className="rounded-2xl px-5 py-3 mb-2"
          style={{ background: '#EDE9FF', border: '1.5px solid #C4B5FD' }}>
          <p className="text-sm font-semibold" style={{ color: '#5B21B6' }}>
            📄 <strong>{session.pdf}</strong> &nbsp;·&nbsp; {session.timestamp} &nbsp;·&nbsp; {session.count} Q&amp;As (read-only)
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
        {session.messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
      </div>

      <div className="px-6 pb-6">
        <button onClick={onContinue}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all duration-200"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#4338CA)', boxShadow: '0 6px 22px rgba(91,33,182,0.28)' }}>
          ▶ Continue this chat
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div>
          <div className="bubble-user">{msg.content}</div>
          <div className="text-xs mt-1 text-right" style={{ color: '#B0A8D0' }}>{msg.ts}</div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: 'linear-gradient(135deg,#7C3AED,#0EA5E9)', boxShadow: '0 4px 14px rgba(91,33,182,0.28)' }}>
        🧠
      </div>
      <div>
        <div className="bubble-ai">{msg.content}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
            style={{ background: '#EDE9FF', border: '1px solid #C4B5FD', color: '#5B21B6', fontSize: '0.65rem' }}>
            from doc
          </span>
          <span className="text-xs" style={{ color: '#B0A8D0' }}>{msg.ts}</span>
        </div>
      </div>
    </div>
  )
}
