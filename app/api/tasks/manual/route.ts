import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const archived = new URL(req.url).searchParams.get('archived') === 'true'

  let query = supabase
    .from('manual_tasks')
    .select('*')
    .eq('user_id', user.id)

  if (archived) {
    query = query.not('archived_at', 'is', null).order('archived_at', { ascending: false }).limit(50)
  } else {
    query = query
      .is('archived_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
  }

  const { data } = await query
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, notes, priority, due_date } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabase
    .from('manual_tasks')
    .insert({
      user_id: user.id,
      title: title.trim(),
      notes: notes ?? null,
      priority: priority ?? 3,
      due_date: due_date ?? null,
      status: 'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, title, notes, priority, due_date, status, archive } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const updates: any = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title.trim()
  if (notes !== undefined) updates.notes = notes
  if (priority !== undefined) updates.priority = priority
  if (due_date !== undefined) updates.due_date = due_date
  if (status !== undefined) updates.status = status
  if (archive === true) updates.archived_at = new Date().toISOString()
  if (archive === false) updates.archived_at = null

  const { data, error } = await supabase
    .from('manual_tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('manual_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
