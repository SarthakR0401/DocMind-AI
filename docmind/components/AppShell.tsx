'use client'

import { useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatView from '@/components/ChatView'
import HistoryView from '@/components/HistoryView'

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
  const [pdfPages, setPdfPages] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [chatArchive, setChatArchive] = useState<ChatSession[]>([])
  const [archivedIdx, setArchivedIdx] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  const handlePdfLoad = (name: string, pages: number, words: number, textChunks: string[]) => {
    saveChat()
    setPdfName(name)
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
    <div className="flex h-screen overflow-hidden relative" style={{ background: '#F8F6FF' }}>

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
          style={{ borderColor: '#E4DEFF', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}>
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
            <h1 className="font-display text-lg" style={{ color: '#0F0A1E' }}>
              {view === 'history' ? 'Chat History'
               : view === 'archived' ? 'Archived Chat'
               : pdfName ? `Chat — ${pdfName.length > 30 ? pdfName.slice(0,30)+'…' : pdfName}`
               : `Good day, ${firstName}!`}
            </h1>
          </div>
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
              firstName={firstName}
            />
          )}
        </div>
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
