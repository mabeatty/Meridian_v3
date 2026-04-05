'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('invite')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validating, setValidating] = useState(true)
  const [inviteValid, setInviteValid] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setInviteError('No invite token found. Please use your invite link.')
      setValidating(false)
      return
    }

    fetch(`/api/invites/validate?token=${token}`)
      .then(r => r.json())
      .then(res => {
        if (res.valid) {
          setInviteValid(true)
          setEmail(res.email)
        } else {
          setInviteError(res.error)
        }
      })
      .finally(() => setValidating(false))
  }, [token])

  async function handleSignup() {
    if (!email || !password) { setError('Please fill in all fields'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, token }),
    }).then(r => r.json())

    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }

    // Sign in after successful signup
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Account created. Please sign in.')
      router.push('/auth/login')
      return
    }

    router.push('/dashboard')
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-text-tertiary text-sm">Validating invite...</div>
      </div>
    )
  }

  if (!inviteValid) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col gap-4 text-center">
          <h1 className="text-text-primary text-xl font-medium">Access restricted</h1>
          <p className="text-text-tertiary text-sm">{inviteError}</p>
          <a href="/auth/login" className="text-text-tertiary text-xs hover:text-text-secondary underline">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-text-primary text-2xl font-semibold tracking-tight">Meridian</h1>
          <p className="text-text-tertiary text-sm mt-1">Create your account</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-tertiary">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text-tertiary focus:outline-none font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-text-dim">Email is set by your invite</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-tertiary">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-tertiary">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              placeholder="Repeat password"
              className="bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
            />
          </div>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-3 text-sm text-accent-red">
              {error}
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="btn-primary py-3 text-sm">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </div>

        <a href="/auth/login" className="text-center text-xs text-text-tertiary hover:text-text-secondary transition-colors">
          Already have an account? Sign in
        </a>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><div className="text-text-tertiary text-sm">Loading...</div></div>}>
      <SignupForm />
    </Suspense>
  )
}