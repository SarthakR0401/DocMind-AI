'use client'

import { useState } from 'react'
import { Zap, Brain, Lock, FileText, Star } from 'lucide-react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showNamePrompt, setShowNamePrompt] = useState(false)

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
    // Here we would call the backend API
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login'
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
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
          alert('Login successful!')
          // Store manual session for demo
          localStorage.setItem('manual-user', JSON.stringify({
            name: data.user.name,
            email: data.user.email
          }))
          // Redirect to home page
          window.location.href = '/'
        }
      } else {
        alert(data.detail || 'Authentication failed')
      }
    } catch (err) {
      alert('Network error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-outfit)' }}>

      {/* ── Left Hero Panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #5B21B6, #4338CA, #0EA5E9, #0D9488)',
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
          <div className="absolute top-1/4 left-[40%] w-16 h-16 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', animation: 'float 4s ease-in-out infinite 1s' }} />
        </div>

        {/* Top brand */}
        <div className="relative z-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)' }}>
            <Star size={13} className="text-yellow-300" fill="currentColor" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">AI-Powered PDF Assistant</span>
          </div>

          <h1 className="font-display text-6xl text-white mb-5 leading-tight">
            DocMind<br />
            <span style={{ fontStyle: 'italic', opacity: 0.9 }}>AI</span>
          </h1>

          <p className="text-lg leading-relaxed mb-10"
            style={{ color: 'rgba(255,255,255,0.82)', maxWidth: '380px' }}>
            Transform any PDF into an interactive conversation. Ask questions, extract insights,
            and understand complex documents instantly.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-5 animate-fade-up delay-200">
            {[
              { icon: Zap, label: 'Instant answers', sub: 'from any PDF document' },
              { icon: Brain, label: 'AI-powered', sub: 'context-aware understanding' },
              { icon: Lock, label: 'Secure & private', sub: '— your data stays yours' },
            ].map(({ icon: Icon, label, sub }, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)' }}>
                  <Icon size={18} className="text-white" />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.88)' }} className="text-sm font-medium">
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
            <div key={i} className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}>
              <div className="text-2xl font-bold text-white mb-0.5">{val}</div>
              <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Sign-In Panel ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)' }}>

        <div className="w-full max-w-[400px] animate-fade-up">

          {/* Brain icon */}
          <div className="flex flex-col items-center mb-10">
            <div className="text-6xl mb-4 animate-float select-none"
              style={{ filter: 'drop-shadow(0 0 20px rgba(91,33,182,0.45))' }}>
              🧠
            </div>
            <h2 className="font-display text-4xl text-center mb-3"
              style={{ color: '#0F0A1E', lineHeight: '1.15' }}>
              Welcome back
            </h2>
            <p className="text-center text-sm leading-relaxed" style={{ color: '#6B6B99' }}>
              Sign in to start chatting<br />with your documents.
            </p>
          </div>

          {/* Login/Signup Form */}
          <div className="rounded-3xl overflow-hidden mb-5"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #EDE9FE',
              boxShadow: '0 8px 48px rgba(91,33,182,0.13), 0 2px 8px rgba(0,0,0,0.05)',
              padding: '36px',
            }}>

            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: '#B0A8D0' }}>Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-[#F3EEFF] focus:border-[#7C3AED] outline-none transition-all text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: '#B0A8D0' }}>Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-[#F3EEFF] focus:border-[#7C3AED] outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: '#B0A8D0' }}>Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-[#F3EEFF] focus:border-[#7C3AED] outline-none transition-all text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold text-base py-3.5 rounded-2xl text-white transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #4338CA)',
                  boxShadow: '0 8px 24px rgba(91,33,182,0.2)',
                }}
              >
                {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Login')}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px" style={{ background: '#EDE9FE' }} />
              </div>
              <span className="relative bg-white px-4 text-xs font-bold tracking-widest uppercase"
                style={{ color: '#B0A8D0' }}>
                Or continue with
              </span>
            </div>

            {/* Google Sign in button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full font-bold text-sm py-3 rounded-2xl border-2 border-[#F3EEFF] text-[#0F0A1E] hover:bg-[#F9F8FF] transition-all flex items-center justify-center gap-3"
            >
              <GoogleLogoMini />
              {loading ? 'Signing in…' : 'Sign in with Google'}
            </button>
          </div>

          <div className="text-center mb-6">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-bold" style={{ color: '#7C3AED' }}>
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { text: 'Free forever', bg: '#EDE9FF', color: '#5B21B6', border: '#C4B5FD' },
              { text: 'Secure login', bg: '#E0F9F6', color: '#0E7469', border: '#67E8D8' },
              { text: 'Any PDF', bg: '#FFF7ED', color: '#92400E', border: '#FCD34D' },
            ].map(({ text, bg, color, border }, i) => (
              <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: bg, color, border: `1px solid ${border}` }}>
                {text}
              </span>
            ))}
          </div>

          <p className="text-center mt-5 text-xs leading-relaxed" style={{ color: '#B0A8D0' }}>
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
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

