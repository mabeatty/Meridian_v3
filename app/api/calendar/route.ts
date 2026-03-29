import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function refreshToken(rt: string) {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: rt, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }) })
    return (await r.json()).access_token ?? null
  } catch { return null }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'calendar').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 15) return NextResponse.json({ data: cached.data, cached: true })

  const { data: tok } = await supabase.from('oauth_tokens').select('access_token,refresh_token,expires_at').eq('user_id', user.id).eq('provider', 'google').single()
  if (!tok) return NextResponse.json({ data: null, error: 'not_connected', cached: false })

  let at = tok.access_token
  if (tok.expires_at && new Date(tok.expires_at) < new Date() && tok.refresh_token) {
    const nt = await refreshToken(tok.refresh_token)
    if (nt) { at = nt; await supabase.from('oauth_tokens').update({ access_token: nt, expires_at: new Date(Date.now() + 3600000).toISOString() }).eq('user_id', user.id).eq('provider', 'google') }
  }

  try {
    const now = new Date()
    const thirtyDaysOut = new Date(now)
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${new URLSearchParams({ timeMin: now.toISOString(), timeMax: thirtyDaysOut.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '30' })}`, { headers: { Authorization: `Bearer ${at}` } })
    const g = await r.json()
    if (g.error) throw new Error(g.error.message)
    const events = (g.items ?? []).map((e: any) => ({ id: e.id, title: e.summary ?? '(No title)', start: e.start.dateTime ?? e.start.date, end: e.end.dateTime ?? e.end.date, allDay: !e.start.dateTime, location: e.location ?? null, colorId: e.colorId ?? null, htmlLink: e.htmlLink ?? null }))
    const data = { events, fetched_at: new Date().toISOString() }
    await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'calendar', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
    return NextResponse.json({ data, cached: false })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
