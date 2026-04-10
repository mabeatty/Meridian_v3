import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.CLICKUP_API_TOKEN
  const memberId = process.env.CLICKUP_MEMBER_ID

  if (!token) return NextResponse.json({ error: 'No CLICKUP_API_TOKEN in env' })

  const teamsRes = await fetch('https://api.clickup.com/api/v2/team', {
    headers: { Authorization: token }
  })
  const teams = await teamsRes.json()
  const teamId = teams.teams?.[0]?.id

  if (!teamId) return NextResponse.json({ error: 'No team found', teams })

  const ninetyDaysOut = new Date()
  ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)

  const params = new URLSearchParams({
    due_date_lt: ninetyDaysOut.getTime().toString(),
    include_closed: 'false',
    subtasks: 'true',
    page: '0',
  })
  if (memberId) params.append('assignees[]', memberId)

  const url = `https://api.clickup.com/api/v2/team/${teamId}/task?${params}`
  const tasksRes = await fetch(url, { headers: { Authorization: token } })
  const tasks = await tasksRes.json()

  return NextResponse.json({
    token_present: !!token,
    token_prefix: token.slice(0, 8),
    member_id: memberId ?? 'NOT SET',
    team_id: teamId,
    task_count: tasks.tasks?.length ?? 0,
    tasks_error: tasks.err ?? null,
  })
}
