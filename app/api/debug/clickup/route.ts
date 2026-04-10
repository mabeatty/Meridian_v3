import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' })

  const { data: tokenRow } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'clickup')
    .single()

  const token = tokenRow?.access_token ?? process.env.CLICKUP_API_TOKEN
  if (!token) return NextResponse.json({ error: 'No token' })

  const teamsRes = await fetch('https://api.clickup.com/api/v2/team', {
    headers: { Authorization: token }
  })
  const teams = await teamsRes.json()

  return NextResponse.json({
    token_source: tokenRow?.access_token ? 'oauth_tokens' : 'env',
    token_prefix: token.slice(0, 10),
    teams_raw: teams,
  })
}
