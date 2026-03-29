import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const params = new URLSearchParams({ client_id: process.env.CLICKUP_CLIENT_ID!, redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/clickup/callback`, state: user.id })
  return NextResponse.redirect(`https://app.clickup.com/api?${params}`)
}
