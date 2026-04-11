import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const months = parseInt(new URL(req.url).searchParams.get('months') ?? '6')

  const results = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.toISOString().slice(0, 7)
    const monthStart = `${month}-01`
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-US', { month: 'short' })

    const [categoriesRes, transactionsRes] = await Promise.all([
      supabase.from('budget_categories').select('id,monthly_budget,name').eq('user_id', user.id),
      supabase.from('transactions').select('amount,category_id')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('pending', false),
    ])

    const cats = categoriesRes.data ?? []
    const txns = transactionsRes.data ?? []

    const totalBudget = cats
      .filter(c => c.name !== 'Transfer / Excluded')
      .reduce((s, c) => s + (c.monthly_budget ?? 0), 0)

    const spentByCat: Record<string, number> = {}
    for (const t of txns) {
      if (t.category_id) spentByCat[t.category_id] = (spentByCat[t.category_id] ?? 0) + t.amount
    }
    const totalSpent = cats
      .filter(c => c.name !== 'Transfer / Excluded')
      .reduce((s, c) => s + (spentByCat[c.id] ?? 0), 0)

    results.push({ month, label, budget: Math.round(totalBudget), spent: Math.round(totalSpent) })
  }

  return NextResponse.json({ data: results })
}
