import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CalendarWidget } from '@/components/widgets/CalendarWidget'
import { TasksWidget } from '@/components/widgets/TasksWidget'
import { NewsWidget } from '@/components/widgets/NewsWidget'
import { FinanceWidget } from '@/components/widgets/FinanceWidget'
import { GoalsWidget } from '@/components/widgets/GoalsWidget'
import { HealthWidget } from '@/components/widgets/HealthWidget'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, weatherRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    supabase.from('widget_cache').select('data').eq('user_id', user!.id).eq('widget_key', 'weather').single(),
  ])

  const weather = weatherRes.data?.data as any ?? null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        displayName={profileRes.data?.display_name}
        weather={weather ? { temp: weather.temp, condition: weather.condition, location: weather.location } : null}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <CalendarWidget />
          <TasksWidget />
          <NewsWidget />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FinanceWidget />
          <GoalsWidget />
          <HealthWidget />
        </div>
      </div>
    </div>
  )
}
