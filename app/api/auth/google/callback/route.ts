import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code'), userId = searchParams.get('state')
  if (!code || !userId) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`)
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`, grant_type: 'authorization_code' }) })
    const t = await r.json()
    if (!t.access_token) throw new Error('No token')
    await createAdminClient().from('oauth_tokens').upsert({ user_id: userId, provider: 'google', access_token: t.access_token, refresh_token: t.refresh_token ?? null, expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null, scope: t.scope ?? null, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=google`)
  } catch { return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_token_exchange`) }
}
