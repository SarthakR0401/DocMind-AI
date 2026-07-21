'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { Sun, Moon, Copy, Check, ExternalLink, Download } from 'lucide-react'
import { SharePageSkeleton } from '@/components/Skeleton'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

interface ChatSession {
  id: string
  pdf: string
  email?: string
  name?: string
  timestamp: string
  messages: Message[]
  count: number
  pdf_pages?: number
  word_count?: number
}

export default function SharePage() {
  const params = useParams()
  const id = params?.id as string

  const [session, setSession] = useState<ChatSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('docmind-theme')
    if (savedTheme === 'dark') {
      setIsDark(true)
    }

    if (!id) return

    const fetchSession = async () => {
      try {
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        
        const res = await fetch(`${apiUrl}/api/chats/session/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("This shared conversation does not exist or has been deleted.")
          }
          throw new Error("Failed to load shared conversation.")
        }
        const data = await res.json()
        setSession(data)
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.")
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [id])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('docmind-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('docmind-theme', 'light')
    }
  }, [isDark])

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(index)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleDownloadPdf = () => {
    if (!session || !session.messages.length) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert("Please allow popups to download the PDF")
      return
    }

    const chatTitle = session.pdf ? `Chat Transcript - ${session.pdf}` : "Chat Transcript"
    
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
            inList = true
            prefix = '<ul>'
          }
          return `${prefix}<li>${bulletMatch[1]}</li>`
        } else {
          let prefix = ''
          if (inList) {
            inList = false
            prefix = '</ul>'
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

    const messagesHtml = session.messages.map(msg => {
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
              <div class="meta-item"><strong>Document:</strong> ${session.pdf || 'N/A'}</div>
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

  if (loading) {
    return <SharePageSkeleton />
  }

  if (error || !session) {
    return (
      <div className={`h-[100dvh] flex flex-col items-center justify-center p-6 text-center animate-fade-in ${isDark ? 'bg-[#0F0A1E] text-white' : 'bg-[#F8F6FF] text-[#0F0A1E]'}`}>
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="font-display text-2xl font-bold mb-2">Conversation Not Found</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-6">{error || "This conversation could not be loaded."}</p>
        <a href="/" className="px-6 py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-violet-600 to-indigo-600 transition-all hover:shadow-lg">
          Go to DocMind AI
        </a>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden animate-fade-in ${isDark ? 'dark bg-[#0F0A1E]' : 'bg-[#F8F6FF]'}`}>
      
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b bg-[var(--surface)] border-[var(--border)] z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <div>
            <h1 className="font-display text-base md:text-lg font-bold" style={{ color: 'var(--text)' }}>
              DocMind AI
            </h1>
            <p className="text-[10px] font-bold text-[#C4B5FD] uppercase tracking-wider hidden sm:block">
              Shared Chat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#C4B5FD] text-[#7C3AED] hover:bg-[#F3EEFF] transition-all bg-[var(--surface)]"
            title="Copy Share Link"
          >
            {copiedLink ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span>{copiedLink ? "Copied" : "Copy Link"}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#C4B5FD] text-[#7C3AED] hover:bg-[#F3EEFF] transition-all bg-[var(--surface)]"
            title="Download as PDF"
          >
            <Download size={14} />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl transition-colors text-[var(--violet)] hover:bg-[var(--bg)]"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Main body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 pb-20 w-full max-w-4xl mx-auto custom-scrollbar">
        <div className="space-y-6">
          
          {/* Metadata Card */}
          <div className="rounded-2xl p-5 border bg-[var(--surface)] border-[var(--border)] shadow-sm animate-fade-up">
            <h2 className="font-bold text-xs uppercase tracking-widest text-[#B0A8D0] mb-3">
              Conversation Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#B0A8D0]">Document</div>
                <div className="font-bold text-sm truncate" style={{ color: 'var(--text)' }} title={session.pdf}>
                  📄 {session.pdf}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#B0A8D0]">Shared On</div>
                <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                  📅 {session.timestamp}
                </div>
              </div>
              {session.word_count && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#B0A8D0]">Length</div>
                  <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                    📖 {session.pdf_pages || 1} Pages / {session.word_count >= 1000 ? `${(session.word_count / 1000).toFixed(1)}k` : session.word_count} Words
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="space-y-5">
            {session.messages.map((msg, i) => (
              <div key={i} className="animate-fade-up">
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] min-w-[40px]">
                      <div className="bubble-user">{msg.content}</div>
                      <div className="flex items-center justify-end gap-2 mt-1.5">
                        <button
                          onClick={() => handleCopyMessage(msg.content, i)}
                          className="p-1 rounded hover:bg-white/10 text-[#B0A8D0] transition-colors"
                          title="Copy message"
                        >
                          {copiedIdx === i ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        </button>
                        <span className="text-xs" style={{ color: '#B0A8D0' }}>{msg.ts}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                      style={{ background: 'linear-gradient(135deg,#7C3AED,#0EA5E9)', boxShadow: '0 4px 14px rgba(91,33,182,0.28)' }}>
                      🧠
                    </div>
                    <div>
                      <div className="bubble-ai markdown-body">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
                          style={{ background: '#EDE9FF', border: '1px solid #C4B5FD', color: '#5B21B6', fontSize: '0.62rem' }}>
                          from doc
                        </span>
                        <button
                          onClick={() => handleCopyMessage(msg.content, i)}
                          className="p-1 rounded hover:bg-violet-100 text-[#B0A8D0] hover:text-[#7C3AED] transition-colors"
                          title="Copy message"
                        >
                          {copiedIdx === i ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                        </button>
                        <span className="text-xs" style={{ color: '#B0A8D0' }}>{msg.ts}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* CTA Footer overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t flex justify-center bg-[var(--surface)] border-[var(--border)]" style={{ opacity: 0.98, backdropFilter: 'blur(8px)' }}>
        <a
          href="/"
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #4338CA)', boxShadow: '0 4px 14px rgba(91,33,182,0.35)' }}
        >
          <span>Chat with your own PDFs for Free</span>
          <ExternalLink size={16} />
        </a>
      </div>

    </div>
  )
}
