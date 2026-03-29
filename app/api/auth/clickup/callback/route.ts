import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code'), userId = searchParams.get('state')
  if (!code || !userId) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=clickup_auth_failed`)
  try {
    const r = await fetch('https://api.clickup.com/api/v2/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.CLICKUP_CLIENT_ID, client_secret: process.env.CLICKUP_CLIENT_SECRET, code }) })
    const t = await r.json()
    if (!t.access_token) throw new Error('No token')
    await createAdminClient().from('oauth_tokens').upsert({ user_id: userId, provider: 'clickup', access_token: t.access_token, refresh_token: null, expires_at: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=clickup`)
  } catch { return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=clickup_token_exchange`) }
}
