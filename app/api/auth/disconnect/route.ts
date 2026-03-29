import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const provider = new URL(req.url).searchParams.get('provider')
  if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 })
  await supabase.from('oauth_tokens').delete().eq('user_id', user.id).eq('provider', provider)
  const keyMap: Record<string, string> = { google: 'calendar', clickup: 'tasks', plaid: 'finance', whoop: 'health' }
  if (keyMap[provider]) await supabase.from('widget_cache').delete().eq('user_id', user.id).eq('widget_key', keyMap[provider])
  return NextResponse.json({ success: true })
}
