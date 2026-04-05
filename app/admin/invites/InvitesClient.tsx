'use client'

import { useState } from 'react'

interface Invite {
  id: string
  token: string
  email: string
  used_at: string | null
  created_at: string
  expires_at: string
}

export function InvitesClient({ initialInvites, appUrl }: {
  initialInvites: Invite[]
  appUrl: string
}) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites)
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  async function createInvite() {
    if (!email.trim()) { setError('Email required'); return }
    setCreating(true)
    setError('')

    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    }).then(r => r.json())

    if (res.error) {
      setError(res.error)
    } else {
      setInvites(prev => [res.data, ...prev])
      setEmail('')
    }
    setCreating(false)
  }

  async function deleteInvite(id: string) {
    await fetch(`/api/invites?id=${id}`, { method: 'DELETE' })
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  function copyLink(token: string) {
    const link = `${appUrl}/auth/signup?invite=${token}`
    navigator.clipboard.writeText(link)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-text-primary text-xl font-medium">Invites</h1>
          <p className="text-text-tertiary text-sm mt-1">Manage access to Meridian</p>
        </div>

        {/* Create invite */}
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          <span className="widget-label">Create invite</span>
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createInvite()}
              placeholder="friend@email.com"
              className="flex-1 bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
            />
            <button onClick={createInvite} disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create invite'}
            </button>
          </div>
          {error && <p className="text-xs text-accent-red">{error}</p>}
          <p className="text-[10px] text-text-dim">Invite links expire after 7 days and can only be used once.</p>
        </div>

        {/* Invite list */}
        <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border widget-label">
            Invites ({invites.length})
          </div>
          {invites.length === 0 && (
            <div className="px-4 py-8 text-xs text-text-tertiary text-center">
              No invites yet
            </div>
          )}
          {invites.map(invite => {
            const expired = new Date(invite.expires_at) < new Date()
            const used = !!invite.used_at
            return (
              <div key={invite.id}
                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-text-primary font-mono">{invite.email}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      used ? 'bg-accent/10 text-accent'
                        : expired ? 'bg-accent-red/10 text-accent-red'
                        : 'bg-accent-amber/10 text-accent-amber'
                    }`}>
                      {used ? 'Used' : expired ? 'Expired' : 'Pending'}
                    </span>
                    <span className="text-[10px] text-text-dim font-mono">
                      {used ? `Used ${new Date(invite.used_at!).toLocaleDateString()}`
                        : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!used && !expired && (
                    <button onClick={() => copyLink(invite.token)}
                      className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">
                      {copied === invite.token ? '✓ Copied' : 'Copy link'}
                    </button>
                  )}
                  <button onClick={() => deleteInvite(invite.id)}
                    className="text-[10px] text-accent-red hover:text-accent-red/80">
                    delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <a href="/dashboard" className="text-xs text-text-tertiary hover:text-text-secondary w-fit">
          ← Back to dashboard
        </a>
      </div>
    </div>
  )
}