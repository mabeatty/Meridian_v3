'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setMessage({ type: 'error', text: error.message })
      else setMessage({ type: 'success', text: 'Check your email for the login link.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type: 'error', text: error.message })
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  async function handleSignUp() {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Account created — check your email.' })
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-medium text-text-primary tracking-tight">Meridian</h1>
        <p className="text-text-tertiary text-sm mt-1">Your personal operating system</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="widget-label">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
            className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors" />
        </div>
        {mode === 'password' && (
          <div className="flex flex-col gap-1.5">
            <label className="widget-label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors" />
          </div>
        )}
        {message && (
          <div className={`text-xs px-3 py-2 rounded-md ${message.type === 'error' ? 'bg-surface-3 text-accent-red border border-accent-red/20' : 'bg-surface-3 text-accent border border-accent/20'}`}>
            {message.text}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary justify-center mt-1">
          {loading ? 'Loading...' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
        </button>
        {mode === 'password' && (
          <button type="button" onClick={handleSignUp} disabled={loading}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors text-center">
            No account? Sign up
          </button>
        )}
        <button type="button" onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors text-center">
          {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
        </button>
      </form>
    </div>
  )
}
