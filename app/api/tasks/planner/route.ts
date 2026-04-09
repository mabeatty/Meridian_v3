import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clickup_tasks, context, manual_tasks } = await req.json()

  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  })

  const systemPrompt = `You are an expert executive assistant and project planner. Your job is to analyze a professional's workload and generate a realistic, prioritized weekly plan.

You understand that:
- Due dates on tasks rarely mean "do this on the due date" — they mean work must happen BEFORE the due date
- Complex tasks (surveys, proposals, reports, contracts) require multi-week lead time with dependent steps
- A person can realistically complete 3-5 meaningful work items per day alongside meetings and email
- Urgency and importance are different axes — you weigh both
- Some tasks require external parties (contractors, clients, surveyors) and need earlier action to account for response time

Today is ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
The next 7 days are: ${weekDays.join(', ')}.

Respond ONLY with valid JSON in this exact format, no preamble, no markdown:
{
  "week_summary": "2-3 sentence summary of the week's priorities and any critical deadlines",
  "days": [
    {
      "date": "Monday, Apr 14",
      "focus": "One sentence theme for the day",
      "tasks": [
        {
          "title": "Task name",
          "source": "clickup or manual",
          "clickup_id": "task id if from clickup, null otherwise",
          "reasoning": "1-2 sentences on why this task is on this day and what action to take",
          "estimated_time": "30min / 1hr / 2hr / half day",
          "priority": "urgent / high / normal"
        }
      ]
    }
  ],
  "flagged": [
    {
      "title": "Task name",
      "source": "clickup or manual",
      "clickup_id": "id or null",
      "concern": "What needs attention — overdue, missing lead time, blocked, etc"
    }
  ]
}`

  const userMessage = `Here is my current workload. Please generate a prioritized weekly plan.

${context ? `## My Work Context\n${context}\n\n` : ''}## ClickUp Tasks (${clickup_tasks?.length ?? 0} tasks)
${(clickup_tasks ?? []).map((t: any) => `- [${t.id}] "${t.name}"
  Status: ${t.status} | Priority: ${t.priority ?? 'none'} | Due: ${t.due_date_formatted ?? 'no due date'}
  List: ${t.list_name}${t.folder_name ? ` / ${t.folder_name}` : ''}
  ${t.description ? `Description: ${t.description.slice(0, 200)}` : ''}
  ${t.overdue ? '⚠️ OVERDUE' : ''}`).join('\n\n')}

## Manual Tasks (${manual_tasks?.length ?? 0} tasks)
${(manual_tasks ?? []).map((t: any) => `- "${t.name}"${t.due_date ? ` | Due: ${new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`).join('\n')}

Based on this workload and my context, please:
1. Generate a realistic day-by-day plan for the next 5 working days
2. Flag any tasks that need immediate attention or are at risk
3. Apply your knowledge of how long different types of work typically take to reason about lead times`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''

    // Parse JSON response
    const clean = text.replace(/```json|```/g, '').trim()
    const plan = JSON.parse(clean)

    // Save the plan to cache
    await supabase.from('widget_cache').upsert(
      {
        user_id: user.id,
        widget_key: 'weekly_plan',
        data: { plan, generated_at: new Date().toISOString() },
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,widget_key' }
    )

    return NextResponse.json({ plan })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('widget_cache')
    .select('data,fetched_at')
    .eq('user_id', user.id)
    .eq('widget_key', 'weekly_plan')
    .single()

  return NextResponse.json({
    plan: data?.data?.plan ?? null,
    generated_at: data?.data?.generated_at ?? null,
  })
}
