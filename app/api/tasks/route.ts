import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check cache (2 min TTL)
  const { data: cached } = await supabase
    .from('widget_cache')
    .select('data,fetched_at')
    .eq('user_id', user.id)
    .eq('widget_key', 'tasks')
    .single()

  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 2) {
    return NextResponse.json({ data: cached.data, cached: true })
  }

  const allTasks: any[] = []

  // ── Manual tasks ────────────────────────────────────────────
  const { data: manualTasks } = await supabase
    .from('manual_tasks')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: true })

  for (const t of manualTasks ?? []) {
    allTasks.push({
      id: `manual_${t.id}`,
      raw_id: t.id,
      name: t.title,
      notes: t.notes ?? null,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date ? new Date(t.due_date).getTime() : null,
      source: 'manual',
      list_name: null,
      url: null,
      tags: [],
    })
  }

  // ── ClickUp (per-user OAuth token) ──────────────────────────
  const { data: clickupToken } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'clickup')
    .single()

  const resolvedToken = clickupToken?.access_token ?? process.env.CLICKUP_API_TOKEN
  if (resolvedToken) {
    try {
      const h = { Authorization: resolvedToken }
      const teams = await fetch('https://api.clickup.com/api/v2/team', { headers: h }).then(r => r.json())
      const teamId = teams.teams?.[0]?.id ?? process.env.CLICKUP_TEAM_ID
      if (teamId) {
        const sevenDaysOut = new Date()
        sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
        sevenDaysOut.setHours(23, 59, 59, 999)

        const memberByEmail = teams.teams?.[0]?.members?.find(
          (m: any) => m.user?.email === user.email
        )?.user?.id
        const memberId = memberByEmail
          ? String(memberByEmail)
          : process.env.CLICKUP_MEMBER_ID ?? null

        const taskParams = new URLSearchParams({ due_date_lt: sevenDaysOut.getTime().toString(), include_closed: 'false', subtasks: 'true', page: '0' })
        if (memberId && memberId !== 'undefined') taskParams.append('assignees[]', memberId)
        const url = `https://api.clickup.com/api/v2/team/${teamId}/task?${taskParams}`

        const td = await fetch(url, { headers: h }).then(r => r.json())

        for (const t of (td.tasks ?? []).slice(0, 20)) {
          allTasks.push({
            id: `clickup_${t.id}`,
            raw_id: t.id,
            name: t.name,
            notes: null,
            status: t.status?.status ?? 'unknown',
            priority: t.priority?.priority ? parseInt(t.priority.priority) : null,
            due_date: t.due_date ? parseInt(t.due_date) : null,
            source: 'clickup',
            list_name: t.list?.name ?? '',
            url: t.url ?? null,
            tags: (t.tags ?? []).map((tg: any) => tg.name),
          })
        }
      }
    } catch (e) {
      console.error('ClickUp fetch error:', e)
    }
  }

  // Sort: overdue first, then by due date, then no due date, then by priority
  allTasks.sort((a, b) => {
    const now = Date.now()
    const aOverdue = a.due_date && a.due_date < now
    const bOverdue = b.due_date && b.due_date < now
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    if (a.due_date && b.due_date) return a.due_date - b.due_date
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    return (a.priority ?? 99) - (b.priority ?? 99)
  })

  const connectedProviders = { clickup: !!resolvedToken }
  const data = { tasks: allTasks, connectedProviders, fetched_at: new Date().toISOString() }

  await supabase.from('widget_cache').upsert(
    { user_id: user.id, widget_key: 'tasks', data, fetched_at: data.fetched_at },
    { onConflict: 'user_id,widget_key' }
  )

  return NextResponse.json({ data, cached: false })
}
