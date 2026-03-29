import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { GoalsClient } from './GoalsClient'

export default async function GoalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, goalsRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    supabase.from('goals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profileRes.data?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <GoalsClient initialGoals={goalsRes.data ?? []} />
      </div>
    </div>
  )
}