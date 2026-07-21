'use client'

import { useState } from 'react'
import { Zap, Brain, Lock, Star } from 'lucide-react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    await signIn('google', {
      callbackUrl: '/',
      authorizationParams: {
        prompt: 'select_account'
      }
    })
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login'
    try {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })
      const data = await res.json()
      if (res.ok) {
        if (isSignUp) {
          alert('Signup successful! Please login.')
          setIsSignUp(false)
        } else {
          localStorage.setItem('manual-user', JSON.stringify({
            email: data.user.email,
            name: data.user.name
          }))
          window.location.href = '/'
        }
      } else {
        alert(data.detail || 'Authentication failed')
      }
    } catch (err) {
      alert('Network error connecting to backend')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] flex select-none" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Left Hero Panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #1E1B4B, #312E81, #4F46E5, #0284C7)',
          backgroundSize: '300% 300%',
          animation: 'gradAnim 7s ease infinite',
          padding: '56px 60px',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)', animation: 'spin-slow 18s linear infinite' }} />
          <div className="absolute bottom-10 -left-8 w-52 h-52 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', animation: 'spin-slow 12s linear infinite reverse' }} />
          <div className="absolute top-1/2 right-[12%] w-28 h-28 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', animation: 'float 6s ease-in-out infinite' }} />
        </div>

        {/* Top brand */}
        <div className="relative z-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Star size={13} className="text-yellow-300" fill="currentColor" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">AI-Powered PDF Assistant</span>
          </div>

          <h1 className="font-display text-6xl text-white mb-5 leading-tight tracking-tight">
            DocMind<br />
            <span style={{ fontStyle: 'italic', opacity: 0.9 }}>AI</span>
          </h1>

          <p className="text-base leading-relaxed mb-10 text-slate-200 max-w-[380px]">
            Transform any PDF into an interactive conversation. Ask questions, extract insights,
            and understand complex documents instantly.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-4 animate-fade-up delay-200">
            {[
              { icon: Zap, label: 'Instant answers', sub: 'from any PDF document' },
              { icon: Brain, label: 'AI-powered', sub: 'context-aware understanding' },
              { icon: Lock, label: 'Secure & private', sub: '— your data stays yours' },
            ].map(({ icon: Icon, label, sub }, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-md"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  <strong className="text-white font-bold">{label}</strong> {sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4 animate-fade-up delay-400">
          {[
            { val: '10k+', label: 'Documents analyzed' },
            { val: '99%', label: 'Accuracy rate' },
            { val: '<2s', label: 'Response time' },
          ].map(({ val, label }, i) => (
            <div key={i} className="rounded-2xl p-4 backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}>
              <div className="text-2xl font-bold text-white mb-0.5">{val}</div>
              <div className="text-xs font-medium text-slate-300">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Sign-In Panel ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12" style={{ background: 'var(--bg)' }}>

        <div className="w-full max-w-[400px] animate-fade-up">

          {/* Brain icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="text-5xl mb-3 animate-float select-none">
              🧠
            </div>
            <h2 className="font-display text-3xl font-bold text-center mb-2" style={{ color: 'var(--text)' }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Sign in to start chatting with your documents.
            </p>
          </div>

          {/* Login/Signup Form */}
          <div className="rounded-3xl p-8 mb-5 shadow-xl"
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
            }}>

            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--border)] focus:border-[var(--violet)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--border)] focus:border-[var(--violet)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: 'var(--muted)' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--border)] focus:border-[var(--violet)] bg-[var(--bg)] text-[var(--text)] outline-none transition-all text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold text-sm py-3.5 rounded-2xl text-white transition-all duration-200 shadow-md active:scale-98"
                style={{
                  background: 'linear-gradient(135deg, var(--violet), var(--indigo))',
                  boxShadow: '0 6px 20px rgba(79, 70, 229, 0.28)',
                }}
              >
                {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Login')}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px" style={{ background: 'var(--border)' }} />
              </div>
              <span className="relative bg-[var(--surface)] px-4 text-[10px] font-bold tracking-widest uppercase"
                style={{ color: 'var(--muted)' }}>
                Or continue with
              </span>
            </div>

            {/* Google Sign in button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full font-bold text-sm py-3 rounded-2xl border-2 border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)] transition-all flex items-center justify-center gap-3 bg-[var(--surface)]"
            >
              <GoogleLogoMini />
              {loading ? 'Signing in…' : 'Sign in with Google'}
            </button>
          </div>

          <div className="text-center mb-5">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-bold" style={{ color: 'var(--violet)' }}>
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'Free forever', 'Secure login', 'Any PDF'
            ].map((text, i) => (
              <span key={i} className="text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm"
                style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                {text}
              </span>
            ))}
          </div>

          <p className="text-center mt-4 text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            By signing in you agree to our terms.<br />
            We never store your passwords.
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleLogoMini() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
