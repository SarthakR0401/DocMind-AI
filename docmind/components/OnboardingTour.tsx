'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronLeft, X, CheckCircle2 } from 'lucide-react'

export interface TourStep {
  target: string // e.g. '[data-tour="dashboard-overview"]'
  title: string
  description: string
  icon?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: 'openSidebar' | 'viewChat'
}

interface OnboardingTourProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  onEnsureSidebarOpen?: () => void
  onEnsureViewChat?: () => void
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="dashboard-overview"]',
    title: 'Welcome to DocMind AI 🧠',
    description: 'Your intelligent AI PDF assistant powered by Llama 3.3. Analyze long documents, summarize chapters, and ask questions in real-time.',
    icon: '🚀',
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-menu"]',
    title: 'Sidebar Navigation 🧭',
    description: 'Easily switch between active document chat and your saved Chat History archive with complete transcript access.',
    icon: '📑',
    placement: 'right',
    action: 'openSidebar',
  },
  {
    target: '[data-tour="upload-zone"]',
    title: 'Upload Documents 📄',
    description: 'Drag & drop or click to upload any PDF document. DocMind extracts text automatically and indexes it for rapid AI retrieval.',
    icon: '📤',
    placement: 'right',
    action: 'openSidebar',
  },
  {
    target: '[data-tour="sidebar-actions"]',
    title: 'Primary Actions & Export 💾',
    description: 'Save chat sessions to your database history, clear active chats, export transcripts to formatted PDFs, or generate shareable links.',
    icon: '⚡',
    placement: 'right',
    action: 'openSidebar',
  },
  {
    target: '[data-tour="chat-input"]',
    title: 'Interactive Q&A & Preview 💬',
    description: 'Type questions and press Enter to query your PDF context. Toggle side-by-side document preview on desktop or mobile.',
    icon: '💡',
    placement: 'top',
    action: 'viewChat',
  },
  {
    target: '[data-tour="user-profile"]',
    title: 'Profile, Theme & Re-taking Tour 👤',
    description: 'Check account details, toggle dark mode, or click "Take Tour" anytime in the sidebar to re-run this onboarding guide!',
    icon: '✨',
    placement: 'right',
    action: 'openSidebar',
  },
]

