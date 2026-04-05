import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, password, token } = await req.json()

  // Use service role for admin operations
  const adminSupabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Validate invite
  const { data: invite } = await adminSupabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 400 })
  if (invite.used_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })

  // Create user
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Create profile
  await adminSupabase.from('profiles').insert({
    id: authData.user.id,
    email: email.toLowerCase().trim(),
    display_name: email.split('@')[0],
  })

  // Mark invite as used
  await adminSupabase.from('invites').update({
    used_by: authData.user.id,
    used_at: new Date().toISOString(),
  }).eq('id', invite.id)

  return NextResponse.json({ success: true })
}