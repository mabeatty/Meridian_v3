import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { JournalClient } from './JournalClient'

export default async function JournalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, entriesRes, realizationsRes, summaryRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    supabase.from('journal_entries').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('realizations').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('widget_cache').select('data').eq('user_id', user!.id).eq('widget_key', 'psychology_summary').single(),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profileRes.data?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <JournalClient
          initialEntries={entriesRes.data ?? []}
          initialRealizations={realizationsRes.data ?? []}
          initialSummary={(summaryRes.data?.data as any)?.summary ?? null}
        />
      </div>
    </div>
  )
}