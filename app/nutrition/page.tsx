import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { NutritionClient } from './NutritionClient'

export default async function NutritionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, recipesRes, profileNameRes] = await Promise.all([
    supabase.from('nutrition_profiles').select('*').eq('user_id', user!.id).single(),
    supabase.from('recipes').select('*, recipe_ingredients(*)').eq('user_id', user!.id).order('rating', { ascending: false, nullsFirst: false }),
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profileNameRes.data?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <NutritionClient
          initialProfile={profileRes.data}
          initialRecipes={recipesRes.data ?? []}
        />
      </div>
    </div>
  )
}