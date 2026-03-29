'use client'

import { useState } from 'react'

interface NutritionProfile {
  height_inches: number | null
  weight_lbs: number | null
  body_fat_pct: number | null
  goal: string | null
  activity_baseline: string | null
  health_conditions: string[]
  dietary_restrictions: string[]
  foods_loved: string[]
  foods_avoided: string[]
  weekly_context: string | null
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fat: number | null
}

interface Recipe {
  id: string
  name: string
  description: string
  meal_type: string[]
  servings: number
  instructions: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  rating: number | null
  tags: string[]
  recipe_ingredients: Ingredient[]
}

interface Ingredient {
  name: string
  quantity: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-2 border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center bg-surface-3 rounded-md px-3 py-2">
      <span className="text-sm font-mono font-medium" style={{ color }}>{Math.round(value)}{unit}</span>
      <span className="text-[10px] text-text-tertiary mt-0.5">{label}</span>
    </div>
  )
}

function StarRating({ rating, onRate }: { rating: number | null; onRate: (r: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onRate(n)}
          className={`text-base transition-colors ${n <= (rating ?? 0) ? 'text-accent-amber' : 'text-text-dim hover:text-accent-amber'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function RecipeCard({ recipe, onRate, onDelete }: {
  recipe: Recipe
  onRate: (id: string, rating: number) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-surface-3 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-text-primary">{recipe.name}</span>
              {recipe.meal_type.map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-tertiary capitalize">{t}</span>
              ))}
            </div>
            <p className="text-xs text-text-tertiary mt-0.5 leading-snug">{recipe.description}</p>
          </div>
          <span className="text-text-tertiary text-xs">{expanded ? '↑' : '↓'}</span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <MacroPill label="Cal" value={recipe.total_calories} unit="" color="#e8e8e8" />
          <MacroPill label="Protein" value={recipe.total_protein} unit="g" color="#4ade80" />
          <MacroPill label="Carbs" value={recipe.total_carbs} unit="g" color="#60a5fa" />
          <MacroPill label="Fat" value={recipe.total_fat} unit="g" color="#fbbf24" />
          <div className="ml-auto">
            <StarRating rating={recipe.rating} onRate={r => onRate(recipe.id, r)} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 flex flex-col gap-3">
          {/* Ingredients */}
          <div>
            <span className="widget-label">Ingredients ({recipe.servings} serving{recipe.servings > 1 ? 's' : ''})</span>
            <div className="mt-2 flex flex-col gap-1">
              {recipe.recipe_ingredients?.map((ing, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{ing.quantity} {ing.unit} {ing.name}</span>
                  <span className="text-text-tertiary font-mono">{ing.calories} cal</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <span className="widget-label">Instructions</span>
            <div className="mt-2 flex flex-col gap-1">
              {recipe.instructions.split('\n').filter(Boolean).map((step, i) => (
                <p key={i} className="text-xs text-text-secondary leading-relaxed">{step}</p>
              ))}
            </div>
          </div>

          {/* Tags */}
          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-text-tertiary">{tag}</span>
              ))}
            </div>
          )}

          <button
            onClick={() => onDelete(recipe.id)}
            className="text-xs text-accent-red hover:text-accent-red/80 w-fit"
          >
            Delete recipe
          </button>
        </div>
      )}
    </div>
  )
}

const EMPTY_PROFILE: NutritionProfile = {
  height_inches: null, weight_lbs: null, body_fat_pct: null,
  goal: 'maintain', activity_baseline: 'moderate',
  health_conditions: [], dietary_restrictions: [],
  foods_loved: [], foods_avoided: [],
  weekly_context: null,
  target_calories: null, target_protein: null, target_carbs: null, target_fat: null,
}

export function NutritionClient({ initialProfile, initialRecipes }: {
  initialProfile: NutritionProfile | null
  initialRecipes: Recipe[]
}) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [profile, setProfile] = useState<NutritionProfile>(initialProfile ?? EMPTY_PROFILE)
  const [activeTab, setActiveTab] = useState<'recipes' | 'meal-plan' | 'profile'>('recipes')
  const [showProfile, setShowProfile] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedRecipes, setGeneratedRecipes] = useState<any[]>([])
  const [context, setContext] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Profile array field helpers
  const [conditionInput, setConditionInput] = useState('')
  const [restrictionInput, setRestrictionInput] = useState('')
  const [lovedInput, setLovedInput] = useState('')
  const [avoidedInput, setAvoidedInput] = useState('')

  function addToArray(field: keyof NutritionProfile, value: string) {
    if (!value.trim()) return
    setProfile(p => ({ ...p, [field]: [...(p[field] as string[]), value.trim()] }))
  }

  function removeFromArray(field: keyof NutritionProfile, value: string) {
    setProfile(p => ({ ...p, [field]: (p[field] as string[]).filter(v => v !== value) }))
  }

  async function saveProfile() {
    setSavingProfile(true)
    await fetch('/api/nutrition/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
    setSavingProfile(false)
    setShowProfile(false)
  }

  async function generateRecipes() {
    setGenerating(true)
    const res = await fetch('/api/nutrition/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    }).then(r => r.json())

    if (res.data) setGeneratedRecipes(res.data)
    setGenerating(false)
  }

  async function saveRecipe(recipe: any) {
    const { ingredients, ...recipeData } = recipe
    const res = await fetch('/api/nutrition/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...recipeData, ingredients }),
    }).then(r => r.json())

    if (res.data) {
      setRecipes(prev => [{ ...res.data, recipe_ingredients: ingredients }, ...prev])
      setGeneratedRecipes(prev => prev.filter(r => r.name !== recipe.name))
    }
  }

  async function rateRecipe(id: string, rating: number) {
    await fetch('/api/nutrition/recipes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, rating }),
    })
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, rating } : r))
  }

  async function deleteRecipe(id: string) {
    await fetch(`/api/nutrition/recipes?id=${id}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="max-w-4xl flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-primary font-medium">Nutrition</h2>
          <p className="text-text-tertiary text-xs mt-0.5">{recipes.length} recipes in your library</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowProfile(true)} className="btn-connect">
            {initialProfile ? 'edit profile' : 'set up profile'}
          </button>
        </div>
      </div>

      {/* No profile warning */}
      {!initialProfile && (
        <div className="bg-surface-2 border border-accent-amber/30 rounded-lg px-4 py-3 text-xs text-accent-amber">
          Set up your nutrition profile first so Claude can generate personalized recipes for you.
        </div>
      )}

      {/* Generate recipes */}
      <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
        <span className="widget-label">Generate recipes</span>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="Any additional context for this generation? e.g. 'I have a long run tomorrow', 'keeping it simple this week', 'craving something warm and savory'..."
          rows={3}
          className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                     placeholder:text-text-tertiary focus:outline-none focus:border-border-strong
                     resize-none transition-colors"
        />
        <button
          onClick={generateRecipes}
          disabled={generating}
          className="btn-primary w-fit"
        >
          {generating ? 'Generating recipes...' : 'Generate 3 recipes'}
        </button>
      </div>

      {/* Generated recipes — pending save */}
      {generatedRecipes.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="widget-label">Generated — save what you want</span>
          {generatedRecipes.map((recipe, i) => (
            <div key={i} className="bg-surface-2 border border-accent/20 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{recipe.name}</span>
                    {recipe.meal_type?.map((t: string) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-tertiary capitalize">{t}</span>
                    ))}
                  </div>
                  <p className="text-xs text-text-tertiary mt-0.5">{recipe.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MacroPill label="Cal" value={recipe.total_calories} unit="" color="#e8e8e8" />
                <MacroPill label="Protein" value={recipe.total_protein} unit="g" color="#4ade80" />
                <MacroPill label="Carbs" value={recipe.total_carbs} unit="g" color="#60a5fa" />
                <MacroPill label="Fat" value={recipe.total_fat} unit="g" color="#fbbf24" />
              </div>

              <div>
                <span className="widget-label">Ingredients</span>
                <div className="mt-1.5 flex flex-col gap-1">
                  {recipe.ingredients?.map((ing: any, j: number) => (
                    <div key={j} className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">{ing.quantity} {ing.unit} {ing.name}</span>
                      <span className="text-text-tertiary font-mono">{ing.calories} cal · {ing.protein}g P</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => saveRecipe(recipe)} className="btn-primary">
                  Save recipe
                </button>
                <button
                  onClick={() => setGeneratedRecipes(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-xs text-text-tertiary hover:text-text-secondary"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe library */}
      {recipes.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="widget-label">Recipe library ({recipes.length})</span>
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onRate={rateRecipe}
              onDelete={deleteRecipe}
            />
          ))}
        </div>
      )}

      {recipes.length === 0 && !generating && (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <span className="text-text-tertiary text-sm">No recipes yet</span>
          <span className="text-text-dim text-xs">Generate some recipes above to get started</span>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && (
        <Modal onClose={() => setShowProfile(false)}>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-medium">Nutrition profile</h3>
              <button onClick={() => setShowProfile(false)} className="text-text-tertiary hover:text-text-primary text-lg">×</button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Height (inches)', key: 'height_inches', type: 'number', placeholder: '70' },
                { label: 'Weight (lbs)', key: 'weight_lbs', type: 'number', placeholder: '180' },
                { label: 'Body fat %', key: 'body_fat_pct', type: 'number', placeholder: '15' },
                { label: 'Target calories', key: 'target_calories', type: 'number', placeholder: '2400' },
                { label: 'Target protein (g)', key: 'target_protein', type: 'number', placeholder: '180' },
                { label: 'Target carbs (g)', key: 'target_carbs', type: 'number', placeholder: '250' },
                { label: 'Target fat (g)', key: 'target_fat', type: 'number', placeholder: '80' },
              ].map(f => (
                <div key={f.key} className="flex flex-col gap-1">
                  <label className="widget-label">{f.label}</label>
                  <input
                    type="text"
                    value={(profile as any)[f.key] ?? ''}
                    onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder={f.placeholder}
                    className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                               placeholder:text-text-tertiary focus:outline-none focus:border-border-strong font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="widget-label">Goal</label>
                <select
                  value={profile.goal ?? 'maintain'}
                  onChange={e => setProfile(p => ({ ...p, goal: e.target.value }))}
                  className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none"
                >
                  <option value="cut">Cut (lose fat)</option>
                  <option value="maintain">Maintain</option>
                  <option value="bulk">Bulk (gain muscle)</option>
                  <option value="recomp">Recomp</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="widget-label">Activity baseline</label>
                <select
                  value={profile.activity_baseline ?? 'moderate'}
                  onChange={e => setProfile(p => ({ ...p, activity_baseline: e.target.value }))}
                  className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="very_active">Very active</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="widget-label">Weekly context (optional)</label>
              <input
                value={profile.weekly_context ?? ''}
                onChange={e => setProfile(p => ({ ...p, weekly_context: e.target.value }))}
                placeholder="e.g. heavy training week, traveling, low energy..."
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                           placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
              />
            </div>

            {/* Array fields */}
            {[
              { label: 'Health conditions', field: 'health_conditions' as keyof NutritionProfile, input: conditionInput, setInput: setConditionInput, placeholder: 'e.g. ADHD, hypertension' },
              { label: 'Dietary restrictions', field: 'dietary_restrictions' as keyof NutritionProfile, input: restrictionInput, setInput: setRestrictionInput, placeholder: 'e.g. no dairy, gluten-free' },
              { label: 'Foods you love', field: 'foods_loved' as keyof NutritionProfile, input: lovedInput, setInput: setLovedInput, placeholder: 'e.g. salmon, sweet potato' },
              { label: 'Foods to avoid', field: 'foods_avoided' as keyof NutritionProfile, input: avoidedInput, setInput: setAvoidedInput, placeholder: 'e.g. brussels sprouts' },
            ].map(f => (
              <div key={f.field as string} className="flex flex-col gap-1.5">
                <label className="widget-label">{f.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    value={f.input}
                    onChange={e => f.setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addToArray(f.field, f.input)
                        f.setInput('')
                      }
                    }}
                    placeholder={`${f.placeholder} + Enter`}
                    className="bg-surface-3 border border-border rounded-md px-3 py-1.5 text-xs text-text-primary
                               placeholder:text-text-tertiary focus:outline-none flex-1"
                  />
                </div>
                {(profile[f.field] as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(profile[f.field] as string[]).map(v => (
                      <span key={v} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-text-secondary">
                        {v}
                        <button onClick={() => removeFromArray(f.field, v)} className="text-text-tertiary hover:text-accent-red">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button onClick={saveProfile} disabled={savingProfile} className="btn-primary">
              {savingProfile ? 'Saving...' : profileSaved ? '✓ Saved' : 'Save profile'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}