export default function OnboardingTour({
  isOpen,
  onClose,
  userEmail,
  onEnsureSidebarOpen,
  onEnsureViewChat,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const updateTargetRect = useCallback(() => {
    if (!isOpen) return

    const step = TOUR_STEPS[currentStep]
    if (!step) return

    // Execute step action if needed (e.g. open sidebar or view chat)
    if (step.action === 'openSidebar' && onEnsureSidebarOpen) {
      onEnsureSidebarOpen()
    } else if (step.action === 'viewChat' && onEnsureViewChat) {
      onEnsureViewChat()
    }

    // Small delay to allow CSS transitions / DOM updates
    setTimeout(() => {
      const el = document.querySelector(step.target)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)
      } else {
        setTargetRect(null)
      }
    }, 150)
  }, [currentStep, isOpen, onEnsureSidebarOpen, onEnsureViewChat])

  useEffect(() => {
    if (isOpen) {
      updateTargetRect()
      window.addEventListener('resize', updateTargetRect)
      window.addEventListener('scroll', updateTargetRect, true)
      return () => {
        window.removeEventListener('resize', updateTargetRect)
        window.removeEventListener('scroll', updateTargetRect, true)
      }
    }
  }, [isOpen, currentStep, updateTargetRect])

  // Calculate tooltip position relative to spotlight target rect
  useEffect(() => {
    if (!isOpen) return

    const step = TOUR_STEPS[currentStep]
    const margin = 14
    const tooltipWidth = Math.min(360, window.innerWidth - 32)
    const tooltipHeight = 240 // estimated max height

    if (!targetRect) {
      // Center fallback
      setTooltipPos({
        top: Math.max(20, (window.innerHeight - tooltipHeight) / 2),
        left: Math.max(16, (window.innerWidth - tooltipWidth) / 2),
      })
      return
    }

    const preferredPlacement = step?.placement || 'bottom'
    let top = 0
    let left = 0

    const spaceAbove = targetRect.top
    const spaceBelow = window.innerHeight - targetRect.bottom
    const spaceLeft = targetRect.left
    const spaceRight = window.innerWidth - targetRect.right

    let actualPlacement = preferredPlacement

    // Mobile screen check
    const isSmallScreen = window.innerWidth < 768

    if (isSmallScreen) {
      // On mobile, top or bottom centered works best
      if (spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove) {
        actualPlacement = 'bottom'
      } else {
        actualPlacement = 'top'
      }
    }

    switch (actualPlacement) {
      case 'right':
        if (spaceRight >= tooltipWidth + margin) {
          left = targetRect.right + margin
          top = targetRect.top + (targetRect.height - tooltipHeight) / 2
        } else if (spaceBelow >= tooltipHeight + margin) {
          top = targetRect.bottom + margin
          left = targetRect.left + (targetRect.width - tooltipWidth) / 2
        } else {
          top = targetRect.top - tooltipHeight - margin
          left = targetRect.left
        }
        break
      case 'left':
        if (spaceLeft >= tooltipWidth + margin) {
          left = targetRect.left - tooltipWidth - margin
          top = targetRect.top + (targetRect.height - tooltipHeight) / 2
        } else {
          top = targetRect.bottom + margin
          left = targetRect.left
        }
        break
      case 'top':
        if (spaceAbove >= tooltipHeight + margin) {
          top = targetRect.top - tooltipHeight - margin
          left = targetRect.left + (targetRect.width - tooltipWidth) / 2
        } else {
          top = targetRect.bottom + margin
          left = targetRect.left + (targetRect.width - tooltipWidth) / 2
        }
        break
      case 'bottom':
      default:
        if (spaceBelow >= tooltipHeight + margin) {
          top = targetRect.bottom + margin
          left = targetRect.left + (targetRect.width - tooltipWidth) / 2
        } else if (spaceAbove >= tooltipHeight + margin) {
          top = targetRect.top - tooltipHeight - margin
          left = targetRect.left + (targetRect.width - tooltipWidth) / 2
        } else {
          top = targetRect.bottom + margin
          left = targetRect.left
        }
        break
    }

    // Clamp within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16))

    setTooltipPos({ top, left })
  }, [targetRect, currentStep, isOpen])

  const finishTour = useCallback(() => {
    if (userEmail) {
      localStorage.setItem(`docmind_tour_completed_${userEmail}`, 'true')
    }
    onClose()
    setCurrentStep(0)
  }, [userEmail, onClose])

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      finishTour()
    }
  }, [currentStep, finishTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStep()
      else if (e.key === 'ArrowLeft') prevStep()
      else if (e.key === 'Escape') finishTour()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, nextStep, prevStep, finishTour])

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const isLast = currentStep === TOUR_STEPS.length - 1

  // Spotlight Cutout values
  const pad = 8
  const cutoutX = targetRect ? Math.max(0, targetRect.left - pad) : 0
  const cutoutY = targetRect ? Math.max(0, targetRect.top - pad) : 0
  const cutoutW = targetRect ? targetRect.width + pad * 2 : 0
  const cutoutH = targetRect ? targetRect.height + pad * 2 : 0

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden select-none pointer-events-auto">
      {/* SVG Mask Spotlight Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White background fills screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle creates the transparent hole */}
            {targetRect && (
              <rect
                x={cutoutX}
                y={cutoutY}
                width={cutoutW}
                height={cutoutH}
                rx="16"
                fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>
        {/* Dark overlay with mask applied */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 10, 30, 0.72)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Glowing Ring around active target element */}
      {targetRect && (
        <div
          className="absolute pointer-events-none rounded-2xl transition-all duration-300 ease-out border-2 border-violet-400/80 shadow-[0_0_24px_rgba(124,58,237,0.5)] animate-pulse"
          style={{
            left: cutoutX,
            top: cutoutY,
            width: cutoutW,
            height: cutoutH,
          }}
        />
      )}

      {/* Interactive Tooltip Card */}
      <div
        className="absolute z-[10000] w-[calc(100vw-32px)] max-w-[360px] bg-[var(--surface)] text-[var(--text)] border-[1.5px] border-[#C4B5FD] rounded-3xl p-5 shadow-2xl transition-all duration-300 ease-out"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          boxShadow: '0 12px 40px rgba(124, 58, 237, 0.25)',
        }}
      >
        {/* Card Header: Icon, Progress & Skip */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{step.icon || '🧠'}</span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#EDE9FF] border border-[#C4B5FD] text-[#5B21B6]">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            onClick={finishTour}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            title="Skip Tour (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title & Description */}
        <h3 className="font-display text-lg font-bold mb-1.5 text-violet-700 dark:text-violet-300">
          {step.title}
        </h3>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mb-4">
          {step.description}
        </p>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  idx === currentStep
                    ? 'w-6 bg-violet-600'
                    : 'w-2 bg-violet-200 dark:bg-violet-950 hover:bg-violet-400'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={nextStep}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #4338CA)',
              }}
            >
              {isLast ? (
                <>
                  <CheckCircle2 size={14} /> Got It!
                </>
              ) : (
                <>
                  Next <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
