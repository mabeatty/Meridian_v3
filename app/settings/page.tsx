import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, tokensRes, feedsRes, invitesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('oauth_tokens').select('provider').eq('user_id', user!.id),
    supabase.from('news_feeds').select('*').eq('user_id', user!.id).order('created_at'),
    supabase.from('invites').select('*').eq('created_by', user!.id).order('created_at', { ascending: false }),
  ])

  const connected = new Set((tokensRes.data ?? []).map((t: any) => t.provider))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profileRes.data?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <SettingsClient
          profile={profileRes.data}
          connected={{
            google: connected.has('google'),
            clickup: connected.has('clickup'),
            plaid: connected.has('plaid'),
            whoop: connected.has('whoop'),
          }}
          feeds={feedsRes.data ?? []}
          invites={invitesRes.data ?? []}
          appUrl={process.env.NEXT_PUBLIC_APP_URL!}
        />
      </div>
    </div>
  )
}