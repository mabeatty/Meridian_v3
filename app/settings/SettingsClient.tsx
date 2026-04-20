'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Circle, ExternalLink, Plus, Trash2 } from 'lucide-react'

export function SettingsClient({ profile, connected, feeds, invites: initialInvites, appUrl }: any) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const connectedParam = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [locationName, setLocationName] = useState(profile?.location_name ?? 'Chicago')
  const [locationLat, setLocationLat] = useState(profile?.location_lat?.toString() ?? '41.8781')
  const [locationLng, setLocationLng] = useState(profile?.location_lng?.toString() ?? '-87.6298')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newFeedName, setNewFeedName] = useState('')
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedCat, setNewFeedCat] = useState('general')
  const [localFeeds, setLocalFeeds] = useState(feeds)
  const [theses, setTheses] = useState<any[]>([])
  const [newThesisName, setNewThesisName] = useState('')
  const [newThesisColor, setNewThesisColor] = useState('#4d9fff')
  const [addingThesis, setAddingThesis] = useState(false)

  useEffect(() => {
    fetch('/api/theses').then(r => r.json()).then(res => setTheses(res.data ?? []))
  }, [])

  async function addThesis() {
    if (!newThesisName.trim()) return
    setAddingThesis(true)
    const res = await fetch('/api/theses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newThesisName.trim(), color: newThesisColor }),
    }).then(r => r.json())
    if (res.data) {
      setTheses(p => [...p, res.data])
      setNewThesisName('')
    }
    setAddingThesis(false)
  }

  async function deleteThesis(id: string) {
    await fetch(`/api/theses?id=${id}`, { method: 'DELETE' })
    setTheses(p => p.filter(t => t.id !== id))
  }
  const [invites, setInvites] = useState(initialInvites)
  const [inviteEmail, setInviteEmail] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  async function saveProfile() {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        location_name: locationName,
        location_lat: parseFloat(locationLat),
        location_lng: parseFloat(locationLng),
      }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  async function addFeed() {
    if (!newFeedUrl || !newFeedName) return
    const res = await fetch('/api/news/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFeedName, url: newFeedUrl, category: newFeedCat }),
    }).then(r => r.json())
    if (res.data) {
      setLocalFeeds((p: any) => [...p, res.data])
      setNewFeedName('')
      setNewFeedUrl('')
    }
  }

  async function deleteFeed(id: string) {
    await fetch(`/api/news/feeds?id=${id}`, { method: 'DELETE' })
    setLocalFeeds((p: any) => p.filter((f: any) => f.id !== id))
  }

  async function disconnectProvider(provider: string) {
    if (!confirm(`Disconnect ${provider}?`)) return
    await fetch(`/api/auth/disconnect?provider=${provider}`, { method: 'DELETE' })
    router.refresh()
  }

  async function createInvite() {
    if (!inviteEmail.trim()) { setInviteError('Email required'); return }
    setCreatingInvite(true)
    setInviteError('')
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    }).then(r => r.json())
    if (res.error) {
      setInviteError(res.error)
    } else {
      setInvites((p: any) => [res.data, ...p])
      setInviteEmail('')
    }
    setCreatingInvite(false)
  }

  async function deleteInvite(id: string) {
    await fetch(`/api/invites?id=${id}`, { method: 'DELETE' })
    setInvites((p: any) => p.filter((i: any) => i.id !== id))
  }

  function copyInviteLink(token: string) {
    navigator.clipboard.writeText(`${appUrl}/auth/signup?invite=${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const IntRow = ({ name, desc, isConnected, href, provider }: any) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {isConnected
          ? <CheckCircle size={16} className="text-accent flex-shrink-0" />
          : <Circle size={16} className="text-text-tertiary flex-shrink-0" />}
        <div>
          <div className="text-sm text-text-primary">{name}</div>
          <div className="text-xs text-text-tertiary mt-0.5">{desc}</div>
        </div>
      </div>
      {isConnected
        ? <button onClick={() => disconnectProvider(provider)} className="text-xs text-text-tertiary hover:text-accent-red transition-colors">disconnect</button>
        : <a href={href} className="btn-connect">connect <ExternalLink size={10} /></a>}
    </div>
  )

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {connectedParam && (
        <div className="px-4 py-3 rounded-md bg-surface-2 border border-accent/20 text-sm text-accent">
          ✓ {connectedParam} connected
        </div>
      )}
      {errorParam && (
        <div className="px-4 py-3 rounded-md bg-surface-2 border border-accent-red/20 text-sm text-accent-red">
          Error: {errorParam.replace(/_/g, ' ')}
        </div>
      )}

      {/* Profile */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary mb-3">Profile</h2>
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Display name', displayName, setDisplayName, 'Alex', false],
              ['City', locationName, setLocationName, 'Chicago', false],
              ['Latitude', locationLat, setLocationLat, '41.8781', true],
              ['Longitude', locationLng, setLocationLng, '-87.6298', true],
            ].map(([label, val, set, ph, mono]: any) => (
              <div key={label} className="flex flex-col gap-1.5">
                <label className="widget-label">{label}</label>
                <input value={val} onChange={(e: any) => set(e.target.value)} placeholder={ph}
                  className={`bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors ${mono ? 'font-mono' : ''}`} />
              </div>
            ))}
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary w-fit">
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save profile'}
          </button>
        </div>
      </div>

      {/* Integrations */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary mb-3">Integrations</h2>
        <div className="bg-surface-2 border border-border rounded-lg px-4 mb-2">
          <IntRow name="Google Calendar" desc="Today's events on the dashboard" isConnected={connected.google} href="/api/auth/google" provider="google" />
          <IntRow name="ClickUp" desc="Tasks due today and overdue" isConnected={connected.clickup} href="/api/auth/clickup" provider="clickup" />
          <IntRow name="Plaid" desc="Account balances and net worth" isConnected={connected.plaid} href="/settings#plaid" provider="plaid" />
          <IntRow name="Whoop" desc="Recovery, HRV, sleep and strain" isConnected={connected.whoop} href="/api/auth/whoop" provider="whoop" />
        </div>
        <div className="px-4 py-3 rounded-md bg-surface-2 border border-border text-xs text-text-tertiary">
          <strong className="text-text-secondary">Apple Health:</strong> Use the{' '}
          <a href="https://apps.apple.com/app/health-auto-export/id1511373910" target="_blank" className="text-accent-blue hover:underline">
            Health Auto Export
          </a>{' '}
          iOS app → webhook to your Supabase URL, or import CSV via the Health page.
        </div>
      </div>

      {/* News Feeds */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary mb-3">News Feeds</h2>
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          {localFeeds.map((feed: any) => (
            <div key={feed.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
              <input type="checkbox" checked={feed.enabled}
                onChange={async (e) => {
                  await fetch('/api/news/feeds', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: feed.id, enabled: e.target.checked }),
                  })
                  setLocalFeeds((p: any) => p.map((f: any) => f.id === feed.id ? { ...f, enabled: e.target.checked } : f))
                }}
                className="accent-accent" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-text-primary">{feed.name}</span>
                <span className="text-xs text-text-tertiary ml-2 font-mono">{feed.url.slice(0, 40)}...</span>
              </div>
              <button onClick={() => deleteFeed(feed.id)} className="text-text-tertiary hover:text-accent-red transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 pt-1">
            <input value={newFeedName} onChange={e => setNewFeedName(e.target.value)} placeholder="Feed name"
              className="bg-surface-3 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none" />
            <input value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} placeholder="https://..."
              className="bg-surface-3 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono" />
            <select value={newFeedCat} onChange={e => setNewFeedCat(e.target.value)}
              className="bg-surface-3 border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none">
              {['general', 'tech', 'health', 'finance', 'news'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={addFeed} disabled={!newFeedName || !newFeedUrl} className="btn-primary px-3">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Investment Theses */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary mb-3">Investment Theses</h2>
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          {theses.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span className="text-sm text-text-primary">{t.name}</span>
              </div>
              <button onClick={() => deleteThesis(t.id)}
                className="text-[10px] text-accent-red hover:text-accent-red/80 transition-colors">
                delete
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input type="color" value={newThesisColor} onChange={e => setNewThesisColor(e.target.value)}
              style={{ width: '32px', height: '32px', padding: '2px', borderRadius: '6px', border: '1px solid #525252', background: 'transparent', cursor: 'pointer' }} />
            <input
              value={newThesisName}
              onChange={e => setNewThesisName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addThesis()}
              placeholder="New thesis name..."
              className="flex-1 bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
            />
            <button onClick={addThesis} disabled={addingThesis || !newThesisName.trim()} className="btn-primary px-3">
              {addingThesis ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* Invites */}
      <div>
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-text-tertiary mb-3">Invites</h2>
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createInvite()}
              placeholder="friend@email.com"
              className="flex-1 bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
            />
            <button onClick={createInvite} disabled={creatingInvite} className="btn-primary">
              {creatingInvite ? 'Creating...' : 'Send invite'}
            </button>
          </div>
          {inviteError && <p className="text-xs text-accent-red">{inviteError}</p>}
          <p className="text-[10px] text-text-dim">Invite links expire after 7 days and can only be used once.</p>

          {invites.length > 0 && (
            <div className="flex flex-col border-t border-border pt-3 gap-0">
              {invites.map((invite: any) => {
                const expired = new Date(invite.expires_at) < new Date()
                const used = !!invite.used_at
                return (
                  <div key={invite.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm text-text-primary font-mono truncate">{invite.email}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        used ? 'bg-accent/10 text-accent'
                          : expired ? 'bg-accent-red/10 text-accent-red'
                          : 'bg-accent-amber/10 text-accent-amber'
                      }`}>
                        {used ? 'Used' : expired ? 'Expired' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {!used && !expired && (
                        <button onClick={() => copyInviteLink(invite.token)}
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
          )}
        </div>
      </div>
    </div>
  )
}