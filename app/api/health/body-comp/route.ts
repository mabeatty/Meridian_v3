import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', user.id)
    .order('measured_date', { ascending: false })
    .limit(12)

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { measured_date, weight_lbs, body_fat_pct } = await req.json()

  const lean_mass_lbs = weight_lbs && body_fat_pct
    ? Math.round(weight_lbs * (1 - body_fat_pct / 100) * 10) / 10
    : null

  const { data, error } = await supabase
    .from('body_measurements')
    .upsert({
      user_id: user.id,
      measured_date,
      weight_lbs,
      body_fat_pct,
      lean_mass_lbs,
      source: 'manual',
    }, { onConflict: 'user_id,measured_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}