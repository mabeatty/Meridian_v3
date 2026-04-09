import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Expanded ClickUp fetch for planner — broader date range, descriptions, all assigned tasks
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tokenRow } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'clickup')
    .single()

  if (!tokenRow?.access_token) {
    return NextResponse.json({ error: 'not_connected', tasks: [] })
  }

  const h = { Authorization: tokenRow.access_token }

  try {
    const teams = await fetch('https://api.clickup.com/api/v2/team', { headers: h }).then(r => r.json())
    const teamId = teams.teams?.[0]?.id
    if (!teamId) return NextResponse.json({ error: 'No workspace', tasks: [] })

    // Find the user's ClickUp member ID
    const memberId = teams.teams?.[0]?.members?.find(
      (m: any) => m.user?.email === user.email
    )?.user?.id

    // Fetch tasks due in next 90 days (broad enough for planning)
    const ninetyDaysOut = new Date()
    ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)

    const params = new URLSearchParams({
      due_date_lt: ninetyDaysOut.getTime().toString(),
      include_closed: 'false',
      subtasks: 'true',
      page: '0',
    })
    if (memberId) params.append('assignees[]', memberId)

    const td = await fetch(
      `https://api.clickup.com/api/v2/team/${teamId}/task?${params}`,
      { headers: h }
    ).then(r => r.json())

    const tasks = (td.tasks ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      status: t.status?.status ?? 'unknown',
      priority: t.priority?.priority ? parseInt(t.priority.priority) : null,
      due_date: t.due_date ? parseInt(t.due_date) : null,
      due_date_formatted: t.due_date
        ? new Date(parseInt(t.due_date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null,
      list_name: t.list?.name ?? '',
      folder_name: t.folder?.name ?? '',
      space_name: t.space?.name ?? '',
      url: t.url ?? null,
      tags: (t.tags ?? []).map((tg: any) => tg.name),
    }))

    // Also fetch overdue (no due_date filter, just get open tasks with past due dates)
    const overdueTd = await fetch(
      `https://api.clickup.com/api/v2/team/${teamId}/task?due_date_lt=${Date.now()}&include_closed=false&subtasks=true&page=0${memberId ? `&assignees[]=${memberId}` : ''}`,
      { headers: h }
    ).then(r => r.json())

    const overdueTasks = (overdueTd.tasks ?? [])
      .filter((t: any) => !tasks.find((existing: any) => existing.id === t.id))
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? '',
        status: t.status?.status ?? 'unknown',
        priority: t.priority?.priority ? parseInt(t.priority.priority) : null,
        due_date: t.due_date ? parseInt(t.due_date) : null,
        due_date_formatted: t.due_date
          ? new Date(parseInt(t.due_date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null,
        list_name: t.list?.name ?? '',
        folder_name: t.folder?.name ?? '',
        space_name: t.space?.name ?? '',
        url: t.url ?? null,
        tags: (t.tags ?? []).map((tg: any) => tg.name),
        overdue: true,
      }))

    return NextResponse.json({ tasks: [...overdueTasks, ...tasks] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, tasks: [] }, { status: 500 })
  }
}

// Mark a ClickUp task as closed/complete
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_id, status } = await req.json()
  if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  const { data: tokenRow } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'clickup')
    .single()

  if (!tokenRow?.access_token) return NextResponse.json({ error: 'not_connected' }, { status: 401 })

  try {
    // Get task's available statuses first
    const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${task_id}`, {
      headers: { Authorization: tokenRow.access_token }
    }).then(r => r.json())

    // Use provided status or fall back to 'complete' or 'closed'
    const targetStatus = status ?? taskRes.list?.statuses?.find(
      (s: any) => s.type === 'closed'
    )?.status ?? 'complete'

    const res = await fetch(`https://api.clickup.com/api/v2/task/${task_id}`, {
      method: 'PUT',
      headers: { Authorization: tokenRow.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus }),
    })

    const data = await res.json()
    if (data.err) return NextResponse.json({ error: data.err }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
