'use client'

import { Eye, Play, Trash2, Archive } from 'lucide-react'
import type { ChatSession } from './AppShell'

interface HistoryViewProps {
  archive: ChatSession[]
  onView: (idx: number) => void
  onContinue: (idx: number) => void
  onDelete: (idx: number) => void
}

export default function HistoryView({ archive, onView, onContinue, onDelete }: HistoryViewProps) {
  if (!archive.length) {
    return (
      <div className="h-full overflow-y-auto px-6 py-8 page-enter">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h2 className="font-display text-3xl mb-1" style={{ color: '#0F0A1E' }}>Chat History</h2>
            <p className="text-sm" style={{ color: '#8080B0' }}>Your saved conversations will appear here.</p>
          </div>

          <div className="rounded-3xl p-14 text-center"
            style={{ background: '#FFFFFF', border: '1.5px solid #E4DEFF', boxShadow: '0 4px 24px rgba(91,33,182,0.07)' }}>
            <div className="text-5xl mb-5 select-none animate-float">🗂️</div>
            <h3 className="font-display text-2xl mb-2" style={{ color: '#0F0A1E' }}>No saved chats yet</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#6B6B99', maxWidth: 320, margin: '0 auto' }}>
              Save a conversation with the Save button, or it auto-saves when you switch documents.
            </p>
          </div>

          {/* Tips */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '💾', title: 'Manual save', desc: 'Click the Save button in the sidebar at any time to preserve your chat.' },
              { icon: '🔄', title: 'Auto-save', desc: 'Your chat saves automatically when you upload a new document.' },
            ].map(({ icon, title, desc }, i) => (
              <div key={i} className="rounded-2xl p-5"
                style={{ background: '#FFFFFF', border: '1.5px solid #E4DEFF' }}>
                <div className="text-2xl mb-3">{icon}</div>
                <div className="font-bold text-sm mb-1" style={{ color: '#0F0A1E' }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: '#6B6B99' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const reversed = [...archive].reverse()

  return (
    <div className="h-full overflow-y-auto px-6 py-8 page-enter">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-3xl mb-1" style={{ color: '#0F0A1E' }}>Chat History</h2>
            <p className="text-sm" style={{ color: '#8080B0' }}>{archive.length} saved session{archive.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: '#EDE9FF', border: '1.5px solid #C4B5FD' }}>
            <Archive size={14} style={{ color: '#5B21B6' }} />
            <span className="text-xs font-bold" style={{ color: '#5B21B6' }}>{archive.length}</span>
          </div>
        </div>

        <div className="space-y-3">
          {reversed.map((session, i) => {
            const realIdx = archive.length - 1 - i
            const preview = session.messages[0]?.content?.slice(0, 110) + '…'
            return (
              <div key={session.id}
                className="rounded-2xl p-5 transition-all duration-200 group"
                style={{ background: '#FFFFFF', border: '1.5px solid #E4DEFF', boxShadow: '0 3px 16px rgba(91,33,182,0.06)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#C4B5FD'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(91,33,182,0.14)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#E4DEFF'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 3px 16px rgba(91,33,182,0.06)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">📄</span>
                      <span className="font-bold text-sm truncate" style={{ color: '#0F0A1E' }}>
                        {session.pdf}
                      </span>
                    </div>
                    <div className="text-xs mb-2" style={{ color: '#B0A8D0' }}>
                      {session.timestamp} · {session.count} Q&amp;A{session.count !== 1 ? 's' : ''} · {session.email}
                    </div>
                    <div className="text-sm italic leading-relaxed line-clamp-2" style={{ color: '#8080B0' }}>
                      "{preview}"
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => onView(realIdx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: '#F3EEFF', color: '#5B21B6', border: '1.5px solid #DDD6FE' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#EDE9FE')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#F3EEFF')}>
                      <Eye size={12} /> View
                    </button>
                    <button onClick={() => onContinue(realIdx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-white"
                      style={{ background: 'linear-gradient(135deg,#7C3AED,#4338CA)', boxShadow: '0 3px 10px rgba(91,33,182,0.25)' }}>
                      <Play size={12} /> Resume
                    </button>
                    <button onClick={() => onDelete(realIdx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: '#FFF0F3', color: '#E11D48', border: '1.5px solid #FECDD3' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FFE4E6')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#FFF0F3')}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
