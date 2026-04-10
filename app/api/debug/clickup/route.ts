import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' })

  const { data: tokenRow } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'clickup')
    .single()

  const token = tokenRow?.access_token ?? process.env.CLICKUP_API_TOKEN
  if (!token) return NextResponse.json({ error: 'No token' })

  const h = { Authorization: token }
  const teamId = '14202243'
  const memberId = '87374906'

  const ninetyDaysOut = new Date()
  ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)

  const overdueUrl = `https://api.clickup.com/api/v2/team/${teamId}/task?due_date_lt=${Date.now()}&include_closed=false&subtasks=true&page=0&assignees[]=${memberId}`
  const upcomingUrl = `https://api.clickup.com/api/v2/team/${teamId}/task?due_date_lt=${ninetyDaysOut.getTime()}&include_closed=false&subtasks=true&page=0&assignees[]=${memberId}`

  const [overdueRes, upcomingRes] = await Promise.all([
    fetch(overdueUrl, { headers: h }).then(r => r.json()),
    fetch(upcomingUrl, { headers: h }).then(r => r.json()),
  ])

  return NextResponse.json({
    overdue_count: overdueRes.tasks?.length ?? 0,
    overdue_error: overdueRes.err ?? null,
    upcoming_count: upcomingRes.tasks?.length ?? 0,
    upcoming_error: upcomingRes.err ?? null,
    overdue_sample: overdueRes.tasks?.slice(0, 3).map((t: any) => t.name) ?? [],
    upcoming_sample: upcomingRes.tasks?.slice(0, 3).map((t: any) => t.name) ?? [],
  })
}
