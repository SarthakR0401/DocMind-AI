'use client'

import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatView from '@/components/ChatView'
import HistoryView from '@/components/HistoryView'
import { Sun, Moon, Share2, Download, Eye, EyeOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

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
  pdf_pages?: number
  word_count?: number
  chunks?: string[]
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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [setupData, setSetupData] = useState({ name: '', password: '' })
  const [showPreview, setShowPreview] = useState(true)
  const [shareToast, setShareToast] = useState(false)

  const handleShareChat = async () => {
    if (!messages.length) return
    await saveChat()
    const sessionId = activeSessionId || Date.now().toString()
    const shareUrl = `${window.location.origin}/share/${sessionId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Chat Transcript — ${pdfName || 'Untitled'}`,
          text: `Check out my DocMind AI conversation transcript about ${pdfName || 'the document'}:`,
          url: shareUrl
        })
        return
      } catch (err) {
        console.log("Web share API failed, copying link...")
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    } catch (err) {
      alert(`Share link:\n${shareUrl}`)
    }
  }

  const handleDownloadPdf = () => {
    if (!messages.length) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert("Please allow popups to download the PDF")
      return
    }

    const chatTitle = pdfName ? `Chat Transcript - ${pdfName}` : "Chat Transcript"
    
    const formatMarkdown = (markdown: string) => {
      let html = markdown
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

      html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${code.trim()}</code></pre>`
      })

      html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
      html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')

      const lines = html.split('\n')
      let inList = false
      const processedLines = lines.map(line => {
        const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/)
        if (bulletMatch) {
          let prefix = ''
          if (!inList) {
            inList = true;
            prefix = '<ul>';
          }
          return `${prefix}<li>${bulletMatch[1]}</li>`
        } else {
          let prefix = ''
          if (inList) {
            inList = false;
            prefix = '</ul>';
          }
          return prefix + line
        }
      })
      if (inList) {
        processedLines.push('</ul>')
      }
      html = processedLines.join('\n')
      html = html.replace(/\n/g, '<br>')
      return html
    }

    const messagesHtml = messages.map(msg => {
      const isUser = msg.role === 'user'
      const roleLabel = isUser ? 'User' : 'DocMind AI'
      const bubbleClass = isUser ? 'user-message' : 'ai-message'
      const htmlContent = formatMarkdown(msg.content)
      
      return `
        <div class="message-container ${isUser ? 'user-container' : 'ai-container'}">
          <div class="message-header">
            <span class="message-role">${roleLabel}</span>
            <span class="message-time">${msg.ts}</span>
          </div>
          <div class="message-bubble ${bubbleClass}">
            ${htmlContent}
          </div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>${chatTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            body {
               font-family: 'Outfit', sans-serif;
               color: #0F0A1E;
               background: #FFFFFF;
               padding: 40px;
               max-width: 800px;
               margin: 0 auto;
               line-height: 1.6;
            }
            .header {
               border-bottom: 2px solid #E4DEFF;
               padding-bottom: 20px;
               margin-bottom: 30px;
               display: flex;
               justify-content: space-between;
               align-items: center;
            }
            .brand {
               font-size: 24px;
               font-weight: 800;
               color: #7C3AED;
            }
            .meta {
               text-align: right;
               font-size: 12px;
               color: #6B6B99;
            }
            .meta-item {
               margin-bottom: 4px;
            }
            .title {
               font-size: 18px;
               font-weight: 700;
               margin-bottom: 20px;
               color: #0F0A1E;
            }
            .message-container {
               margin-bottom: 24px;
               page-break-inside: avoid;
            }
            .message-header {
               display: flex;
               align-items: center;
               gap: 8px;
               margin-bottom: 6px;
               font-size: 12px;
            }
            .message-role {
               font-weight: 700;
               text-transform: uppercase;
               letter-spacing: 0.05em;
            }
            .user-container .message-role {
               color: #4338CA;
            }
            .ai-container .message-role {
               color: #0D9488;
            }
            .message-time {
               color: #B0A8D0;
            }
            .message-bubble {
               padding: 14px 20px;
               border-radius: 12px;
               font-size: 14px;
            }
            .user-message {
               background-color: #F3EEFF;
               border: 1px solid #E4DEFF;
            }
            .ai-message {
               background-color: #F0FDFA;
               border: 1px solid #CCFBF1;
            }
            .footer {
               margin-top: 50px;
               border-top: 1px solid #E4DEFF;
               padding-top: 15px;
               text-align: center;
               font-size: 11px;
               color: #B0A8D0;
            }
            p { margin: 0 0 10px 0; }
            p:last-child { margin-bottom: 0; }
            ul, ol { margin: 0 0 10px 20px; padding: 0; }
            li { margin-bottom: 4px; }
            code {
               font-family: monospace;
               background: rgba(0,0,0,0.05);
               padding: 2px 4px;
               border-radius: 4px;
               font-size: 13px;
            }
            pre {
               background: #1F2937;
               color: #F9FAFB;
               padding: 12px;
               border-radius: 8px;
               overflow-x: auto;
               margin: 10px 0;
            }
            pre code {
               background: transparent;
               color: inherit;
               padding: 0;
            }
            blockquote {
               border-left: 4px solid #7C3AED;
               margin: 10px 0;
               padding-left: 15px;
               color: #6B6B99;
               font-style: italic;
            }
            @media print {
               body {
                 padding: 20px 0;
               }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">🧠 DocMind AI</div>
              <div style="font-size: 12px; color: #6B6B99; font-weight: 600;">AI-POWERED PDF ASSISTANT</div>
            </div>
            <div class="meta">
              <div class="meta-item"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div class="meta-item"><strong>Document:</strong> ${pdfName || 'N/A'}</div>
            </div>
          </div>
          
          <div class="title">Chat Conversation Transcript</div>
          
          <div class="messages">
            ${messagesHtml}
          </div>
          
          <div class="footer">
            Generated by DocMind AI · Responses are based on document context only.
          </div>
          
          <script>
            document.fonts.ready.then(() => {
              window.print();
              setTimeout(() => {
                window.close();
              }, 500);
            });
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  useEffect(() => {
    const saved = localStorage.getItem('docmind-theme')
    if (saved === 'dark') setIsDark(true)
    
    // Check if user needs setup from backend
    const checkStatus = async () => {
      try {
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        
        console.log(`Checking status for ${user.email} at ${apiUrl}`);
        
        const res = await fetch(`${apiUrl}/api/auth/status/${encodeURIComponent(user.email)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json()
        console.log("Status check result:", data);
        
        if (!data.registered) {
          setShowSetup(true)
        }
      } catch (err) {
        console.error("Status check failed:", err)
      }
    }

    const fetchChats = async () => {
      try {
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        
        const res = await fetch(`${apiUrl}/api/chats/${encodeURIComponent(user.email)}`)
        if (res.ok) {
          const data = await res.json()
          setChatArchive(data)
        }
      } catch (err) {
        console.error("Failed to load chat history:", err)
      }
    }

    if (user.email) {
      checkStatus()
      fetchChats()
    }
  }, [user.email])

  useEffect(() => {
    const handleToggle = () => setSidebarOpen(prev => !prev)
    window.addEventListener('toggle-sidebar', handleToggle)
    
    const checkMobile = () => {
      if (window.innerWidth < 768) setSidebarOpen(false)
    }
    checkMobile()
    
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  const firstName = user.name.split(' ')[0]

  const saveChat = async (customMessages?: Message[]) => {
    const msgsToSave = customMessages || messages;
    if (!msgsToSave.length) return
    
    const sessionId = activeSessionId || Date.now().toString();
    if (!activeSessionId) setActiveSessionId(sessionId);

    const session: ChatSession = {
      id: sessionId,
      pdf: pdfName || 'Untitled',
      email: user.email,
      name: user.name,
      timestamp: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: [...msgsToSave],
      count: msgsToSave.filter(m => m.role === 'user').length,
      pdf_pages: pdfPages,
      word_count: wordCount,
      chunks: chunks
    }

    try {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const res = await fetch(`${apiUrl}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      })
      if (res.ok) {
        const listRes = await fetch(`${apiUrl}/api/chats/${encodeURIComponent(user.email)}`)
        if (listRes.ok) {
          const data = await listRes.json()
          setChatArchive(data)
        }
      }
    } catch (err) {
      console.error("Failed to save chat to database:", err)
    }
  }

  const clearChat = () => {
    setMessages([])
    setActiveSessionId(null) // Clear active session ID
  }

  const handlePdfLoad = (name: string, pages: number, words: number, textChunks: string[], url: string) => {
    saveChat()
    setPdfName(name)
    setPdfUrl(url)
    setPdfPages(pages)
    setWordCount(words)
    setChunks(textChunks)
    setMessages([])
    setActiveSessionId(Date.now().toString()) // Start a new session ID!
    setView('chat')
  }

  const handleViewArchived = (idx: number) => {
    setArchivedIdx(idx)
    setView('archived')
  }

  const handleContinueArchived = async (idx: number) => {
    const session = chatArchive[idx]
    
    // Load session states
    setMessages([...session.messages])
    setPdfName(session.pdf)
    setPdfUrl(null) // No local preview blob for restored session
    setPdfPages(session.pdf_pages || 0)
    setWordCount(session.word_count || 0)
    setChunks(session.chunks || [])
    setActiveSessionId(session.id) // Keep the same session ID so we update it in-place
    
    setChatArchive(prev => prev.filter((_, i) => i !== idx))
    setView('chat')
  }

  const handleDeleteArchived = async (idx: number) => {
    const session = chatArchive[idx]
    try {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const res = await fetch(`${apiUrl}/api/chats/${session.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setChatArchive(prev => prev.filter((_, i) => i !== idx))
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err)
    }
    if (view === 'archived') setView('history')
  }

  return (
    <div className={`flex h-[100dvh] overflow-hidden relative ${isDark ? 'dark' : ''}`} style={{ background: 'var(--bg)' }}>


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

        {/* Top bar (Responsive) */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', opacity: 0.95, backdropFilter: 'blur(12px)', zIndex: 10 }}>

          <div className="flex items-center gap-3">
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
            <h1 className="font-display text-sm md:text-lg truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-none" style={{ color: 'var(--text)' }}>
              {view === 'history' ? 'Chat History'
               : view === 'archived' ? 'Archived Chat'
               : pdfName ? `Chat — ${pdfName.length > 20 ? pdfName.slice(0,20)+'…' : pdfName}`
               : `Good day, ${firstName}!`}
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-3">
            {view === 'chat' && pdfName && (
              <>
                <button
                  onClick={handleShareChat}
                  disabled={messages.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 border border-[#C4B5FD] text-[#7C3AED] hover:bg-[#F3EEFF]"
                  title="Share Chat"
                >
                  <Share2 size={15} />
                  <span className="hidden sm:inline">Share</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={messages.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 border border-[#C4B5FD] text-[#7C3AED] hover:bg-[#F3EEFF]"
                  title="Download PDF"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">PDF</span>
                </button>

                {pdfUrl && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold transition-all border border-[#C4B5FD] text-[#7C3AED] hover:bg-[#F3EEFF]"
                    title={showPreview ? "Hide Preview" : "Show Preview"}
                  >
                    {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span className="hidden sm:inline">{showPreview ? "Hide Preview" : "Show Preview"}</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl transition-colors text-[var(--violet)] hover:bg-[var(--bg)]"
              style={{ color: 'var(--violet)' }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="hidden lg:flex text-xs font-bold tracking-widest uppercase items-center gap-1.5 text-[#C4B5FD]">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
              DocMind AI
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
            </div>
          </div>
        </div>

        {shareToast && (
          <div className="absolute top-16 right-6 z-[60] rounded-2xl px-5 py-3 text-sm font-bold shadow-xl animate-fade-up border bg-[#E0F9F6] border-[#67E8D8] text-[#0E7469]">
            ✅ Share link copied to clipboard!
          </div>
        )}

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
              onSave={saveChat}
              showPreview={showPreview}
              setShowPreview={setShowPreview}
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
        <div className="bubble-ai markdown-body">
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
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
