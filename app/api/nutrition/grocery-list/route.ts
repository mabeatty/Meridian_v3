import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meal_plan_id } = await req.json()

  // Get meal plan with all recipes and ingredients
  const { data: plan } = await supabase
    .from('meal_plans')
    .select(`
      name,
      meal_plan_entries(
        recipes(
          name, servings,
          recipe_ingredients(name, quantity, unit)
        )
      )
    `)
    .eq('id', meal_plan_id)
    .eq('user_id', user.id)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // Consolidate all ingredients
  const allIngredients: string[] = []
  for (const entry of (plan as any).meal_plan_entries ?? []) {
    const recipe = entry.recipes
    if (!recipe) continue
    for (const ing of recipe.recipe_ingredients ?? []) {
      allIngredients.push(`${ing.quantity} ${ing.unit} ${ing.name}`)
    }
  }

  try {
    // Use Claude to consolidate and categorize
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
          content: `Consolidate this grocery list by combining duplicate ingredients and categorizing them.

Ingredients:
${allIngredients.join('\n')}

Return ONLY a JSON object with categories as keys and arrays of consolidated items as values.
Categories: "Produce", "Protein", "Dairy", "Grains", "Pantry", "Frozen", "Other"

Each item should be a string like "2 lbs chicken breast" or "3 cups brown rice".
Combine duplicates intelligently (e.g. two entries of "1 cup rice" and "2 cups rice" become "3 cups rice").`
        }],
      }),
    })

    const aiData = await res.json()
    const text = aiData.content?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const items = JSON.parse(clean)

    // Save grocery list
    const { data: list, error } = await supabase
      .from('grocery_lists')
      .insert({
        user_id: user.id,
        meal_plan_id,
        name: `Grocery list — ${(plan as any).name}`,
        items,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: list })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}