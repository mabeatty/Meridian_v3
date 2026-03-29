import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { FinancesClient } from './FinancesClient'

export default async function FinancesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, tokensRes, snapshotsRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    supabase.from('oauth_tokens').select('provider').eq('user_id', user!.id).eq('provider', 'plaid').single(),
    supabase.from('financial_snapshots').select('*').eq('user_id', user!.id).order('snapshot_date', { ascending: false }).limit(30),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profileRes.data?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <FinancesClient
          snapshots={snapshotsRes.data ?? []}
          isConnected={!!tokensRes.data}
        />
      </div>
    </div>
  )
}