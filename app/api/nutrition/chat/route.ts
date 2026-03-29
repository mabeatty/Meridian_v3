import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = new URL(req.url).searchParams.get('week_start')
  if (!weekStart) return NextResponse.json({ error: 'Missing week_start' }, { status: 400 })

  const { data } = await supabase
    .from('nutrition_conversations')
    .select('messages')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  return NextResponse.json({ messages: data?.messages ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, week_start, history } = await req.json()

  // Get all context
  const [profileRes, healthRes, feedbackRes, libraryRes] = await Promise.all([
    supabase.from('nutrition_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('health_metrics').select('*').eq('user_id', user.id).order('metric_date', { ascending: false }).limit(3),
    supabase.from('recipe_feedback').select('recipe_name, rating, notes').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('recipes').select('name, meal_type, total_calories, total_protein, total_carbs, total_fat, rating').eq('user_id', user.id).order('rating', { ascending: false, nullsFirst: false }).limit(20),
  ])

  const profile = profileRes.data
  const health = healthRes.data?.[0]
  const feedback = feedbackRes.data ?? []
  const library = libraryRes.data ?? []

  const systemPrompt = `You are a personal performance nutritionist and meal planning assistant. You have full context about this person and help them plan their nutrition for the week.

USER PROFILE:
- Height: ${profile?.height_inches ? `${Math.floor(profile.height_inches/12)}'${Math.round(profile.height_inches%12)}"` : 'unknown'}
- Weight: ${profile?.weight_lbs ? `${profile.weight_lbs} lbs` : 'unknown'}
- Body fat: ${profile?.body_fat_pct ? `${profile.body_fat_pct}%` : 'unknown'}
- Goal: ${profile?.goal ?? 'maintain'}
- Activity: ${profile?.activity_baseline ?? 'moderate'}
- Health conditions: ${profile?.health_conditions?.join(', ') || 'none'}
- Dietary restrictions: ${profile?.dietary_restrictions?.join(', ') || 'none'}
- Foods loved: ${profile?.foods_loved?.join(', ') || 'none'}
- Foods avoided: ${profile?.foods_avoided?.join(', ') || 'none'}
- Weekly context: ${profile?.weekly_context ?? 'normal week'}
- Calorie target: ${profile?.target_calories ?? 'not set'}
- Protein target: ${profile?.target_protein ?? 'not set'}g

LATEST WHOOP DATA:
- Recovery: ${health?.recovery_score ?? 'unknown'}
- HRV: ${health?.hrv ? Math.round(health.hrv) + 'ms' : 'unknown'}
- Sleep: ${health?.sleep_hours ? health.sleep_hours.toFixed(1) + ' hrs' : 'unknown'}
- Strain: ${health?.strain ?? 'unknown'}
- Date: ${health?.metric_date ?? 'unknown'}

RECIPE LIBRARY (${library.length} recipes):
${library.map(r => `- ${r.name} (${r.meal_type?.join('/')}): ${r.total_calories} cal, ${r.total_protein}g P, ${r.total_carbs}g C, ${r.total_fat}g F${r.rating ? ` — rated ${r.rating}/5` : ''}`).join('\n') || 'No recipes saved yet'}

RECIPE FEEDBACK HISTORY:
${feedback.map(f => `- ${f.recipe_name}: ${f.rating}/5${f.notes ? ` — "${f.notes}"` : ''}`).join('\n') || 'No feedback yet'}

WEEK: ${week_start}

When generating recipes, return them in this EXACT JSON format embedded in your response. Wrap recipe JSON in <recipes> tags:
<recipes>
[
  {
    "name": "Recipe Name",
    "description": "Brief description",
    "meal_type": ["dinner"],
    "servings": 4,
    "instructions": "Step 1...\nStep 2...",
    "tags": ["high-protein"],
    "ingredients": [
      {"name": "chicken breast", "quantity": 200, "unit": "g"},
      {"name": "brown rice", "quantity": 1, "unit": "cup"}
    ],
    "estimated_calories": 450,
    "estimated_protein": 40,
    "estimated_carbs": 35,
    "estimated_fat": 12
  }
]
</recipes>

You can include regular conversational text before and after the <recipes> tags. Always be warm, direct and personalized. Reference their health data and goals naturally. If they ask for recipes from their library, reference them by name. Keep responses concise.`

  try {
    const messages = [
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      }),
    })

    const aiData = await res.json()
    const responseText = aiData.content?.[0]?.text ?? ''

    // Extract recipes if present
    const recipesMatch = responseText.match(/<recipes>([\s\S]*?)<\/recipes>/)
    let recipes = null
    let cleanText = responseText

    if (recipesMatch) {
      try {
        recipes = JSON.parse(recipesMatch[1].trim())
        cleanText = responseText.replace(/<recipes>[\s\S]*?<\/recipes>/, '').trim()
      } catch {
        recipes = null
      }
    }

    // Save conversation
    const newHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: responseText },
    ]

    await supabase.from('nutrition_conversations').upsert({
      user_id: user.id,
      week_start,
      messages: newHistory,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' })

    return NextResponse.json({ text: cleanText, recipes })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}