'use client'

import { useState, useRef } from 'react'
import { MessageSquare, Clock, Save, Trash2, LogOut, Upload, FileText, ChevronLeft } from 'lucide-react'
import type { View } from './AppShell'

interface SidebarProps {
  user: { name: string; email: string }
  view: View
  setView: (v: View) => void
  pdfName: string | null
  pdfPages: number
  wordCount: number
  archiveCount: number
  onPdfLoad: (name: string, pages: number, words: number, chunks: string[]) => void
  onSave: () => void
  onClear: () => void
  onLogout: () => void
  hasMessages: boolean
  open: boolean
  setOpen: (v: boolean) => void
}

function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function Sidebar({
  user, view, setView, pdfName, pdfPages, wordCount,
  archiveCount, onPdfLoad, onSave, onClear, onLogout, hasMessages, open, setOpen,
}: SidebarProps) {
  const [dragging, setDragging] = useState(false)
  const [saveToast, setSaveToast] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const firstName = user.name.split(' ')[0]

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    
    try {
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      // data = { chunks, page_count, filename }
      const approxWords = data.page_count * 250;
      onPdfLoad(data.filename, data.page_count, approxWords, data.chunks);
    } catch (err) {
      console.error(err);
      alert(`Upload failed. (Targeting: ${apiUrl}). Ensure your NEXT_PUBLIC_API_URL is correct on Render.`);
    }
  };

  const handleSave = () => {
    if (!hasMessages) return
    onSave()
    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 2500)
  }

  if (!open) {
    return (
      <div className="flex flex-col items-center py-5 gap-3 border-r"
        style={{ width: 60, background: '#FFFFFF', borderColor: '#E4DEFF' }}>
        <button onClick={() => setOpen(true)} className="p-2 rounded-xl transition-colors"
          style={{ color: '#7C3AED' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F3EEFF')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <button onClick={() => setView('chat')}
          className={`p-2.5 rounded-xl transition-colors ${view === 'chat' ? 'nav-item-active' : 'nav-item-inactive'}`}>
          <MessageSquare size={16} />
        </button>
        <button onClick={() => setView('history')}
          className={`p-2.5 rounded-xl transition-colors ${view === 'history' ? 'nav-item-active' : 'nav-item-inactive'}`}>
          <Clock size={16} />
        </button>
      </div>
    )
  }

  return (
    <aside className="flex flex-col border-r overflow-hidden transition-all duration-300"
      style={{ width: 272, minWidth: 272, background: '#FFFFFF', borderColor: '#E4DEFF' }}>

      {/* Brand */}
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <div>
          <div className="font-display text-2xl mb-0.5" style={{ color: '#0F0A1E' }}>
            🧠 DocMind
          </div>
          <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#B0A8D0' }}>
            AI PDF Assistant
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#C4B5FD' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#7C3AED')}
          onMouseLeave={e => (e.currentTarget.style.color = '#C4B5FD')}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <Divider />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* User card */}
        <div className="mx-4 mb-4 rounded-2xl px-4 py-3.5"
          style={{ background: 'linear-gradient(135deg,#EDE9FF,#E0F2FE)', border: '1.5px solid #C4B5FD' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#8080B0' }}>
            Signed in as
          </div>
          <div className="font-bold text-sm mb-0.5" style={{ color: '#0F0A1E' }}>{firstName}</div>
          <div className="text-xs truncate" style={{ color: '#8080B0' }}>{user.email}</div>
        </div>

        {/* Navigation */}
        <SectionLabel text="Navigation" />
        <div className="mx-4 mb-3 flex flex-col gap-2">
          {([
            { icon: MessageSquare, label: 'Chat', key: 'chat' },
            { icon: Clock,         label: `History${archiveCount ? ` (${archiveCount})` : ''}`, key: 'history' },
          ] as const).map(({ icon: Icon, label, key }) => (
            <button key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all duration-150 ${view === key ? 'nav-item-active' : 'nav-item-inactive'}`}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <Divider className="mx-4" />

        {/* Actions */}
        <SectionLabel text="Actions" />
        <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
          <ActionBtn icon={<Save size={14} />} label="Save" onClick={handleSave} disabled={!hasMessages} />
          <ActionBtn icon={<Trash2 size={14} />} label="Clear" onClick={onClear} disabled={!hasMessages} variant="danger" />
        </div>

        {saveToast && (
          <div className="mx-4 mb-2 rounded-xl px-4 py-2.5 text-sm font-semibold animate-fade-up"
            style={{ background: '#E0F9F6', border: '1.5px solid #67E8D8', color: '#0E7469' }}>
            ✅ Chat saved!
          </div>
        )}

        <Divider className="mx-4" />

        {/* Document upload */}
        <SectionLabel text="Document" />
        <div className="mx-4 mb-3">
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => handleFile(e.target.files?.[0] || null)} />

          <div
            className={`upload-zone p-5 text-center cursor-pointer transition-all rounded-2xl${dragging ? ' drag-over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          >
            <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#4338CA)' }}>
              <Upload size={18} className="text-white" />
            </div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#5B21B6' }}>
              {pdfName ? 'Replace PDF' : 'Upload PDF'}
            </p>
            <p className="text-xs" style={{ color: '#B0A8D0' }}>Click or drag & drop</p>
          </div>

          {/* Doc stats */}
          {pdfName && (
            <div className="mt-3 rounded-2xl p-3.5"
              style={{ background: '#F3EEFF', border: '1.5px solid #C4B5FD' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <FileText size={14} style={{ color: '#5B21B6', flexShrink: 0 }} />
                <span className="text-xs font-bold truncate" style={{ color: '#5B21B6' }}>
                  {pdfName.length > 24 ? pdfName.slice(0, 24) + '…' : pdfName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatMini val={String(pdfPages)} label="Pages" color="#5B21B6" />
                <StatMini val={fmtNum(wordCount)} label="Words" color="#0EA5E9" />
              </div>
            </div>
          )}
        </div>
      </div>

      <Divider className="mx-4" />

      {/* Sign out */}
      <div className="mx-4 mb-3">
        <button onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
          style={{ color: '#E11D48', background: '#FFF0F3', border: '1.5px solid #FECDD3' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FFE4E6')}
          onMouseLeave={e => (e.currentTarget.style.background = '#FFF0F3')}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      <div className="pb-5 text-center text-xs font-bold tracking-widest uppercase"
        style={{ color: '#D4C8FF' }}>
        DOCMIND AI · v2.0
      </div>
    </aside>
  )
}

function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px my-3 ${className}`} style={{ background: '#EDE9FE' }} />
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="px-4 mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#B0A8D0' }}>
      {text}
    </div>
  )
}

function ActionBtn({
  icon, label, onClick, disabled, variant,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'danger'
}) {
  const base = variant === 'danger'
    ? { bg: '#FFF0F3', color: '#E11D48', border: '#FECDD3', hoverBg: '#FFE4E6' }
    : { bg: '#F3EEFF', color: '#5B21B6', border: '#C4B5FD', hoverBg: '#EDE9FE' }

  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: base.bg, color: base.color, border: `1.5px solid ${base.border}` }}
      onMouseEnter={e => !disabled && ((e.currentTarget as HTMLElement).style.background = base.hoverBg)}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = base.bg)}>
      {icon}
      {label}
    </button>
  )
}

function StatMini({ val, label, color }: { val: string; label: string; color: string }) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: '#fff', border: '1px solid #DDD6FE' }}>
      <div className="text-base font-extrabold" style={{ color }}>{val}</div>
      <div className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: '#8080B0', fontSize: '0.62rem' }}>
        {label}
      </div>
    </div>
  )
}
