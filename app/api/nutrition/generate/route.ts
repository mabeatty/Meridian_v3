import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function lookupUSDA(ingredientName: string): Promise<any> {
  try {
    const apiKey = process.env.USDA_API_KEY ?? 'DEMO_KEY'
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ingredientName)}&pageSize=1&api_key=${apiKey}`
    )
    const data = await res.json()
    const food = data.foods?.[0]
    if (!food) return null

    const getNutrient = (id: number) =>
      food.foodNutrients?.find((n: any) => n.nutrientId === id)?.value ?? 0

    return {
      name: ingredientName,
      usda_fdc_id: food.fdcId?.toString(),
      calories: getNutrient(1008),
      protein: getNutrient(1003),
      carbs: getNutrient(1005),
      fat: getNutrient(1004),
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { context } = await req.json()

  // Get nutrition profile
  const { data: profile } = await supabase
    .from('nutrition_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Get latest Whoop data
  const { data: latestHealth } = await supabase
    .from('health_metrics')
    .select('recovery_score, strain, sleep_hours')
    .eq('user_id', user.id)
    .order('metric_date', { ascending: false })
    .limit(1)
    .single()

  // Get liked recipes to avoid repetition
  const { data: likedRecipes } = await supabase
    .from('recipes')
    .select('name, rating')
    .eq('user_id', user.id)
    .gte('rating', 4)
    .order('rating', { ascending: false })
    .limit(10)

  const profileContext = profile ? `
User profile:
- Height: ${profile.height_inches ? `${Math.floor(profile.height_inches/12)}'${profile.height_inches%12}"` : 'unknown'}
- Weight: ${profile.weight_lbs ? `${profile.weight_lbs} lbs` : 'unknown'}
- Body fat: ${profile.body_fat_pct ? `${profile.body_fat_pct}%` : 'unknown'}
- Goal: ${profile.goal ?? 'maintain'}
- Activity level: ${profile.activity_baseline ?? 'moderate'}
- Health conditions: ${profile.health_conditions?.join(', ') || 'none'}
- Dietary restrictions: ${profile.dietary_restrictions?.join(', ') || 'none'}
- Foods loved: ${profile.foods_loved?.join(', ') || 'none specified'}
- Foods avoided: ${profile.foods_avoided?.join(', ') || 'none'}
- Target calories: ${profile.target_calories ?? 'not set'}
- Target protein: ${profile.target_protein ?? 'not set'}g
- Weekly context: ${profile.weekly_context ?? 'normal week'}
` : 'No profile set — use balanced nutrition defaults'

  const whoopContext = latestHealth ? `
Today's Whoop data:
- Recovery score: ${latestHealth.recovery_score ?? 'unknown'}
- Strain: ${latestHealth.strain ?? 'unknown'}
- Sleep: ${latestHealth.sleep_hours ? `${latestHealth.sleep_hours.toFixed(1)} hrs` : 'unknown'}
` : ''

  const likedContext = likedRecipes?.length
    ? `Previously liked recipes (suggest similar styles): ${likedRecipes.map(r => r.name).join(', ')}`
    : ''

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
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are a performance nutritionist creating personalized recipes.

${profileContext}
${whoopContext}
${likedContext}

Additional context from user: ${context || 'None'}

Generate exactly 3 recipes tailored to this person. Consider their recovery score and strain when choosing meal types and calorie density. High strain days need more carbs and calories. Low recovery days benefit from anti-inflammatory foods.

Return ONLY a JSON array of 3 recipe objects. Each object must have exactly these fields:
- "name": string
- "description": string (1-2 sentences, why this fits their goals)
- "meal_type": array of strings (from: "breakfast", "lunch", "dinner", "snack")
- "servings": number
- "instructions": string (step by step, separated by newlines)
- "tags": array of strings (e.g. "high-protein", "anti-inflammatory", "quick")
- "ingredients": array of objects, each with:
  - "name": string (specific ingredient name for USDA lookup)
  - "quantity": number
  - "unit": string (e.g. "g", "oz", "cup", "tbsp")

Be specific with ingredient names for accurate USDA database lookup. Use common ingredient names.`
        }],
      }),
    })

    const aiData = await res.json()
    const text = aiData.content?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const recipes = JSON.parse(clean)

    // Look up USDA data for each ingredient
    const recipesWithMacros = await Promise.all(recipes.map(async (recipe: any) => {
      const ingredientsWithMacros = await Promise.all(
        recipe.ingredients.map(async (ing: any) => {
          const usda = await lookupUSDA(ing.name)
          if (!usda) return { ...ing, calories: 0, protein: 0, carbs: 0, fat: 0 }

          // Scale to quantity (USDA data is per 100g)
          const scale = ing.unit === 'g' ? ing.quantity / 100
            : ing.unit === 'oz' ? (ing.quantity * 28.35) / 100
            : ing.unit === 'cup' ? (ing.quantity * 240) / 100
            : ing.unit === 'tbsp' ? (ing.quantity * 15) / 100
            : ing.unit === 'tsp' ? (ing.quantity * 5) / 100
            : 1

          return {
            ...ing,
            usda_fdc_id: usda.usda_fdc_id,
            calories: Math.round(usda.calories * scale),
            protein: Math.round(usda.protein * scale * 10) / 10,
            carbs: Math.round(usda.carbs * scale * 10) / 10,
            fat: Math.round(usda.fat * scale * 10) / 10,
          }
        })
      )

      const totals = ingredientsWithMacros.reduce((acc, ing) => ({
        calories: acc.calories + ing.calories,
        protein: acc.protein + ing.protein,
        carbs: acc.carbs + ing.carbs,
        fat: acc.fat + ing.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

      return {
        ...recipe,
        ingredients: ingredientsWithMacros,
        total_calories: Math.round(totals.calories / recipe.servings),
        total_protein: Math.round(totals.protein / recipe.servings * 10) / 10,
        total_carbs: Math.round(totals.carbs / recipe.servings * 10) / 10,
        total_fat: Math.round(totals.fat / recipe.servings * 10) / 10,
      }
    }))

    return NextResponse.json({ data: recipesWithMacros })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}