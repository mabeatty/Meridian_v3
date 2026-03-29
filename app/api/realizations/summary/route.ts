import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realizations } = await supabase
    .from('realizations')
    .select('headline, clinical_summary, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!realizations?.length) {
    return NextResponse.json({ error: 'No realizations yet' }, { status: 400 })
  }

  const realizationsText = realizations.map((r, i) =>
    `Realization ${i + 1} (${new Date(r.created_at).toLocaleDateString()}):\n${r.headline}\n${r.clinical_summary}`
  ).join('\n\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a thoughtful psychotherapist writing a longitudinal reflection for someone you deeply respect and have followed closely on their growth journey.

Based on the following series of realizations made over time, write a warm but psychologically substantive executive summary of this person's development.

This is not a clinical discharge summary — it is a meaningful, humanistic account of real growth. Use proper psychological concepts naturally (schemas, regulation, attachment, cognitive patterns, self-concept) but write with genuine warmth and directness. Speak to the person, not about them. Acknowledge both the difficulty of the work and the significance of what has shifted. 3-5 paragraphs. Begin with their overall arc, then move through key themes, and close with a forward-looking reflection on where this growth is taking them.

Realizations:
${realizationsText}`
        }],
      }),
    })

    const aiData = await res.json()
    const summary = aiData.content?.[0]?.text ?? ''

    await supabase.from('widget_cache').upsert({
      user_id: user.id,
      widget_key: 'psychology_summary',
      data: { summary, generated_at: new Date().toISOString() },
      fetched_at: new Date().toISOString(),
    }, { onConflict: 'user_id,widget_key' })

    return NextResponse.json({ summary })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('widget_cache')
    .select('data, fetched_at')
    .eq('user_id', user.id)
    .eq('widget_key', 'psychology_summary')
    .single()

  return NextResponse.json({ data: data?.data ?? null })
}