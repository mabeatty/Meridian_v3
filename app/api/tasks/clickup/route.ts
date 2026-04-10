import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getClickUpToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', 'clickup')
    .single()
  return tokenRow?.access_token ?? process.env.CLICKUP_API_TOKEN ?? null
}

async function getClickUpMemberId(teams: any, userEmail: string): Promise<string | null> {
  // Try to match by email first
  const byEmail = teams.teams?.[0]?.members?.find(
    (m: any) => m.user?.email === userEmail
  )?.user?.id
  if (byEmail) return String(byEmail)

  // Fall back to CLICKUP_MEMBER_ID env var if set
  if (process.env.CLICKUP_MEMBER_ID) return process.env.CLICKUP_MEMBER_ID

  return null
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getClickUpToken(supabase, user.id)
  if (!token) return NextResponse.json({ error: 'not_connected', tasks: [] })

  const h = { Authorization: token }

  try {
    const teams = await fetch('https://api.clickup.com/api/v2/team', { headers: h }).then(r => r.json())
    const teamId = teams.teams?.[0]?.id ?? process.env.CLICKUP_TEAM_ID
    if (!teamId) return NextResponse.json({ error: 'No workspace', tasks: [] })

    const memberId = await getClickUpMemberId(teams, user.email ?? '')

    const ninetyDaysOut = new Date()
    ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)

    const params = new URLSearchParams({
      due_date_lt: ninetyDaysOut.getTime().toString(),
      include_closed: 'false',
      subtasks: 'true',
      page: '0',
    })
    if (memberId && memberId !== 'undefined') params.append('assignees[]', memberId)

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
      url: t.url ?? null,
      tags: (t.tags ?? []).map((tg: any) => tg.name),
    }))

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
        url: t.url ?? null,
        tags: (t.tags ?? []).map((tg: any) => tg.name),
        overdue: true,
      }))

    return NextResponse.json({ tasks: [...overdueTasks, ...tasks] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, tasks: [] }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_id, status } = await req.json()
  if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  const token = await getClickUpToken(supabase, user.id)
  if (!token) return NextResponse.json({ error: 'not_connected' }, { status: 401 })

  try {
    const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${task_id}`, {
      headers: { Authorization: token }
    }).then(r => r.json())

    const targetStatus = status ?? taskRes.list?.statuses?.find(
      (s: any) => s.type === 'closed'
    )?.status ?? 'complete'

    const res = await fetch(`https://api.clickup.com/api/v2/task/${task_id}`, {
      method: 'PUT',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus }),
    })

    const data = await res.json()
    if (data.err) return NextResponse.json({ error: data.err }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
