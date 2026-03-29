import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { source_text } = await req.json()
  if (!source_text) return NextResponse.json({ error: 'Missing source_text' }, { status: 400 })

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a thoughtful psychotherapist keeping personal growth notes for someone on a meaningful journey of self-discovery.

Analyze the following conversation and extract the key psychological realization or insight.

Return ONLY a JSON object with exactly these two fields:
- "headline": A concise 8-12 word title capturing the core insight. Write it in first person or as a direct statement — not clinical jargon, but psychologically precise. For example: "Recognizing that suffering comes from interpretation, not circumstance" or "Learning to meet the inner critic with curiosity instead of shame"
- "clinical_summary": A 3-5 sentence reflection on this realization written in second person ("you") with warmth and directness. Use proper psychological concepts naturally — cognitive appraisal, self-compassion, schemas, attachment, regulation — but weave them in as a knowledgeable friend would, not as a clinician filing a report. Acknowledge the significance of the insight without being sterile or distant. Write as if you genuinely know this person and are moved by their growth.

Conversation:
${source_text.slice(0, 8000)}`
        }],
      }),
    })

    const aiData = await res.json()
    const text = aiData.content?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      headline: parsed.headline,
      clinical_summary: parsed.clinical_summary,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}