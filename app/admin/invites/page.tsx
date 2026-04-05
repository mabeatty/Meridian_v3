import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvitesClient } from './InvitesClient'

export default async function InvitesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Only allow your account
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (profile?.email !== 'marc.alex.beatty@gmail.com') redirect('/dashboard')

  const { data: invites } = await supabase
    .from('invites')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  return <InvitesClient initialInvites={invites ?? []} appUrl={process.env.NEXT_PUBLIC_APP_URL!} />
}