import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipe_id, recipe_name, rating, notes } = await req.json()

  const { data, error } = await supabase
    .from('recipe_feedback')
    .insert({ user_id: user.id, recipe_id: recipe_id ?? null, recipe_name, rating, notes: notes ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}