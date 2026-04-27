'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Brain, Zap, MessageSquare } from 'lucide-react'
import type { Message } from './AppShell'
import ReactMarkdown from 'react-markdown'

interface ChatViewProps {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  chunks: string[]
  pdfName: string | null
  firstName: string
}

export default function ChatView({ messages, setMessages, chunks, pdfName, firstName }: ChatViewProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
    
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, chunks, history: messages }),
      });
      
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer, ts: data.ts }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, there was an error communicating with the server.", ts: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }]);
    } finally {
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
            <h2 className="font-display text-3xl mb-1.5" style={{ color: '#0F0A1E' }}>
              Good day, {firstName}!
            </h2>
            <p className="text-sm" style={{ color: '#8080B0' }}>
              Upload a PDF to get started — DocMind will do the rest.
            </p>
          </div>

          {/* Empty state card */}
          <div className="rounded-3xl p-10 text-center mb-8"
            style={{ background: '#FFFFFF', border: '1.5px solid #E4DEFF', boxShadow: '0 4px 24px rgba(91,33,182,0.07)' }}>
            <div className="text-5xl mb-5 select-none animate-float">📂</div>
            <h3 className="font-display text-2xl mb-2" style={{ color: '#0F0A1E' }}>No document loaded</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#6B6B99', maxWidth: 300, margin: '0 auto' }}>
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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 max-w-4xl w-full mx-auto">
        <div className="space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className="animate-fade-up">
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div>
                    <div className="bubble-user">{msg.content}</div>
                    <div className="text-xs mt-1.5 text-right" style={{ color: '#B0A8D0' }}>{msg.ts}</div>
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
                      <span className="text-xs" style={{ color: '#B0A8D0' }}>{msg.ts}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

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
  <div className="px-6 pb-5 pt-3 max-w-4xl w-full mx-auto">
    <div className="flex gap-3 items-end rounded-2xl p-3"
      style={{ background: '#FFFFFF', border: '2px solid #E4DEFF', boxShadow: '0 4px 20px rgba(91,33,182,0.08)' }}>
      <textarea
        ref={ref}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Ask anything about your document…  (Enter to send, Shift+Enter for newline)"
        className="flex-1 resize-none text-sm outline-none bg-transparent leading-relaxed"
        style={{
          color: '#0F0A1E',
          fontFamily: 'var(--font-outfit)',
          maxHeight: 120,
          minHeight: 24,
        }}
      />
      <button
        onClick={onSubmit}
        disabled={loading || !input.trim()}
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg,#7C3AED,#4338CA)',
          boxShadow: '0 4px 14px rgba(91,33,182,0.28)',
          color: '#fff',
        }}>
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Send size={16} />}
      </button>
    </div>
    <p className="text-center mt-2 text-xs" style={{ color: '#B0A8D0' }}>
      Powered by Groq LPU · DocMind AI · Responses based on document context only
    </p>
  </div>
))

InputBar.displayName = 'InputBar'
