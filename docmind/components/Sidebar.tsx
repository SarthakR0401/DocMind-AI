'use client'

import { useState, useRef } from 'react'
import { MessageSquare, Clock, Save, Trash2, LogOut, Upload, FileText, ChevronLeft, Compass } from 'lucide-react'
import type { View } from './AppShell'

interface SidebarProps {
  user: { name: string; email: string }
  view: View
  setView: (v: View) => void
  pdfName: string | null
  pdfPages: number
  wordCount: number
  archiveCount: number
  onPdfLoad: (name: string, pages: number, words: number, chunks: string[], url: string) => void
  onSave: () => void
  onClear: () => void
  onLogout: () => void
  onStartTour?: () => void
  hasMessages: boolean
  open: boolean
  setOpen: (v: boolean) => void
}

function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function Sidebar({
  user, view, setView, pdfName, pdfPages, wordCount,
  archiveCount, onPdfLoad, onSave, onClear, onLogout, onStartTour, hasMessages, open, setOpen,
}: SidebarProps) {
  const [dragging, setDragging] = useState(false)
  const [saveToast, setSaveToast] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const firstName = user.name.split(' ')[0]

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadingSize, setUploadingSize] = useState<string | null>(null)

  const handleFile = (file: File | null) => {
    if (!file) return;
    
    // Calculate size
    const size = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${(file.size / 1024).toFixed(0)} KB`;
    setUploadingSize(size);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiUrl}/api/upload`);

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      setUploadingSize(null);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        const approxWords = data.page_count * 250;
        const url = URL.createObjectURL(file);
        onPdfLoad(data.filename, data.page_count, approxWords, data.chunks, url);
      } else {
        const err = JSON.parse(xhr.responseText || '{}');
        alert(`Upload failed!\nStatus: ${xhr.status} ${err.detail || 'Internal Server Error'}\nURL: ${apiUrl}`);
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setUploadingSize(null);
      alert("Network error. Could not reach the backend.");
    };

    xhr.send(formData);
  };

  const handleSave = () => {
    if (!hasMessages) return
    onSave()
    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 2500)
  }

  if (!open) {
    return (
      <div className="hidden md:flex flex-col items-center py-5 gap-3 border-r"
        style={{ width: 60, background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <button onClick={() => setOpen(true)} className="p-2 rounded-xl transition-colors text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]">
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
        {onStartTour && (
          <button onClick={onStartTour} title="Take Product Tour"
            className="p-2.5 rounded-xl transition-colors text-[var(--violet)] hover:bg-[var(--bg)]">
            <Compass size={16} />
          </button>
        )}
      </div>
    )
  }

  return (
    <aside className="flex flex-col h-full border-r overflow-hidden"
      style={{ width: 272, minWidth: 272, background: 'var(--surface)', borderColor: 'var(--border)' }}>

      {/* Brand */}
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <div>
          <div className="font-display text-2xl font-bold mb-0.5 tracking-tight" style={{ color: 'var(--text)' }}>
            🧠 DocMind
          </div>
          <div className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            AI PDF Assistant
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg transition-colors text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]">
          <ChevronLeft size={16} />
        </button>
      </div>

      <Divider />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* User card */}
        <div data-tour="user-profile" className="mx-4 mb-4 rounded-2xl px-4 py-3.5 shadow-sm"
          style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
            Signed in as
          </div>
          <div className="font-bold text-sm mb-0.5" style={{ color: 'var(--text)' }}>{firstName}</div>
          <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user.email}</div>
        </div>

        {/* Navigation */}
        <SectionLabel text="Navigation" />
        <div data-tour="nav-menu" className="mx-4 mb-3 flex flex-col gap-2">
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
        <div data-tour="sidebar-actions" className="mx-4 mb-3 grid grid-cols-2 gap-2">
          <ActionBtn icon={<Save size={14} />} label="Save" onClick={handleSave} disabled={!hasMessages} />
          <ActionBtn icon={<Trash2 size={14} />} label="Clear" onClick={onClear} disabled={!hasMessages} variant="danger" />
        </div>

        {saveToast && (
          <div className="mx-4 mb-2 rounded-xl px-4 py-2.5 text-xs font-bold animate-fade-up border"
            style={{ background: 'rgba(13, 148, 136, 0.1)', borderColor: '#0D9488', color: '#0D9488' }}>
            ✅ Chat saved!
          </div>
        )}

        <Divider className="mx-4" />

        {/* Document upload */}
        <SectionLabel text="Document" />
        <div data-tour="upload-zone" className="mx-4 mb-3">
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => handleFile(e.target.files?.[0] || null)} />

          <div
            className={`upload-zone p-5 text-center cursor-pointer transition-all rounded-2xl${dragging ? ' drag-over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          >
            <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--violet), var(--indigo))' }}>
              <Upload size={18} />
            </div>
            {uploadProgress !== null ? (
              <div className="w-full px-2">
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--violet)' }}>
                  Uploading ({uploadingSize})...
                </p>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ background: 'var(--violet)', width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] mt-1 font-bold" style={{ color: 'var(--muted)' }}>{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
                  {pdfName ? 'Replace PDF' : 'Upload PDF'}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Click or drag & drop</p>
              </>
            )}
          </div>

          {/* Doc stats */}
          {pdfName && (
            <div className="mt-3 rounded-2xl p-3.5 shadow-sm"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <FileText size={14} style={{ color: 'var(--violet)', flexShrink: 0 }} />
                <span className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                  {pdfName.length > 24 ? pdfName.slice(0, 24) + '…' : pdfName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatMini val={String(pdfPages)} label="Pages" color="var(--violet)" />
                <StatMini val={fmtNum(wordCount)} label="Words" color="var(--sky)" />
              </div>
            </div>
          )}
        </div>
      </div>

      <Divider className="mx-4" />

      {/* Take Tour & Sign out */}
      <div className="mx-4 mb-3 space-y-2">
        {onStartTour && (
          <button data-tour="restart-tour" onClick={onStartTour}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all hover:bg-[var(--surface)]"
            style={{ color: 'var(--violet)', background: 'var(--bg)', border: '1.5px solid var(--border)' }}>
            <Compass size={16} />
            Take Product Tour
          </button>
        )}
        <button onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all"
          style={{ color: '#F43F5E', background: 'rgba(244, 63, 94, 0.08)', border: '1.5px solid rgba(244, 63, 94, 0.2)' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      <div className="pb-5 text-center text-[10px] font-extrabold tracking-widest uppercase"
        style={{ color: 'var(--muted)' }}>
        DOCMIND AI · v2.0
      </div>
    </aside>
  )
}

function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px my-3 ${className}`} style={{ background: 'var(--border)' }} />
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="px-4 mb-2 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
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
  const isDanger = variant === 'danger'

  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: isDanger ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg)',
        color: isDanger ? '#F43F5E' : 'var(--text)',
        border: isDanger ? '1.5px solid rgba(244, 63, 94, 0.2)' : '1.5px solid var(--border)'
      }}>
      {icon}
      {label}
    </button>
  )
}

function StatMini({ val, label, color }: { val: string; label: string; color: string }) {
  return (
    <div className="rounded-xl p-2.5 shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-base font-extrabold" style={{ color }}>{val}</div>
      <div className="text-[10px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
    </div>
  )
}
