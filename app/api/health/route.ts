import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const d = new Date(); d.setDate(d.getDate() - 7)
  const { data: metrics } = await supabase.from('health_metrics').select('*').eq('user_id', user.id).gte('metric_date', d.toISOString().split('T')[0]).order('metric_date', { ascending: false })
  const avg = (arr: (number | null)[]) => { const v = arr.filter((x): x is number => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b) / v.length * 10) / 10 : null }
  return NextResponse.json({ data: { latest: metrics?.[0] ?? null, trend_7d: { avg_hrv: avg(metrics?.map(m => m.hrv) ?? []), avg_sleep: avg(metrics?.map(m => m.sleep_hours) ?? []), avg_recovery: avg(metrics?.map(m => m.recovery_score) ?? []), avg_steps: avg(metrics?.map(m => m.steps) ?? []) }, history: metrics ?? [], fetched_at: new Date().toISOString() } })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { metric_date, source = 'manual', ...rest } = await req.json()
  const { data, error } = await supabase.from('health_metrics').upsert({ user_id: user.id, metric_date: metric_date ?? new Date().toISOString().split('T')[0], source, ...rest }, { onConflict: 'user_id,metric_date,source' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
