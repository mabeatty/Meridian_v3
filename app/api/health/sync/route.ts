import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function refreshWhoopToken(refreshToken: string, supabase: any, userId: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    })
    const tokens = await res.json()
    if (!tokens.access_token) return null

    await supabase.from('oauth_tokens').update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? refreshToken,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('provider', 'whoop')

    return tokens.access_token
  } catch {
    return null
  }
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tok } = await supabase
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'whoop')
    .single()

  if (!tok) return NextResponse.json({ error: 'Whoop not connected' }, { status: 400 })

  let accessToken = tok.access_token
  if (tok.expires_at && new Date(tok.expires_at) < new Date() && tok.refresh_token) {
    const newToken = await refreshWhoopToken(tok.refresh_token, supabase, user.id)
    if (newToken) accessToken = newToken
  }

  const headers = { Authorization: `Bearer ${accessToken}` }

  try {
    const [recoveryRes, sleepRes, cycleRes] = await Promise.all([
      fetch('https://api.prod.whoop.com/developer/v2/recovery?limit=7', { headers }),
      fetch('https://api.prod.whoop.com/developer/v2/activity/sleep?limit=7', { headers }),
      fetch('https://api.prod.whoop.com/developer/v2/cycle?limit=7', { headers }),
    ])

    const [recoveryData, sleepData, cycleData] = await Promise.all([
      recoveryRes.json(),
      sleepRes.json(),
      cycleRes.json(),
    ])

    const metricsMap: Record<string, any> = {}

    for (const rec of recoveryData.records ?? []) {
      const date = rec.created_at?.split('T')[0]
      if (!date) continue
      metricsMap[date] = {
        ...metricsMap[date],
        recovery_score: rec.score?.recovery_score ?? null,
        hrv: rec.score?.hrv_rmssd_milli ?? null,
        resting_hr: rec.score?.resting_heart_rate ?? null,
      }
    }

    for (const sleep of sleepData.records ?? []) {
      if (sleep.nap) continue
      const date = sleep.created_at?.split('T')[0]
      if (!date) continue
      metricsMap[date] = {
        ...metricsMap[date],
        sleep_hours: sleep.score?.stage_summary?.total_in_bed_time_milli
          ? sleep.score.stage_summary.total_in_bed_time_milli / 1000 / 3600
          : null,
        sleep_quality: sleep.score?.sleep_performance_percentage ?? null,
      }
    }

    for (const cycle of cycleData.records ?? []) {
      const date = cycle.created_at?.split('T')[0]
      if (!date) continue
      metricsMap[date] = {
        ...metricsMap[date],
        strain: cycle.score?.strain ?? null,
      }
    }

    const rows = Object.entries(metricsMap).map(([date, metrics]) => ({
      user_id: user.id,
      metric_date: date,
      source: 'whoop',
      ...metrics,
    }))

    if (rows.length > 0) {
      await supabase
        .from('health_metrics')
        .upsert(rows, { onConflict: 'user_id,metric_date,source' })
    }

    return NextResponse.json({ synced: rows.length, dates: rows.map((r: any) => r.metric_date) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}