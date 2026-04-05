import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { BudgetClient } from './BudgetClient'

export default async function BudgetPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const month = new Date().toISOString().slice(0, 7)

  const [profileRes, categoriesRes, transactionsRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    supabase.from('budget_categories').select('*').eq('user_id', user!.id).order('name'),
    supabase.from('transactions')
      .select('*, budget_categories(id, name, color)')
      .eq('user_id', user!.id)
      .gte('date', `${month}-01`)
      .order('date', { ascending: false })
      .limit(200),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profileRes.data?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <BudgetClient
          initialCategories={categoriesRes.data ?? []}
          initialTransactions={transactionsRes.data ?? []}
          initialMonth={month}
        />
      </div>
    </div>
  )
}