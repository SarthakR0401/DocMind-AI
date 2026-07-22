'use client'

import { useState, useRef, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatView from '@/components/ChatView'
import HistoryView from '@/components/HistoryView'
import OnboardingTour from '@/components/OnboardingTour'
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
  expiry_hours?: number | null
  workspace_id?: string | null
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
  const [showTour, setShowTour] = useState(false)

  // Custom compliance, expiry, workspaces and settings states
  const [expiryHours, setExpiryHours] = useState<number | null>(null)
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string }>>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [ocrEngine, setOcrEngine] = useState<'tesseract' | 'ocrspace'>('tesseract')
  const [ocrApiKey, setOcrApiKey] = useState('')
  const [currentUserName, setCurrentUserName] = useState(user.name)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Local settings modal temporary form states
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'security' | 'preferences'>('profile')
  const [tempName, setTempName] = useState('')
  const [tempOldPassword, setTempOldPassword] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [tempPasswordConfirm, setTempPasswordConfirm] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showTempPassword, setShowTempPassword] = useState(false)
  const [showTempPasswordConfirm, setShowTempPasswordConfirm] = useState(false)
  const [showSetupPassword, setShowSetupPassword] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEngine = localStorage.getItem('docmind_ocr_engine') as 'tesseract' | 'ocrspace' | null
      const storedKey = localStorage.getItem('docmind_ocr_apikey')
      if (storedEngine) setOcrEngine(storedEngine)
      if (storedKey) setOcrApiKey(storedKey)

      const storedAvatar = localStorage.getItem(`docmind_avatar_${user.email}`)
      if (storedAvatar) setAvatarUrl(storedAvatar)

      const storedName = localStorage.getItem(`docmind_username_${user.email}`)
      if (storedName) {
        setCurrentUserName(storedName)
      } else {
        setCurrentUserName(user.name)
      }
    }
  }, [user.email, user.name])

  useEffect(() => {
    if (showSettingsModal) {
      setTempName(currentUserName)
      setTempOldPassword('')
      setTempPassword('')
      setTempPasswordConfirm('')
      setSettingsMessage(null)
      setActiveSettingsTab('profile')
    }
  }, [showSettingsModal, currentUserName])

  useEffect(() => {
    if (user.email && !showSetup) {
      const tourDone = localStorage.getItem(`docmind_tour_completed_${user.email}`)
      if (tourDone !== 'true') {
        const timer = setTimeout(() => setShowTour(true), 600)
        return () => clearTimeout(timer)
      }
    }
  }, [user.email, showSetup])

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

  const handleDownloadMarkdown = () => {
    if (!messages.length) return
    const mdContent = messages.map(msg => {
      const role = msg.role === 'user' ? '### User' : '### DocMind AI'
      return `${role} (${msg.ts})\n\n${msg.content}\n\n`
    }).join('---\n\n')
    
    const title = pdfName ? `Chat Transcript - ${pdfName}` : "Chat Transcript"
    const finalMd = `# ${title}\nGenerated by DocMind AI on ${new Date().toLocaleDateString()}\n\n---\n\n${mdContent}`
    
    const blob = new Blob([finalMd], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${pdfName || 'chat'}-transcript.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadTxt = () => {
    if (!messages.length) return
    const txtContent = messages.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'DocMind AI'
      return `[${msg.ts}] ${role}: ${msg.content}\n`
    }).join('\n')
    
    const title = pdfName ? `Chat Transcript - ${pdfName}` : "Chat Transcript"
    const finalTxt = `${title}\nGenerated on ${new Date().toLocaleDateString()}\n\n${txtContent}`
    
    const blob = new Blob([finalTxt], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${pdfName || 'chat'}-transcript.txt`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

    const fetchWorkspaces = async () => {
      try {
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        
        const res = await fetch(`${apiUrl}/api/workspaces/${encodeURIComponent(user.email)}`)
        if (res.ok) {
          const data = await res.json()
          setWorkspaces(data)
        }
      } catch (err) {
        console.error("Failed to load workspaces:", err)
      }
    }

    if (user.email) {
      checkStatus()
      fetchChats()
      fetchWorkspaces()
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

  const firstName = currentUserName.split(' ')[0]

  const handleCreateWorkspace = async (name: string) => {
    const wsId = Date.now().toString()
    try {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const res = await fetch(`${apiUrl}/api/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wsId, name, email: user.email })
      })
      if (res.ok) {
        setWorkspaces(prev => [{ id: wsId, name }, ...prev])
        setActiveWorkspaceId(wsId)
      }
    } catch (err) {
      console.error("Failed to create workspace:", err)
    }
  }

  const handleDeleteWorkspace = async (id: string) => {
    try {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const res = await fetch(`${apiUrl}/api/workspaces/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setWorkspaces(prev => prev.filter(ws => ws.id !== id))
        if (activeWorkspaceId === id) {
          setActiveWorkspaceId(null)
          setMessages([])
          setPdfName(null)
          setPdfUrl(null)
        }
        const listRes = await fetch(`${apiUrl}/api/chats/${encodeURIComponent(user.email)}`)
        if (listRes.ok) {
          const data = await listRes.json()
          setChatArchive(data)
        }
      }
    } catch (err) {
      console.error("Failed to delete workspace:", err)
    }
  }

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
      chunks: chunks,
      expiry_hours: expiryHours,
      workspace_id: activeWorkspaceId
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
          user={{ name: currentUserName, email: user.email }}
          view={view}
          setView={(v) => { setView(v); if (window.innerWidth < 768) setSidebarOpen(false); }}
          pdfName={pdfName}
          pdfPages={pdfPages}
          wordCount={wordCount}
          archiveCount={activeWorkspaceId ? chatArchive.filter(s => s.workspace_id === activeWorkspaceId).length : chatArchive.length}
          onPdfLoad={handlePdfLoad}
          onSave={saveChat}
          onClear={clearChat}
          onLogout={onLogout}
          onStartTour={() => setShowTour(true)}
          hasMessages={messages.length > 0}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          expiryHours={expiryHours}
          setExpiryHours={setExpiryHours}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          setActiveWorkspaceId={setActiveWorkspaceId}
          onCreateWorkspace={handleCreateWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onOpenSettings={() => setShowSettingsModal(true)}
          avatarUrl={avatarUrl}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">

        {/* Top bar (Responsive) */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', opacity: 0.95, backdropFilter: 'blur(12px)', zIndex: 10 }}>

          <div data-tour="dashboard-overview" className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl transition-colors md:hidden"
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
               : activeWorkspaceId ? `Workspace — ${workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Folder'}`
               : `Good day, ${firstName}!`}
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-3">
            {view === 'chat' && (pdfName || activeWorkspaceId) && (
              <div data-tour="topbar-actions" className="flex items-center gap-1.5 md:gap-3">
                <button
                  onClick={handleShareChat}
                  disabled={messages.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 border border-[var(--border)] text-[var(--violet)] hover:bg-[var(--bg)] bg-[var(--surface)] shadow-sm"
                  title="Share Chat"
                >
                  <Share2 size={15} />
                  <span className="hidden sm:inline">Share</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={messages.length === 0}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 border border-[var(--border)] text-[var(--violet)] hover:bg-[var(--bg)] bg-[var(--surface)] shadow-sm cursor-pointer"
                    title="Export Chat Transcript"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">Export</span>
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl py-2 z-[60] animate-fade-up">
                      <button
                        onClick={() => {
                          handleDownloadPdf()
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[var(--bg)] text-[var(--text)] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        📄 Export as PDF Report
                      </button>
                      <button
                        onClick={() => {
                          handleDownloadMarkdown()
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[var(--bg)] text-[var(--text)] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        📝 Export as Markdown (.md)
                      </button>
                      <button
                        onClick={() => {
                          handleDownloadTxt()
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[var(--bg)] text-[var(--text)] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        ✏️ Export as Plain Text (.txt)
                      </button>
                    </div>
                  )}
                </div>

                {pdfUrl && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold transition-all border border-[var(--border)] text-[var(--violet)] hover:bg-[var(--bg)] bg-[var(--surface)] shadow-sm"
                    title={showPreview ? "Hide Preview" : "Show Preview"}
                  >
                    {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span className="hidden sm:inline">{showPreview ? "Hide Preview" : "Show Preview"}</span>
                  </button>
                )}
              </div>
            )}

            <button
              data-tour="theme-toggle"
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl transition-colors text-[var(--violet)] hover:bg-[var(--bg)]"
              style={{ color: 'var(--violet)' }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="hidden lg:flex text-xs font-bold tracking-widest uppercase items-center gap-1.5" style={{ color: 'var(--muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--violet)' }} />
              DocMind AI
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--violet)' }} />
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
              archive={activeWorkspaceId ? chatArchive.filter(s => s.workspace_id === activeWorkspaceId) : chatArchive}
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
              activeWorkspaceId={activeWorkspaceId}
              workspaceName={workspaces.find(w => w.id === activeWorkspaceId)?.name || null}
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
                  <div className="relative">
                    <input 
                      type={showSetupPassword ? "text" : "password"} 
                      value={setupData.password}
                      onChange={e => setSetupData({...setupData, password: e.target.value})}
                      placeholder="Min 6 characters"
                      className="w-full pl-5 pr-12 py-3 rounded-2xl border-2 border-[var(--bg)] focus:border-[var(--violet)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword(!showSetupPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors focus:outline-none flex items-center justify-center"
                      aria-label={showSetupPassword ? "Hide password" : "Show password"}
                    >
                      {showSetupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--surface)] border-[1.5px] border-[var(--border)] rounded-3xl max-w-3xl w-full shadow-2xl animate-fade-up relative overflow-hidden flex flex-col md:flex-row h-[90dvh] md:h-[600px]">
              
              {/* Close Button */}
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="absolute top-4 right-4 p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors hover:bg-[var(--bg)] rounded-xl cursor-pointer z-10"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Left sidebar - Tab navigation */}
              <div className="w-full md:w-[240px] bg-[var(--bg)] border-b md:border-b-0 md:border-r p-5 flex flex-col gap-1 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-display text-lg font-bold mb-4 text-[var(--text)] flex items-center gap-2 px-2">
                  ⚙️ Settings
                </h3>
                
                <button
                  onClick={() => { setActiveSettingsTab('profile'); setSettingsMessage(null); }}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                    activeSettingsTab === 'profile' 
                      ? 'bg-[var(--violet)] text-white shadow-sm' 
                      : 'text-[var(--text)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <span>👤</span> Account Profile
                </button>
                
                <button
                  onClick={() => { setActiveSettingsTab('security'); setSettingsMessage(null); }}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                    activeSettingsTab === 'security' 
                      ? 'bg-[var(--violet)] text-white shadow-sm' 
                      : 'text-[var(--text)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <span>🔒</span> Password & Security
                </button>
                
                <button
                  onClick={() => { setActiveSettingsTab('preferences'); setSettingsMessage(null); }}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                    activeSettingsTab === 'preferences' 
                      ? 'bg-[var(--violet)] text-white shadow-sm' 
                      : 'text-[var(--text)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <span>🔧</span> Preferences & OCR
                </button>
              </div>

              {/* Right Panel - Tab Content */}
              <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col bg-[var(--surface)]">
                
                {/* Global setting response message banner */}
                {settingsMessage && (
                  <div className={`mb-4 rounded-xl px-4 py-3 text-xs font-bold animate-fade-up border ${
                    settingsMessage.type === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}>
                    {settingsMessage.text}
                  </div>
                )}

                {/* 1. Account Profile Tab */}
                {activeSettingsTab === 'profile' && (
                  <div className="space-y-6 flex-1 flex flex-col justify-between animate-fade-up">
                    <div className="space-y-5">
                      <div>
                        <h4 className="font-display text-base font-bold text-[var(--text)] mb-1">Account Details</h4>
                        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Manage your personal details and visual avatar.</p>
                      </div>

                      {/* Avatar Editor */}
                      <div className="flex items-center gap-5 p-4 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--border)] shadow bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl select-none flex-shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span>{tempName ? tempName.slice(0,2).toUpperCase() : 'US'}</span>
                          )}
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <input 
                              type="file" 
                              accept="image/*" 
                              id="avatar-upload-input" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const reader = new FileReader()
                                  reader.onloadend = () => {
                                    const base64 = reader.result as string
                                    setAvatarUrl(base64)
                                    localStorage.setItem(`docmind_avatar_${user.email}`, base64)
                                    setSettingsMessage({ text: "Profile picture updated locally!", type: 'success' })
                                  }
                                  reader.readAsDataURL(file)
                                }
                              }}
                            />
                            <button
                              onClick={() => document.getElementById('avatar-upload-input')?.click()}
                              className="px-3 py-1.5 bg-[var(--violet)] text-white font-bold text-xs rounded-lg hover:bg-[var(--indigo)] transition-colors cursor-pointer"
                            >
                              Upload Photo
                            </button>
                            {avatarUrl && (
                              <button
                                onClick={() => {
                                  setAvatarUrl(null)
                                  localStorage.removeItem(`docmind_avatar_${user.email}`)
                                  setSettingsMessage({ text: "Profile picture removed.", type: 'success' })
                                }}
                                className="px-3 py-1.5 border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text)] font-bold text-xs rounded-lg transition-all cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Supports PNG or JPG. Max size 1MB.</p>
                        </div>
                      </div>

                      {/* Display Name Input */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--violet)] text-xs font-semibold"
                          placeholder="Your display name"
                        />
                      </div>

                      {/* Email Input (Disabled/Secure) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1">
                          <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                            Email Address
                          </label>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🔒 Primary Account ID
                          </span>
                        </div>
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] opacity-60 text-[var(--muted)] outline-none text-xs font-semibold select-none"
                          style={{ cursor: 'not-allowed' }}
                        />
                        <p className="text-[10px] mt-1 ml-1" style={{ color: 'var(--muted)' }}>
                          Email address is verified via SSO and cannot be modified.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!tempName.trim()) {
                          setSettingsMessage({ text: "Name cannot be empty.", type: 'error' })
                          return
                        }
                        try {
                          const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                          const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
                          const res = await fetch(`${apiUrl}/api/user/update`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: user.email, name: tempName })
                          })
                          if (res.ok) {
                            setCurrentUserName(tempName)
                            localStorage.setItem(`docmind_username_${user.email}`, tempName)
                            setSettingsMessage({ text: "Account profile updated successfully!", type: 'success' })
                          } else {
                            setSettingsMessage({ text: "Failed to update profile on database.", type: 'error' })
                          }
                        } catch (err) {
                          setSettingsMessage({ text: "Network error connecting to database.", type: 'error' })
                        }
                      }}
                      className="w-full py-3 bg-[var(--violet)] text-white font-bold text-xs rounded-xl hover:bg-[var(--indigo)] transition-colors mt-4 cursor-pointer"
                    >
                      Save Profile Changes
                    </button>
                  </div>
                )}

                {/* 2. Password & Security Tab */}
                {activeSettingsTab === 'security' && (
                  <div className="space-y-6 flex-1 flex flex-col justify-between animate-fade-up">
                    <div className="space-y-5">
                      <div>
                        <h4 className="font-display text-base font-bold text-[var(--text)] mb-1">Security & Credentials</h4>
                        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Update your local password for secure portal authentication.</p>
                      </div>

                      {/* Password inputs */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>
                          Current Password (Old Password)
                        </label>
                        <div className="relative">
                          <input
                            type={showOldPassword ? "text" : "password"}
                            value={tempOldPassword}
                            onChange={(e) => setTempOldPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--violet)] text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors focus:outline-none flex items-center justify-center"
                            aria-label={showOldPassword ? "Hide password" : "Show password"}
                          >
                            {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showTempPassword ? "text" : "password"}
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--violet)] text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTempPassword(!showTempPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors focus:outline-none flex items-center justify-center"
                            aria-label={showTempPassword ? "Hide password" : "Show password"}
                          >
                            {showTempPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showTempPasswordConfirm ? "text" : "password"}
                            value={tempPasswordConfirm}
                            onChange={(e) => setTempPasswordConfirm(e.target.value)}
                            placeholder="Repeat new password"
                            className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--violet)] text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTempPasswordConfirm(!showTempPasswordConfirm)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors focus:outline-none flex items-center justify-center"
                            aria-label={showTempPasswordConfirm ? "Hide password" : "Show password"}
                          >
                            {showTempPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!tempOldPassword) {
                          setSettingsMessage({ text: "Please enter your current old password first.", type: 'error' })
                          return
                        }
                        if (!tempPassword || tempPassword.length < 6) {
                          setSettingsMessage({ text: "Password must be at least 6 characters.", type: 'error' })
                          return
                        }
                        if (tempPassword !== tempPasswordConfirm) {
                          setSettingsMessage({ text: "Passwords do not match.", type: 'error' })
                          return
                        }
                        try {
                          const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                          const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
                          const res = await fetch(`${apiUrl}/api/user/update`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              email: user.email, 
                              name: currentUserName, 
                              password: tempPassword,
                              old_password: tempOldPassword 
                            })
                          })
                          if (res.ok) {
                            setTempOldPassword('')
                            setTempPassword('')
                            setTempPasswordConfirm('')
                            setSettingsMessage({ text: "Credential password updated successfully!", type: 'success' })
                          } else {
                            const data = await res.json().catch(() => ({}))
                            setSettingsMessage({ text: data.detail || "Failed to update password in database.", type: 'error' })
                          }
                        } catch (err) {
                          setSettingsMessage({ text: "Network error connecting to database.", type: 'error' })
                        }
                      }}
                      className="w-full py-3 bg-[var(--violet)] text-white font-bold text-xs rounded-xl hover:bg-[var(--indigo)] transition-colors mt-4 cursor-pointer"
                    >
                      Update Password
                    </button>
                  </div>
                )}

                {/* 3. Preferences & OCR Tab */}
                {activeSettingsTab === 'preferences' && (
                  <div className="space-y-6 flex-1 flex flex-col justify-between animate-fade-up">
                    <div className="space-y-5">
                      {/* Expiry */}
                      <div className="border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
                          Auto-Delete Lifespan
                        </label>
                        <p className="text-[10px] mb-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
                          Remove documents and chats from vector memory after target hours.
                        </p>
                        <select
                          value={expiryHours !== null ? expiryHours : 'never'}
                          onChange={(e) => {
                            const val = e.target.value
                            setExpiryHours(val === 'never' ? null : parseInt(val))
                          }}
                          className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--violet)] cursor-pointer"
                        >
                          <option value="never">Never (Persistent Storage)</option>
                          <option value="1">Delete after 1 Hour</option>
                          <option value="24">Delete after 24 Hours</option>
                        </select>
                      </div>

                      {/* OCR Engine */}
                      <div className="border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
                          OCR Processing Method
                        </label>
                        <p className="text-[10px] mb-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
                          Select default fallback engine for scanned image pages.
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <button
                            onClick={() => {
                              setOcrEngine('tesseract')
                              localStorage.setItem('docmind_ocr_engine', 'tesseract')
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              ocrEngine === 'tesseract' 
                                ? 'border-[var(--violet)] bg-[var(--violet)]/10 text-[var(--violet)]' 
                                : 'border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text)]'
                            }`}
                          >
                            Tesseract Local
                          </button>
                          <button
                            onClick={() => {
                              setOcrEngine('ocrspace')
                              localStorage.setItem('docmind_ocr_engine', 'ocrspace')
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              ocrEngine === 'ocrspace' 
                                ? 'border-[var(--violet)] bg-[var(--violet)]/10 text-[var(--violet)]' 
                                : 'border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text)]'
                            }`}
                          >
                            Cloud OCRspace
                          </button>
                        </div>
                        {ocrEngine === 'ocrspace' && (
                          <div className="animate-fade-up mt-2">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                              Cloud API Key
                            </label>
                            <input
                              type="text"
                              value={ocrApiKey}
                              onChange={(e) => {
                                const val = e.target.value
                                setOcrApiKey(val)
                                localStorage.setItem('docmind_ocr_apikey', val)
                              }}
                              placeholder="Enter API Key (Default: demo/helloworld)"
                              className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--violet)]"
                            />
                          </div>
                        )}
                      </div>

                      {/* Compliance Statement */}
                      <div className="rounded-xl px-3 py-2.5 text-[10px] flex items-start gap-2.5 border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 leading-normal">
                        <span className="text-base flex-shrink-0">🛡️</span>
                        <span>
                          <strong>HIPAA & GDPR Encryption Standards</strong>: Documents processed memory-only, database chunks AES encrypted, and never shared for LLM fine-tuning.
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowSettingsModal(false)}
                      className="w-full py-3 border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text)] font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Close Settings Panel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Tour Overlay */}
        <OnboardingTour
          isOpen={showTour}
          onClose={() => setShowTour(false)}
          userEmail={user.email}
          onEnsureSidebarOpen={() => setSidebarOpen(true)}
          onEnsureViewChat={() => setView('chat')}
        />
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
