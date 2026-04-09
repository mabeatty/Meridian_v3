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

  const url = `https://api.clickup.com/api/v2/team/${teamId}/task?due_date_lt=${ninetyDaysOut.getTime()}&include_closed=false&subtasks=true&page=0&assignees[]=${memberId}`

  const tasksRes = await fetch(url, { headers: { Authorization: token } })
  const tasks = await tasksRes.json()

  return NextResponse.json({
    token_present: !!token,
    token_prefix: token.slice(0, 8),
    member_id: memberId,
    team_id: teamId,
    tasks_response: tasks,
  })
}
