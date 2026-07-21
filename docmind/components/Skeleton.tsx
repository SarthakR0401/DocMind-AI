'use client'

import React from 'react'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  variant?: 'default' | 'accent'
}

export function Skeleton({ className = '', variant = 'default', style, ...props }: SkeletonProps) {
  const shimmerClass = variant === 'accent' ? 'skeleton-shimmer-accent' : 'skeleton-shimmer'
  return (
    <div
      className={`${shimmerClass} rounded-xl ${className}`}
      style={style}
      {...props}
    />
  )
}

// ── Sidebar Skeleton ────────────────────────────────────────────────────────
export function SidebarSkeleton() {
  return (
    <aside
      className="hidden md:flex flex-col h-full border-r overflow-hidden select-none"
      style={{
        width: 272,
        minWidth: 272,
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Brand Skeleton */}
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <div className="space-y-2">
          <Skeleton variant="accent" className="h-7 w-32 rounded-xl" />
          <Skeleton className="h-3 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-6 w-6 rounded-lg" />
      </div>

      <div className="h-px my-1 mx-4" style={{ background: 'var(--border)' }} />

      {/* User Card Skeleton */}
      <div className="p-4 space-y-4 flex-1">
        <div
          className="rounded-2xl p-4 space-y-2 shadow-sm"
          style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }}
        >
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-4 w-28 rounded-lg" />
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>

        {/* Navigation Section Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-md mb-3" />
          <Skeleton variant="accent" className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        {/* Actions Grid Skeleton */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-16 rounded-md mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>

        {/* Upload Zone Skeleton */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-20 rounded-md mb-3" />
          <div
            className="rounded-2xl p-6 flex flex-col items-center justify-center space-y-3"
            style={{ background: 'var(--bg)', border: '1.5px dashed var(--border)' }}
          >
            <Skeleton variant="accent" className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        </div>
      </div>

      {/* Footer / Buttons Skeleton */}
      <div className="p-4 space-y-2">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </aside>
  )
}

// ── TopBar Skeleton ─────────────────────────────────────────────────────────
export function TopBarSkeleton() {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b w-full"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl md:hidden" />
        <Skeleton className="h-6 w-40 md:w-56 rounded-xl" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-xl hidden sm:block" />
        <Skeleton className="h-8 w-16 rounded-xl hidden sm:block" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
    </div>
  )
}

// ── ChatView Skeleton ───────────────────────────────────────────────────────
export function ChatViewSkeleton() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Welcome Banner Skeleton */}
      <div className="space-y-3 pt-4">
        <Skeleton className="h-8 w-64 rounded-2xl" />
        <Skeleton className="h-4 w-80 rounded-xl" />
      </div>

      {/* Empty State / Main Content Card Skeleton */}
      <div
        className="rounded-3xl p-10 flex flex-col items-center justify-center space-y-4 shadow-sm"
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
        }}
      >
        <Skeleton variant="accent" className="h-14 w-14 rounded-2xl" />
        <Skeleton className="h-6 w-48 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-lg" />
        <Skeleton className="h-4 w-60 rounded-lg" />
      </div>

      {/* Feature Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5 space-y-3 shadow-sm"
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
            }}
          >
            <Skeleton variant="accent" className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-4/5 rounded-md" />
          </div>
        ))}
      </div>

      {/* Floating Input Bar Skeleton */}
      <div className="mt-auto pt-4">
        <div
          className="rounded-2xl p-3 flex items-center justify-between shadow-md"
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
          }}
        >
          <Skeleton className="h-6 w-56 rounded-lg ml-2" />
          <Skeleton variant="accent" className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ── Full AppShell Loading Skeleton ──────────────────────────────────────────
export function AppShellSkeleton() {
  return (
    <div
      className="flex h-[100dvh] overflow-hidden w-full select-none"
      style={{ background: 'var(--bg)' }}
    >
      <SidebarSkeleton />
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <TopBarSkeleton />
        <ChatViewSkeleton />
      </main>
    </div>
  )
}

// ── Shared Chat Page Skeleton ───────────────────────────────────────────────
export function SharePageSkeleton() {
  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden w-full select-none"
      style={{ background: 'var(--bg)' }}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b w-full"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface)',
        }}
      >
        <div className="flex items-center gap-3">
          <Skeleton variant="accent" className="h-8 w-8 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-16 rounded-xl hidden sm:block" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 pb-20 w-full max-w-4xl mx-auto space-y-6">
        {/* Info Card Skeleton */}
        <div
          className="rounded-2xl p-5 space-y-3 shadow-sm"
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
          }}
        >
          <Skeleton className="h-3 w-28 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

        {/* Messages Skeleton */}
        <div className="space-y-5">
          {/* User message skeleton */}
          <div className="flex justify-end">
            <Skeleton variant="accent" className="h-14 w-3/4 rounded-2xl rounded-tr-none" />
          </div>
          {/* AI message skeleton */}
          <div className="flex items-start gap-3">
            <Skeleton variant="accent" className="h-10 w-10 rounded-xl flex-shrink-0" />
            <Skeleton className="h-28 w-4/5 rounded-2xl rounded-tl-none" />
          </div>
          {/* User message skeleton 2 */}
          <div className="flex justify-end">
            <Skeleton variant="accent" className="h-12 w-2/3 rounded-2xl rounded-tr-none" />
          </div>
          {/* AI message skeleton 2 */}
          <div className="flex items-start gap-3">
            <Skeleton variant="accent" className="h-10 w-10 rounded-xl flex-shrink-0" />
            <Skeleton className="h-20 w-3/4 rounded-2xl rounded-tl-none" />
          </div>
        </div>
      </div>

      {/* Footer CTA Skeleton */}
      <div
        className="p-4 border-t flex justify-center w-full"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface)',
        }}
      >
        <Skeleton variant="accent" className="h-12 w-64 rounded-2xl" />
      </div>
    </div>
  )
}
