import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'tasks').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 2) return NextResponse.json({ data: cached.data, cached: true })

const clickupToken = process.env.CLICKUP_API_TOKEN
console.log('CLICKUP_API_TOKEN present:', !!clickupToken, 'value starts with:', clickupToken?.slice(0, 5))
  if (!clickupToken) return NextResponse.json({ data: null, error: 'not_connected', cached: false })
    
const h = { Authorization: clickupToken }
  try {
    const teams = await fetch('https://api.clickup.com/api/v2/team', { headers: h }).then(r => r.json())
    console.log('ClickUp teams response:', JSON.stringify(teams, null, 2))
    const teamId = teams.teams?.[0]?.id
    console.log('Team ID:', teamId)
    if (!teamId) throw new Error('No workspace')
      const sevenDaysOut = new Date(); sevenDaysOut.setDate(sevenDaysOut.getDate() + 7); sevenDaysOut.setHours(23, 59, 59, 999)
    const td = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/task?due_date_lt=${sevenDaysOut.getTime()}&include_closed=false&subtasks=true&page=0&assignees[]=87374906`, { headers: h }).then(r => r.json())
    console.log('ClickUp raw tasks:', JSON.stringify(td, null, 2))
    const tasks = (td.tasks ?? []).slice(0, 20).map((t: any) => ({ id: t.id, name: t.name, status: t.status?.status ?? 'unknown', priority: t.priority?.priority ? parseInt(t.priority.priority) : null, due_date: t.due_date ? parseInt(t.due_date) : null, list_name: t.list?.name ?? '', url: t.url ?? '', tags: (t.tags ?? []).map((tg: any) => tg.name) }))
    const data = { tasks, fetched_at: new Date().toISOString() }
    await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'tasks', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
    return NextResponse.json({ data, cached: false })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
