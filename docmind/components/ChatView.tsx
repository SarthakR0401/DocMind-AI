'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Brain, Zap, MessageSquare, Copy, Check } from 'lucide-react'
import type { Message } from './AppShell'
import ReactMarkdown from 'react-markdown'

interface ChatViewProps {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  chunks: string[]
  pdfName: string | null
  pdfUrl: string | null
  firstName: string
  onSave?: (customMessages?: Message[]) => void
  showPreview: boolean
  setShowPreview: (show: boolean) => void
}

export default function ChatView({ 
  messages, 
  setMessages, 
  chunks, 
  pdfName, 
  pdfUrl, 
  firstName, 
  onSave,
  showPreview,
  setShowPreview
}: ChatViewProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(index)
    setTimeout(() => setCopiedIdx(null), 2000)
  }
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const checkSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // On mobile, hide preview by default if it was just loaded
      if (mobile && messages.length === 0) {
        // setShowPreview(false) 
      }
    }
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [messages.length])

  useEffect(() => {
    // Small delay ensures DOM has rendered new message height
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const handleSubmit = async (q?: string) => {
    const question = typeof q === 'string' ? q : input;
    if (!question.trim()) return;

    setLoading(true);
    setInput('');
    
    const userMsg: Message = {
      role: 'user',
      content: question,
      ts: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
    
    const updatedUserMessages = [...messages, userMsg];
    setMessages(updatedUserMessages);
    
    // Auto-save the user message immediately
    if (onSave) {
      onSave(updatedUserMessages);
    }

    try {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, chunks, history: messages }),
      });
      
      if (!res.ok) throw new Error("API failed");

      // Initialize the assistant message
      const aiMsg: Message = { 
        role: "assistant", 
        content: "", 
        ts: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
      };
      setMessages(prev => [...prev, aiMsg]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        setLoading(false); // Stop loading indicator once stream starts
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          fullContent += chunk;
          
          // Update the last message (the assistant one) with new content
          setMessages(prev => {
            const newMsgs = [...prev];
            const last = newMsgs[newMsgs.length - 1];
            if (last && last.role === 'assistant') {
              last.content = fullContent;
            }
            return newMsgs;
          });
        }

        // Auto-save the complete conversation once streaming finishes
        if (onSave) {
          const finalMessages = [...updatedUserMessages, {
            role: "assistant" as const,
            content: fullContent,
            ts: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          }];
          onSave(finalMessages);
        }
      }
    } catch (err) {
      console.error(err);
      const errorResponseMsg: Message = { 
        role: "assistant", 
        content: "Sorry, there was an error communicating with the server.", 
        ts: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
      };
      const finalErrorMessages = [...updatedUserMessages, errorResponseMsg];
      setMessages(finalErrorMessages);
      if (onSave) {
        onSave(finalErrorMessages);
      }
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ── No document loaded ─────────────────────────────────────────────
  if (!pdfName) {
    return (
      <div className="h-full flex flex-col overflow-y-auto page-enter">
        <div className="flex-1 px-6 py-8 max-w-4xl w-full mx-auto">

          {/* Welcome heading */}
          <div className="mb-8">
            <h2 className="font-display text-3xl mb-1.5" style={{ color: 'var(--text)' }}>
              Good day, {firstName}!
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Upload a PDF to get started — DocMind will do the rest.
            </p>
          </div>

          {/* Empty state card */}
          <div className="rounded-3xl p-10 text-center mb-8"
            style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', boxShadow: '0 4px 24px rgba(91,33,182,0.07)' }}>
            <div className="text-5xl mb-5 select-none animate-float">📂</div>
            <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--text)' }}>No document loaded</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)', maxWidth: 300, margin: '0 auto' }}>
              Upload a PDF using the sidebar panel to start chatting with your document.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                bg: '#EDE9FF', tc: '#5B21B6', bc: '#C4B5FD', icon: '🧠',
                title: 'Semantic Q&A',
                desc: 'Ask anything — DocMind finds the exact answer from your document.',
              },
              {
                bg: '#E0F9F6', tc: '#0E7469', bc: '#67E8D8', icon: '⚡',
                title: 'Instant Answers',
                desc: 'No waiting. Responses are generated in seconds using Groq\'s LPU.',
              },
              {
                bg: '#FFF7ED', tc: '#92400E', bc: '#FCD34D', icon: '💬',
                title: 'Chat History',
                desc: 'All your sessions are saved. Resume any conversation anytime.',
              },
            ].map(({ bg, tc, bc, icon, title, desc }, i) => (
              <div key={i} className="rounded-2xl p-6 transition-transform hover:-translate-y-0.5"
                style={{ background: bg, border: `1.5px solid ${bc}` }}>
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-bold text-sm mb-1.5" style={{ color: tc }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: '#6B6B99' }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-8 rounded-3xl p-6"
            style={{ background: '#FFFFFF', border: '1.5px solid #E4DEFF' }}>
            <h3 className="font-display text-lg mb-4" style={{ color: '#0F0A1E' }}>How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: '01', label: 'Upload your PDF', desc: 'Drag & drop or click to select any PDF file.' },
                { step: '02', label: 'DocMind reads it', desc: 'AI processes and indexes your document instantly.' },
                { step: '03', label: 'Ask anything', desc: 'Get precise, context-aware answers in seconds.' },
              ].map(({ step, label, desc }, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg,#7C3AED,#4338CA)', color: '#fff' }}>
                    {step}
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-0.5" style={{ color: '#0F0A1E' }}>{label}</div>
                    <div className="text-xs" style={{ color: '#8080B0' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Document loaded, no messages yet ──────────────────────────────
  if (!messages.length && !loading) {
    return (
      <div className="h-full flex flex-col page-enter">
        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl w-full mx-auto">
          <div className="mb-6">
            <h2 className="font-display text-3xl mb-1.5" style={{ color: '#0F0A1E' }}>
              Ready to chat, {firstName}!
            </h2>
          </div>
          <div className="rounded-3xl p-10 text-center mb-6"
            style={{ background: '#FFFFFF', border: '1.5px solid #E4DEFF', boxShadow: '0 4px 24px rgba(91,33,182,0.07)' }}>
            <div className="text-5xl mb-5 select-none animate-float">👋</div>
            <h3 className="font-display text-2xl mb-2" style={{ color: '#0F0A1E' }}>Your document is loaded</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#6B6B99', maxWidth: 300, margin: '0 auto' }}>
              Type your first question below and DocMind will answer based on the document content.
            </p>
          </div>

          {/* Suggested questions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#B0A8D0' }}>Try asking</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Summarize this document',
                'What are the key findings?',
                'List the main topics covered',
                'What conclusions are drawn?',
              ].map(q => (
                <button key={q}
                  onClick={() => handleSubmit(q)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: '#F3EEFF', color: '#5B21B6', border: '1.5px solid #C4B5FD' }}
                  onMouseEnter={e => {
                    (e.currentTarget).style.background = '#EDE9FE'
                    ;(e.currentTarget).style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget).style.background = '#F3EEFF'
                    ;(e.currentTarget).style.transform = 'translateY(0)'
                  }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
        <InputBar input={input} setInput={setInput} onSubmit={handleSubmit} loading={loading} onKeyDown={onKeyDown} ref={textareaRef} />
      </div>
    )
  }

  // ── Active chat ────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-[var(--bg)]">
      <div className={`flex-1 flex overflow-hidden ${showPreview && !isMobile ? 'flex-row' : 'flex-col'}`}>
        
        {/* PDF Previewer Pane - Desktop/Tablet */}
        {showPreview && pdfUrl && !isMobile && (
          <div className="w-full md:w-1/2 lg:w-[45%] h-full border-r bg-[var(--surface)] p-2 md:p-4 transition-all duration-300 animate-slide-in-left" style={{ borderColor: 'var(--border)' }}>
            <div className="w-full h-full rounded-2xl overflow-hidden border-2 shadow-inner relative flex flex-col" style={{ borderColor: 'var(--border)' }}>
              <div className="p-2 border-b flex justify-between items-center bg-gray-50/50" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight ml-2">Document Preview</span>
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  title="Open in full screen"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
              <iframe 
                src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`} 
                className="w-full flex-1"
                title="PDF Preview"
              />
            </div>
          </div>
        )}

        {/* Mobile Drawer Preview */}
        {isMobile && pdfUrl && (
          <>
            <div 
              className={`pdf-drawer-backdrop ${showPreview ? 'pdf-drawer-backdrop-open' : ''}`} 
              onClick={() => setShowPreview(false)} 
            />
            <div className={`pdf-drawer ${showPreview ? 'pdf-drawer-open' : 'pdf-drawer-closed'}`}>
              <div className="pdf-drawer-handle" onClick={() => setShowPreview(false)} />
              <div className="px-4 pb-2 flex justify-between items-center border-b mb-2" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Document Preview</h3>
                <div className="flex gap-2">
                  <a 
                    href={pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-[#F3EEFF] text-[#7C3AED] rounded-lg border border-[#C4B5FD]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                  <button 
                    onClick={() => setShowPreview(false)}
                    className="p-2 bg-[#F3EEFF] text-[#7C3AED] rounded-lg border border-[#C4B5FD]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden px-2 pb-4">
                <iframe 
                  src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`} 
                  className="w-full h-full rounded-xl border border-[var(--border)]"
                  title="PDF Preview"
                />
              </div>
            </div>
          </>
        )}

        {/* Chat Pane */}
        <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${showPreview && !isMobile ? 'md:w-1/2 lg:w-[55%]' : 'w-full'}`}>
          {/* Messages - Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 pb-4 w-full max-w-4xl mx-auto">
            <div className="space-y-5 pb-10">
              {/* Start Date Badge */}
              <div className="flex justify-center mb-8">
                <span className="px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
                  style={{ background: '#FFFFFF', border: '1.2px solid #E4DEFF', color: '#8080B0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  Conversation started on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {messages.map((msg, i) => {
                // Don't render assistant message if it's empty (still streaming)
                if (msg.role === 'assistant' && !msg.content) return null;

                return (
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
                )
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-start gap-3 animate-fade-up">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: 'linear-gradient(135deg,#7C3AED,#0EA5E9)', boxShadow: '0 4px 14px rgba(91,33,182,0.28)' }}>
                    🧠
                  </div>
                  <div className="bubble-ai flex items-center gap-1.5 py-3.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <InputBar input={input} setInput={setInput} onSubmit={handleSubmit} loading={loading} onKeyDown={onKeyDown} ref={textareaRef} />
        </div>
      </div>
    </div>
  )
}

// ── Input bar ──────────────────────────────────────────────────────────────
import React from 'react'

const InputBar = React.forwardRef<HTMLTextAreaElement, {
  input: string
  setInput: (v: string) => void
  onSubmit: () => void
  loading: boolean
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}>(({ input, setInput, onSubmit, loading, onKeyDown }, ref) => (
  <div data-tour="chat-input" className="p-4 safe-bottom">
    <div className="max-w-4xl mx-auto relative group">
      <textarea
        ref={ref}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask DocMind anything..."
        className="w-full pl-6 pr-14 py-4 bg-white border-2 border-transparent focus:border-[#7C3AED] rounded-2xl shadow-xl focus:outline-none resize-none transition-all duration-300 text-[15px]"
        style={{ 
          boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.1), 0 8px 10px -6px rgba(124, 58, 237, 0.1)'
        }}
      />
      <button
        onClick={onSubmit}
        disabled={loading || !input.trim()}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Send size={18} />}
      </button>
    </div>
    <p className="text-center mt-2 text-xs" style={{ color: '#B0A8D0' }}>
      Powered by Groq LPU · DocMind AI · Responses based on document context only
    </p>
  </div>
))

InputBar.displayName = 'InputBar'
