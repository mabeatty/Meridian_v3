import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const month = new URL(req.url).searchParams.get('month') ??
    new Date().toISOString().slice(0, 7)

  const monthStart = `${month}-01`
  const monthEnd = new Date(
    parseInt(month.split('-')[0]),
    parseInt(month.split('-')[1]),
    0
  ).toISOString().split('T')[0]

  // Previous month for carryover
  const prevDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 2, 1)
  const prevMonth = prevDate.toISOString().slice(0, 7)

  const [categoriesRes, transactionsRes, prevCarryoverRes] = await Promise.all([
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('name'),
    supabase.from('transactions').select('amount, category_id, date')
      .eq('user_id', user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .eq('pending', false),
    supabase.from('budget_carryover').select('*')
      .eq('user_id', user.id)
      .eq('month', `${prevMonth}-01`),
  ])

  const categories = categoriesRes.data ?? []
  const transactions = transactionsRes.data ?? []
  const prevCarryovers = prevCarryoverRes.data ?? []

  // Calculate spent per category this month
  const spentByCategory: Record<string, number> = {}
  for (const t of transactions) {
    if (t.category_id) {
      spentByCategory[t.category_id] = (spentByCategory[t.category_id] ?? 0) + t.amount
    }
  }

  // Build daily spending for chart
  const dailySpending: Record<string, number> = {}
  for (const t of transactions) {
    dailySpending[t.date] = (dailySpending[t.date] ?? 0) + t.amount
  }

  // Running cumulative for line chart
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const chartData = []
  let cumulative = 0
  for (let d = 1; d <= Math.min(today.getDate(), daysInMonth); d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`
    cumulative += dailySpending[dateStr] ?? 0
    chartData.push({ day: d, spent: Math.round(cumulative) })
  }

  // Build category summaries with carryover
  const summary = categories.map(cat => {
    const prev = prevCarryovers.find(c => c.category_id === cat.id)
    const carryover = prev ? prev.budget_amount + prev.carryover - prev.spent_amount : 0
    const effectiveBudget = cat.monthly_budget + carryover
    const spent = spentByCategory[cat.id] ?? 0

    return {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      monthly_budget: cat.monthly_budget,
      carryover: Math.round(carryover),
      effective_budget: Math.round(effectiveBudget),
      spent: Math.round(spent),
      remaining: Math.round(effectiveBudget - spent),
      pct: effectiveBudget > 0 ? Math.min((spent / effectiveBudget) * 100, 100) : 0,
    }
  })

  const totalBudget = summary.reduce((s, c) => s + c.effective_budget, 0)
  const totalSpent = summary.reduce((s, c) => s + c.spent, 0)

  // Save carryover for this month
  const carryoverRows = summary
    .filter(c => c.monthly_budget > 0)
    .map(c => ({
      user_id: user.id,
      category_id: c.id,
      month: monthStart,
      budget_amount: c.monthly_budget,
      spent_amount: c.spent,
      carryover: c.carryover,
    }))

  if (carryoverRows.length) {
    await supabase.from('budget_carryover')
      .upsert(carryoverRows, { onConflict: 'user_id,category_id,month' })
  }

  return NextResponse.json({ summary, totalBudget, totalSpent, chartData, month })
}