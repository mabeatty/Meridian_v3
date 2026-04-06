import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const token = new URL(req.url).searchParams.get('token')
  const email = new URL(req.url).searchParams.get('email')

  if (!token) return NextResponse.json({ valid: false, error: 'Missing token' })

  const { data: invite } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ valid: false, error: 'Invalid invite link' })
  if (invite.used_at) return NextResponse.json({ valid: false, error: 'This invite has already been used' })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ valid: false, error: 'This invite has expired' })
  if (email && invite.email !== email.toLowerCase().trim()) {
    return NextResponse.json({ valid: false, error: 'This invite is for a different email address' })
  }

  return NextResponse.json({ valid: true, email: invite.email })
}
