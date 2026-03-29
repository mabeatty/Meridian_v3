import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=whoop_auth_failed`)
  }

  try {
    const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whoop/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('No access token')

    const supabase = createAdminClient()

    await supabase.from('oauth_tokens').upsert({
      user_id: userId,
      provider: 'whoop',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' })

    await syncWhoopData(userId, tokens.access_token, supabase)

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=whoop`)
  } catch (err) {
    console.error('Whoop OAuth error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=whoop_token_exchange`)
  }
}

async function syncWhoopData(userId: string, accessToken: string, supabase: any) {
  try {
    const headers = { Authorization: `Bearer ${accessToken}` }

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

    console.log('Cycle sample:', JSON.stringify(cycleData?.records?.[0]).slice(0, 300))

    const metricsMap: Record<string, any> = {}

    // Recovery
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

    // Sleep (skip naps)
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

    // Strain
    for (const cycle of cycleData.records ?? []) {
      const date = cycle.created_at?.split('T')[0]
      if (!date) continue
      metricsMap[date] = {
        ...metricsMap[date],
        strain: cycle.score?.strain ?? null,
      }
    }

    const rows = Object.entries(metricsMap).map(([date, metrics]) => ({
      user_id: userId,
      metric_date: date,
      source: 'whoop',
      ...metrics,
    }))

    if (rows.length > 0) {
      const { error } = await supabase
        .from('health_metrics')
        .upsert(rows, { onConflict: 'user_id,metric_date,source' })
      if (error) console.error('Upsert error:', error)
      else console.log(`Synced ${rows.length} days of Whoop data`)
    }
  } catch (err) {
    console.error('Whoop sync error:', err)
  }
}