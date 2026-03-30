'use client'

import { useState, useEffect, useRef } from 'react'
import { format, startOfWeek } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant'
  content: string
  recipes?: GeneratedRecipe[]
}

interface GeneratedRecipe {
  name: string
  description: string
  meal_type: string[]
  servings: number
  instructions: string
  tags: string[]
  ingredients: { name: string; quantity: number; unit: string }[]
  estimated_calories: number
  estimated_protein: number
  estimated_carbs: number
  estimated_fat: number
  id?: string
}

interface PlannerEntry {
  id: string
  day_of_week: string
  meal_type: string
  servings: number
  recipes: {
    id: string
    name: string
    total_calories: number
    total_protein: number
    total_carbs: number
    total_fat: number
    recipe_ingredients: any[]
  }
}

interface SavedRecipe {
  id: string
  name: string
  description: string
  meal_type: string[]
  servings: number
  instructions: string
  tags: string[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  rating: number | null
  recipe_ingredients: any[]
}

interface GroceryItem {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  category: string
  checked: boolean
  custom: boolean
}

interface NutritionProfile {
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fat: number | null
  goal: string | null
  height_inches: number | null
  weight_lbs: number | null
  body_fat_pct: number | null
  activity_baseline: string | null
  health_conditions: string[]
  dietary_restrictions: string[]
  foods_loved: string[]
  foods_avoided: string[]
  weekly_context: string | null
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
const CATEGORIES = ['Produce', 'Protein', 'Dairy', 'Grains', 'Pantry', 'Frozen', 'Other']
const PANEL_HEIGHT = 600

function getWeekStart(date: Date): string {
  const d = startOfWeek(date, { weekStartsOn: 0 })
  return format(d, 'yyyy-MM-dd')
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-2 border border-border rounded-xl max-w-xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ─── Profile Modal ────────────────────────────────────────────
function ProfileModal({ profile, onSave, onClose }: {
  profile: any
  onSave: (p: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    height_inches: profile?.height_inches ?? '',
    weight_lbs: profile?.weight_lbs ?? '',
    body_fat_pct: profile?.body_fat_pct ?? '',
    goal: profile?.goal ?? 'maintain',
    activity_baseline: profile?.activity_baseline ?? 'moderate',
    weekly_context: profile?.weekly_context ?? '',
    target_calories: profile?.target_calories ?? '',
    target_protein: profile?.target_protein ?? '',
    target_carbs: profile?.target_carbs ?? '',
    target_fat: profile?.target_fat ?? '',
    health_conditions: profile?.health_conditions ?? [],
    dietary_restrictions: profile?.dietary_restrictions ?? [],
    foods_loved: profile?.foods_loved ?? [],
    foods_avoided: profile?.foods_avoided ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [inputs, setInputs] = useState({ condition: '', restriction: '', loved: '', avoided: '' })

  function addTag(field: string, value: string) {
    if (!value.trim()) return
    setForm(p => ({ ...p, [field]: [...(p as any)[field], value.trim()] }))
  }

  function removeTag(field: string, value: string) {
    setForm(p => ({ ...p, [field]: ((p as any)[field] as string[]).filter((v: string) => v !== value) }))
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      height_inches: form.height_inches ? parseFloat(form.height_inches as string) : null,
      weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs as string) : null,
      body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct as string) : null,
      target_calories: form.target_calories ? parseInt(form.target_calories as string) : null,
      target_protein: form.target_protein ? parseInt(form.target_protein as string) : null,
      target_carbs: form.target_carbs ? parseInt(form.target_carbs as string) : null,
      target_fat: form.target_fat ? parseInt(form.target_fat as string) : null,
    }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-medium">Nutrition profile</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary text-lg">×</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Height (inches)', key: 'height_inches', placeholder: '70' },
            { label: 'Weight (lbs)', key: 'weight_lbs', placeholder: '180' },
            { label: 'Body fat %', key: 'body_fat_pct', placeholder: '15' },
            { label: 'Target calories', key: 'target_calories', placeholder: '2400' },
            { label: 'Target protein (g)', key: 'target_protein', placeholder: '180' },
            { label: 'Target carbs (g)', key: 'target_carbs', placeholder: '250' },
            { label: 'Target fat (g)', key: 'target_fat', placeholder: '80' },
          ].map(f => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="widget-label">{f.label}</label>
              <input type="text" value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                           placeholder:text-text-tertiary focus:outline-none focus:border-border-strong font-mono" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="widget-label">Goal</label>
            <select value={form.goal} onChange={e => setForm(p => ({ ...p, goal: e.target.value }))}
              className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none">
              <option value="cut">Cut (lose fat)</option>
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk (gain muscle)</option>
              <option value="recomp">Recomp</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="widget-label">Activity baseline</label>
            <select value={form.activity_baseline} onChange={e => setForm(p => ({ ...p, activity_baseline: e.target.value }))}
              className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none">
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="very_active">Very active</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="widget-label">Weekly context</label>
          <input value={form.weekly_context} onChange={e => setForm(p => ({ ...p, weekly_context: e.target.value }))}
            placeholder="e.g. heavy training week, traveling..."
            className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary
                       placeholder:text-text-tertiary focus:outline-none focus:border-border-strong" />
        </div>
        {[
          { label: 'Health conditions', field: 'health_conditions', inputKey: 'condition', placeholder: 'e.g. ADHD' },
          { label: 'Dietary restrictions', field: 'dietary_restrictions', inputKey: 'restriction', placeholder: 'e.g. no dairy' },
          { label: 'Foods you love', field: 'foods_loved', inputKey: 'loved', placeholder: 'e.g. salmon' },
          { label: 'Foods to avoid', field: 'foods_avoided', inputKey: 'avoided', placeholder: 'e.g. brussels sprouts' },
        ].map(f => (
          <div key={f.field} className="flex flex-col gap-1.5">
            <label className="widget-label">{f.label}</label>
            <input value={(inputs as any)[f.inputKey]}
              onChange={e => setInputs(p => ({ ...p, [f.inputKey]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(f.field, (inputs as any)[f.inputKey]); setInputs(p => ({ ...p, [f.inputKey]: '' })) } }}
              placeholder={`${f.placeholder} + Enter`}
              className="bg-surface-3 border border-border rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none" />
            {((form as any)[f.field] as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {((form as any)[f.field] as string[]).map((v: string) => (
                  <span key={v} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-text-secondary">
                    {v}
                    <button onClick={() => removeTag(f.field, v)} className="text-text-tertiary hover:text-accent-red">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Recipe Card in Chat ──────────────────────────────────────
function ChatRecipeCard({ recipe, onAdd }: {
  recipe: GeneratedRecipe
  onAdd: (recipe: GeneratedRecipe, days: string[], meal: string, servings: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedMeal, setSelectedMeal] = useState(recipe.meal_type?.[0] ?? 'dinner')
  const [servings, setServings] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  async function saveToLibrary() {
    setSaving(true)
    await fetch('/api/nutrition/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: recipe.name, description: recipe.description, meal_type: recipe.meal_type,
        servings: recipe.servings, instructions: recipe.instructions, tags: recipe.tags,
        total_calories: recipe.estimated_calories, total_protein: recipe.estimated_protein,
        total_carbs: recipe.estimated_carbs, total_fat: recipe.estimated_fat,
        ingredients: recipe.ingredients.map(ing => ({ ...ing, calories: 0, protein: 0, carbs: 0, fat: 0 })),
      }),
    })
    setSaved(true)
    setSaving(false)
  }

  async function submitRating(r: number) {
    setRating(r)
    await fetch('/api/nutrition/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_name: recipe.name, rating: r }),
    })
    setRatingSubmitted(true)
  }

  function handleAdd() {
    onAdd(recipe, selectedDays, selectedMeal, servings)
    setShowAddModal(false)
    setSelectedDays([])
  }

  return (
    <div className="w-full bg-surface-2 border border-border rounded-lg overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-text-primary">{recipe.name}</span>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] text-text-tertiary font-mono">{recipe.estimated_calories} cal</span>
              <span className="text-[10px] text-accent font-mono">{recipe.estimated_protein}g P</span>
              <span className="text-[10px] text-accent-blue font-mono">{recipe.estimated_carbs}g C</span>
              <span className="text-[10px] text-accent-amber font-mono">{recipe.estimated_fat}g F</span>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-text-tertiary hover:text-text-secondary flex-shrink-0">
            {expanded ? 'less' : 'expand'}
          </button>
        </div>
        {expanded && (
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-2">
            <p className="text-[11px] text-text-secondary">{recipe.description}</p>
            <div>
              <span className="widget-label">Ingredients</span>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="text-[11px] text-text-secondary mt-0.5">{ing.quantity} {ing.unit} {ing.name}</div>
              ))}
            </div>
            <div>
              <span className="widget-label">Instructions</span>
              {recipe.instructions.split('\n').filter(Boolean).map((step, i) => (
                <p key={i} className="text-[11px] text-text-secondary mt-0.5">{step}</p>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={() => setShowAddModal(true)} className="btn-connect text-[10px] py-1 px-2">+ Add to planner</button>
          <button onClick={saveToLibrary} disabled={saving || saved} className="btn-connect text-[10px] py-1 px-2">
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save to library'}
          </button>
          {!ratingSubmitted ? (
            <div className="flex items-center gap-0.5 ml-auto">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => submitRating(n)} className="text-sm text-text-dim hover:text-accent-amber transition-colors">★</button>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-text-tertiary ml-auto">Rated {rating}/5 ✓</span>
          )}
        </div>
      </div>

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary text-sm font-medium">Add to planner</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-tertiary text-lg">×</button>
            </div>
            <p className="text-xs text-text-secondary font-medium">{recipe.name}</p>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Days (select multiple)</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(day => (
                  <button key={day}
                    onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${selectedDays.includes(day) ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-tertiary hover:border-border-strong'}`}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Meal</label>
              <div className="flex gap-1.5 flex-wrap">
                {MEALS.map(meal => (
                  <button key={meal} onClick={() => setSelectedMeal(meal)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors capitalize ${selectedMeal === meal ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-tertiary hover:border-border-strong'}`}>
                    {meal}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Servings per day</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-7 h-7 rounded-md bg-surface-3 text-text-primary text-sm hover:bg-surface-4 transition-colors">−</button>
                <span className="text-sm font-mono text-text-primary w-6 text-center">{servings}</span>
                <button onClick={() => setServings(servings + 1)} className="w-7 h-7 rounded-md bg-surface-3 text-text-primary text-sm hover:bg-surface-4 transition-colors">+</button>
              </div>
            </div>
            <button onClick={handleAdd} disabled={selectedDays.length === 0} className="btn-primary">
              Add to {selectedDays.length > 0 ? `${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}` : 'planner'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Chat Panel ───────────────────────────────────────────────
function ChatPanel({ weekStart, onRecipeAdd, plannerEntries }: {
  weekStart: string
  onRecipeAdd: (recipe: GeneratedRecipe, days: string[], meal: string, servings: number) => void
  plannerEntries: PlannerEntry[]
  fullHeight?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/nutrition/chat?week_start=${weekStart}`)
      .then(r => r.json())
      .then(res => {
        const msgs = (res.messages ?? []).filter((m: any) => m.role === 'user' || m.role === 'assistant')
        const parsed = msgs.map((m: any) => {
          if (m.role === 'assistant') {
            const match = m.content.match(/<recipes>([\s\S]*?)<\/recipes>/)
            let recipes = null
            let content = m.content
            if (match) {
              try { recipes = JSON.parse(match[1].trim()) } catch {}
              content = m.content.replace(/<recipes>[\s\S]*?<\/recipes>/, '').trim()
            }
            return { ...m, content, recipes }
          }
          return m
        })
        setMessages(parsed)
      })
      .finally(() => setLoadingHistory(false))
  }, [weekStart])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    const trimmedHistory = history.slice(-10)

    const res = await fetch('/api/nutrition/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, week_start: weekStart, history: trimmedHistory, planner_entries: plannerEntries }),
    }).then(r => r.json())

    const assistantMsg: Message = {
      role: 'assistant',
      content: res.text ?? '',
      recipes: res.recipes ?? undefined,
    }
    setMessages(prev => [...prev, assistantMsg])
    setLoading(false)
  }

  return (
    <div className="flex flex-col bg-surface-2 border border-border rounded-lg overflow-hidden" style={{ height: PANEL_HEIGHT }}>
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <span className="widget-label">Nutrition Assistant</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loadingHistory && <div className="text-xs text-text-tertiary text-center">Loading conversation...</div>}
        {!loadingHistory && messages.length === 0 && (
          <div className="text-xs text-text-tertiary text-center py-4 leading-relaxed">
            Start by telling me what you need — "generate 3 high protein dinners for meal prep" or "what should I eat today given my recovery score?"
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-accent/10 text-text-primary border border-accent/20' : 'bg-surface-3 text-text-primary'}`}>
              {msg.content}
            </div>
            {msg.recipes && msg.recipes.map((recipe, j) => (
              <ChatRecipeCard key={j} recipe={recipe} onAdd={onRecipeAdd} />
            ))}
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="bg-surface-3 px-3 py-2 rounded-lg text-xs text-text-tertiary animate-pulse">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask for recipes, meal ideas, adjustments..."
            className="flex-1 bg-surface-3 border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong" />
          <button onClick={send} disabled={loading || !input.trim()} className="btn-primary px-3 py-2 text-xs">Send</button>
        </div>
      </div>
    </div>
  )
}

// ─── Weekly Planner Grid ──────────────────────────────────────
function PlannerGrid({ weekStart, entries, onRemove }: {
  weekStart: string
  entries: PlannerEntry[]
  onRemove: (id: string) => void
}) {
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d
  })

  function getEntry(day: string, meal: string) {
    return entries.find(e => e.day_of_week === day && e.meal_type === meal)
  }

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-8 border-b border-border">
        <div className="px-3 py-2" />
        {DAYS.map((day, i) => (
          <div key={day} className="px-2 py-2 text-center border-l border-border">
            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{day.slice(0, 3)}</div>
            <div className="text-[10px] text-text-dim font-mono">{format(weekDates[i], 'M/d')}</div>
          </div>
        ))}
      </div>
      {MEALS.map(meal => (
        <div key={meal} className="grid grid-cols-8 border-b border-border last:border-0">
          <div className="px-3 py-3 flex items-center">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider capitalize">{meal}</span>
          </div>
          {DAYS.map(day => {
            const entry = getEntry(day, meal)
            return (
              <div key={day} className="border-l border-border px-2 py-2 min-h-[60px]">
                {entry ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-text-primary leading-snug font-medium">{entry.recipes.name}</span>
                    <span className="text-[9px] text-text-tertiary font-mono">
                      {Math.round(entry.recipes.total_calories * entry.servings)} cal · {entry.servings}srv
                    </span>
                    <button onClick={() => onRemove(entry.id)} className="text-[9px] text-accent-red hover:text-accent-red/80 w-fit mt-0.5">remove</button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Nutrition Summary ────────────────────────────────────────
function NutritionSummary({ entries, profile }: {
  entries: PlannerEntry[]
  profile: NutritionProfile | null
}) {
  const dailyTotals = DAYS.map(day => {
    const dayEntries = entries.filter(e => e.day_of_week === day)
    return {
      day,
      calories: Math.round(dayEntries.reduce((s, e) => s + (e.recipes.total_calories * e.servings), 0)),
      protein: Math.round(dayEntries.reduce((s, e) => s + (e.recipes.total_protein * e.servings), 0)),
      carbs: Math.round(dayEntries.reduce((s, e) => s + (e.recipes.total_carbs * e.servings), 0)),
      fat: Math.round(dayEntries.reduce((s, e) => s + (e.recipes.total_fat * e.servings), 0)),
    }
  })

  const daysWithData = dailyTotals.filter(d => d.calories > 0)
  const weeklyAvg = {
    calories: daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length) : 0,
    protein: daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length) : 0,
    carbs: daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.carbs, 0) / daysWithData.length) : 0,
    fat: daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.fat, 0) / daysWithData.length) : 0,
  }

  function pctColor(val: number, tgt: number | null) {
    if (!tgt || val === 0) return 'text-text-secondary'
    const pct = val / tgt
    if (pct >= 0.9 && pct <= 1.1) return 'text-accent'
    if (pct >= 0.75) return 'text-accent-amber'
    return 'text-text-secondary'
  }

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: PANEL_HEIGHT }}>
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <span className="widget-label">Nutrition Summary</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-text-tertiary font-normal w-16">Day</th>
              <th className="text-right px-2 py-2 text-text-tertiary font-normal">Cal</th>
              <th className="text-right px-2 py-2 text-accent font-normal">P</th>
              <th className="text-right px-2 py-2 text-accent-blue font-normal">C</th>
              <th className="text-right px-2 py-2 text-accent-amber font-normal">F</th>
            </tr>
          </thead>
          <tbody>
            {dailyTotals.map(d => (
              <tr key={d.day} className="border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
                <td className="px-3 py-2.5 text-text-secondary">{d.day.slice(0, 3)}</td>
                <td className={`px-2 py-2.5 text-right font-mono ${pctColor(d.calories, profile?.target_calories ?? null)}`}>{d.calories > 0 ? d.calories : '—'}</td>
                <td className={`px-2 py-2.5 text-right font-mono ${pctColor(d.protein, profile?.target_protein ?? null)}`}>{d.protein > 0 ? d.protein : '—'}</td>
                <td className={`px-2 py-2.5 text-right font-mono ${pctColor(d.carbs, profile?.target_carbs ?? null)}`}>{d.carbs > 0 ? d.carbs : '—'}</td>
                <td className={`px-2 py-2.5 text-right font-mono ${pctColor(d.fat, profile?.target_fat ?? null)}`}>{d.fat > 0 ? d.fat : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-strong bg-surface-3">
              <td className="px-3 py-2 text-text-tertiary text-xs uppercase tracking-wider">Avg</td>
              <td className="px-2 py-2 text-right font-mono text-text-primary">{weeklyAvg.calories || '—'}</td>
              <td className="px-2 py-2 text-right font-mono text-accent">{weeklyAvg.protein || '—'}</td>
              <td className="px-2 py-2 text-right font-mono text-accent-blue">{weeklyAvg.carbs || '—'}</td>
              <td className="px-2 py-2 text-right font-mono text-accent-amber">{weeklyAvg.fat || '—'}</td>
            </tr>
            {profile?.target_calories && (
              <tr className="border-t border-border">
                <td className="px-3 py-2 text-text-tertiary text-xs uppercase tracking-wider">Target</td>
                <td className="px-2 py-2 text-right font-mono text-text-dim">{profile.target_calories}</td>
                <td className="px-2 py-2 text-right font-mono text-text-dim">{profile.target_protein}</td>
                <td className="px-2 py-2 text-right font-mono text-text-dim">{profile.target_carbs}</td>
                <td className="px-2 py-2 text-right font-mono text-text-dim">{profile.target_fat}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Recipes This Week Panel ──────────────────────────────────
function RecipesPanel({ entries, onUpdateServings, onRemove }: {
  entries: PlannerEntry[]
  onUpdateServings: (id: string, servings: number) => void
  onRemove: (id: string) => void
}) {
  const unique = entries.reduce((acc, entry) => {
    const key = entry.recipes.id
    if (!acc[key]) acc[key] = { recipe: entry.recipes, entries: [] }
    acc[key].entries.push(entry)
    return acc
  }, {} as Record<string, { recipe: any; entries: PlannerEntry[] }>)

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: PANEL_HEIGHT }}>
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <span className="widget-label">This week's recipes</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.keys(unique).length === 0 && (
          <div className="px-4 py-6 text-xs text-text-tertiary text-center">
            No recipes planned — use the chat to generate and add recipes
          </div>
        )}
        {Object.values(unique).map(({ recipe, entries: recipeEntries }) => (
          <div key={recipe.id} className="px-4 py-3 border-b border-border last:border-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-primary">{recipe.name}</span>
              <div className="flex items-center gap-2 text-[10px] font-mono text-text-tertiary">
                <span>{recipe.total_calories} cal</span>
                <span className="text-accent">{recipe.total_protein}g P</span>
              </div>
            </div>
            {recipeEntries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-1">
                <span className="text-[11px] text-text-secondary capitalize">{entry.day_of_week.slice(0, 3)} · {entry.meal_type}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onUpdateServings(entry.id, Math.max(1, entry.servings - 1))} className="w-5 h-5 rounded bg-surface-3 text-text-primary text-xs hover:bg-surface-4">−</button>
                    <span className="text-[11px] font-mono text-text-primary w-4 text-center">{entry.servings}</span>
                    <button onClick={() => onUpdateServings(entry.id, entry.servings + 1)} className="w-5 h-5 rounded bg-surface-3 text-text-primary text-xs hover:bg-surface-4">+</button>
                  </div>
                  <button onClick={() => onRemove(entry.id)} className="text-[10px] text-accent-red hover:text-accent-red/80">✕</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Saved Recipe Library Panel ───────────────────────────────
function RecipeLibraryPanel({ recipes, planId, onAddToPlanner }: {
  recipes: SavedRecipe[]
  planId: string | null
  onAddToPlanner: (recipe: any, days: string[], meal: string, servings: number) => void
}) {
  const [mealFilter, setMealFilter] = useState('')
  const [proteinFilter, setProteinFilter] = useState('')
  const [cuisineFilter, setCuisineFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState<SavedRecipe | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedMeal, setSelectedMeal] = useState('dinner')
  const [servings, setServings] = useState(1)
  const [localRecipes, setLocalRecipes] = useState(recipes)
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({})

  const PROTEINS = ['beef', 'chicken', 'fish', 'pork', 'turkey', 'shrimp', 'eggs', 'tofu', 'lamb']
  const CUISINES = ['american', 'asian', 'mexican', 'italian', 'mediterranean', 'indian', 'japanese', 'thai', 'greek']

  function detectProtein(recipe: SavedRecipe): string {
    const text = (recipe.name + ' ' + recipe.tags?.join(' ') + ' ' + recipe.recipe_ingredients?.map((i: any) => i.name).join(' ')).toLowerCase()
    return PROTEINS.find(p => text.includes(p)) ?? ''
  }

  function detectCuisine(recipe: SavedRecipe): string {
    const text = (recipe.name + ' ' + recipe.tags?.join(' ') + ' ' + recipe.description).toLowerCase()
    return CUISINES.find(c => text.includes(c)) ?? ''
  }

  const filtered = localRecipes.filter(r => {
    if (mealFilter && !r.meal_type?.includes(mealFilter)) return false
    if (proteinFilter && detectProtein(r) !== proteinFilter) return false
    if (cuisineFilter && detectCuisine(r) !== cuisineFilter) return false
    return true
  })

  async function rateRecipe(id: string, rating: number) {
    await fetch('/api/nutrition/recipes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, rating }),
    })
    setLocalRecipes(prev => prev.map(r => r.id === id ? { ...r, rating } : r))
    setRatingMap(prev => ({ ...prev, [id]: rating }))
  }

  async function deleteRecipe(id: string) {
    if (!confirm('Delete this recipe?')) return
    await fetch(`/api/nutrition/recipes?id=${id}`, { method: 'DELETE' })
    setLocalRecipes(prev => prev.filter(r => r.id !== id))
  }

  function handleAdd() {
    if (!showAddModal) return
    onAddToPlanner({
      ...showAddModal,
      estimated_calories: showAddModal.total_calories,
      estimated_protein: showAddModal.total_protein,
      estimated_carbs: showAddModal.total_carbs,
      estimated_fat: showAddModal.total_fat,
      id: showAddModal.id,
    }, selectedDays, selectedMeal, servings)
    setShowAddModal(null)
    setSelectedDays([])
    setServings(1)
  }

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: PANEL_HEIGHT }}>
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <span className="widget-label">Recipe library ({localRecipes.length})</span>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-border flex-shrink-0 flex flex-wrap gap-1.5">
        <select value={mealFilter} onChange={e => setMealFilter(e.target.value)}
          className="bg-surface-3 border border-border rounded-md px-2 py-1 text-[10px] text-text-primary focus:outline-none">
          <option value="">All meals</option>
          {MEALS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
        </select>
        <select value={proteinFilter} onChange={e => setProteinFilter(e.target.value)}
          className="bg-surface-3 border border-border rounded-md px-2 py-1 text-[10px] text-text-primary focus:outline-none">
          <option value="">All proteins</option>
          {PROTEINS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <select value={cuisineFilter} onChange={e => setCuisineFilter(e.target.value)}
          className="bg-surface-3 border border-border rounded-md px-2 py-1 text-[10px] text-text-primary focus:outline-none">
          <option value="">All cuisines</option>
          {CUISINES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        {(mealFilter || proteinFilter || cuisineFilter) && (
          <button onClick={() => { setMealFilter(''); setProteinFilter(''); setCuisineFilter('') }}
            className="text-[10px] text-text-tertiary hover:text-text-secondary">clear</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-xs text-text-tertiary text-center">
            {localRecipes.length === 0 ? 'No saved recipes yet — generate and save recipes from the chat' : 'No recipes match your filters'}
          </div>
        )}
        {filtered.map(recipe => (
          <div key={recipe.id} className="border-b border-border last:border-0">
            <div className="px-4 py-3 hover:bg-surface-3 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-text-primary">{recipe.name}</span>
                    {recipe.meal_type?.map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-tertiary capitalize">{t}</span>
                    ))}
                    {recipe.rating && (
                      <span className="text-[9px] text-accent-amber">{'★'.repeat(recipe.rating)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-tertiary font-mono">{recipe.total_calories} cal</span>
                    <span className="text-[10px] text-accent font-mono">{recipe.total_protein}g P</span>
                    <span className="text-[10px] text-accent-blue font-mono">{recipe.total_carbs}g C</span>
                    <span className="text-[10px] text-accent-amber font-mono">{recipe.total_fat}g F</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setShowAddModal(recipe); setSelectedMeal(recipe.meal_type?.[0] ?? 'dinner') }}
                    className="text-[10px] text-accent hover:text-accent/80 transition-colors">+ plan</button>
                  <button onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                    className="text-[10px] text-text-tertiary hover:text-text-secondary">
                    {expanded === recipe.id ? '↑' : '↓'}
                  </button>
                </div>
              </div>

              {expanded === recipe.id && (
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-2">
                  <p className="text-[11px] text-text-secondary">{recipe.description}</p>
                  <div>
                    <span className="widget-label">Ingredients</span>
                    {recipe.recipe_ingredients?.map((ing: any, i: number) => (
                      <div key={i} className="text-[11px] text-text-secondary mt-0.5">{ing.quantity} {ing.unit} {ing.name}</div>
                    ))}
                  </div>
                  <div>
                    <span className="widget-label">Instructions</span>
                    {recipe.instructions?.split('\n').filter(Boolean).map((step, i) => (
                      <p key={i} className="text-[11px] text-text-secondary mt-0.5">{step}</p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => rateRecipe(recipe.id, n)}
                          className={`text-sm transition-colors ${n <= (ratingMap[recipe.id] ?? recipe.rating ?? 0) ? 'text-accent-amber' : 'text-text-dim hover:text-accent-amber'}`}>★</button>
                      ))}
                    </div>
                    <button onClick={() => deleteRecipe(recipe.id)} className="text-[10px] text-accent-red hover:text-accent-red/80">delete</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(null)}>
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary text-sm font-medium">Add to planner</h3>
              <button onClick={() => setShowAddModal(null)} className="text-text-tertiary text-lg">×</button>
            </div>
            <p className="text-xs text-text-secondary font-medium">{showAddModal.name}</p>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Days (select multiple)</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(day => (
                  <button key={day}
                    onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${selectedDays.includes(day) ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-tertiary hover:border-border-strong'}`}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Meal</label>
              <div className="flex gap-1.5 flex-wrap">
                {MEALS.map(meal => (
                  <button key={meal} onClick={() => setSelectedMeal(meal)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors capitalize ${selectedMeal === meal ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-tertiary hover:border-border-strong'}`}>
                    {meal}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="widget-label">Servings per day</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-7 h-7 rounded-md bg-surface-3 text-text-primary text-sm">−</button>
                <span className="text-sm font-mono text-text-primary w-6 text-center">{servings}</span>
                <button onClick={() => setServings(servings + 1)} className="w-7 h-7 rounded-md bg-surface-3 text-text-primary text-sm">+</button>
              </div>
            </div>
            <button onClick={handleAdd} disabled={selectedDays.length === 0} className="btn-primary">
              Add to {selectedDays.length > 0 ? `${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}` : 'planner'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Grocery Panel ────────────────────────────────────────────
function GroceryPanel({ weekStart, entries }: {
  weekStart: string
  entries: PlannerEntry[]
}) {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('Other')

  useEffect(() => {
    fetch(`/api/nutrition/grocery?week_start=${weekStart}`)
      .then(r => r.json())
      .then(res => setItems(res.data ?? []))
      .finally(() => setLoading(false))
  }, [weekStart])

  function categorize(name: string): string {
    const n = name.toLowerCase()
    if (/chicken|beef|pork|fish|salmon|tuna|shrimp|turkey|egg/.test(n)) return 'Protein'
    if (/milk|cheese|yogurt|butter|cream/.test(n)) return 'Dairy'
    if (/rice|pasta|bread|oat|flour|quinoa/.test(n)) return 'Grains'
    if (/lettuce|spinach|kale|carrot|broccoli|tomato|onion|garlic|pepper|apple|banana|berry/.test(n)) return 'Produce'
    if (/frozen/.test(n)) return 'Frozen'
    if (/oil|sauce|spice|salt|pepper|vinegar|soy/.test(n)) return 'Pantry'
    return 'Other'
  }

  async function generateList() {
    setGenerating(true)
    const ingredientMap: Record<string, { quantity: number; unit: string; category: string }> = {}
    for (const entry of entries) {
      const scale = entry.servings
      for (const ing of entry.recipes.recipe_ingredients ?? []) {
        const key = `${ing.name.toLowerCase()}::${ing.unit ?? ''}`
        if (ingredientMap[key]) {
          ingredientMap[key].quantity += (ing.quantity ?? 0) * scale
        } else {
          ingredientMap[key] = { quantity: (ing.quantity ?? 0) * scale, unit: ing.unit ?? '', category: categorize(ing.name) }
        }
      }
    }
    const newItems = Object.entries(ingredientMap).map(([key, val]) => ({
      name: key.split('::')[0], quantity: Math.round(val.quantity * 10) / 10,
      unit: val.unit, category: val.category, checked: false, custom: false,
    }))
    const res = await fetch('/api/nutrition/grocery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, items: newItems }),
    }).then(r => r.json())
    setItems(res.data ?? [])
    setGenerating(false)
  }

  async function toggleCheck(id: string, checked: boolean) {
    await fetch('/api/nutrition/grocery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, checked }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked } : i))
  }

  async function deleteItem(id: string) {
    await fetch(`/api/nutrition/grocery?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function addCustomItem() {
    if (!newItem.trim()) return
    const existing = items.filter(i => !i.custom).map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, category: i.category, checked: i.checked, custom: false }))
    const res = await fetch('/api/nutrition/grocery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, items: [...existing, { name: newItem.trim(), quantity: null, unit: null, category: newCategory, checked: false, custom: true }] }),
    }).then(r => r.json())
    setItems(res.data ?? [])
    setNewItem('')
  }

  async function clearPurchased() {
    for (const item of items.filter(i => i.checked)) {
      await fetch(`/api/nutrition/grocery?id=${item.id}`, { method: 'DELETE' })
    }
    setItems(prev => prev.filter(i => !i.checked))
  }

  function copyList() {
    const text = CATEGORIES
      .filter(cat => items.some(i => i.category === cat))
      .map(cat => {
        const catItems = items.filter(i => i.category === cat)
        return `${cat}:\n${catItems.map(i => `  • ${i.quantity != null ? `${i.quantity} ${i.unit} ` : ''}${i.name}`).join('\n')}`
      }).join('\n\n')
    navigator.clipboard.writeText(text)
    alert('Grocery list copied — paste into Apple Notes')
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {} as Record<string, GroceryItem[]>)

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: PANEL_HEIGHT }}>
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <span className="widget-label">Grocery list</span>
        <div className="flex items-center gap-2">
          {items.some(i => i.checked) && (
            <button onClick={clearPurchased} className="text-[10px] text-text-tertiary hover:text-text-secondary">clear purchased</button>
          )}
          {items.length > 0 && (
            <button onClick={copyList} className="btn-connect text-[10px] py-1">copy list</button>
          )}
          <button onClick={generateList} disabled={generating || entries.length === 0} className="btn-connect text-[10px] py-1">
            {generating ? 'Generating...' : 'Generate from plan'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="px-4 py-4 text-xs text-text-tertiary">Loading...</div>}
        {!loading && items.length === 0 && (
          <div className="px-4 py-6 text-xs text-text-tertiary text-center">Add recipes to your planner then click "Generate from plan"</div>
        )}
        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            <div className="px-4 py-1.5 bg-surface-3 border-b border-border">
              <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{category}</span>
            </div>
            {catItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-4 py-2 border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
                <input type="checkbox" checked={item.checked} onChange={e => toggleCheck(item.id, e.target.checked)} className="accent-accent flex-shrink-0" />
                <span className={`flex-1 text-xs ${item.checked ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                  {item.quantity != null ? `${item.quantity} ${item.unit} ` : ''}{item.name}
                </span>
                <button onClick={() => deleteItem(item.id)} className="text-text-dim hover:text-accent-red text-xs flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        ))}
        <div className="px-3 py-3 border-t border-border flex items-center gap-2">
          <input value={newItem} onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomItem()}
            placeholder="Add item + Enter"
            className="flex-1 bg-surface-3 border border-border rounded-md px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none" />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
            className="bg-surface-3 border border-border rounded-md px-2 py-1.5 text-xs text-text-primary focus:outline-none">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export function NutritionClient({ initialProfile, initialRecipes }: {
  initialProfile: any
  initialRecipes: any[]
}) {
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))
  const [plannerEntries, setPlannerEntries] = useState<PlannerEntry[]>([])
  const [planId, setPlanId] = useState<string | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState(initialProfile)
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(initialRecipes)

  useEffect(() => {
    setLoadingPlan(true)
    fetch(`/api/nutrition/planner?week_start=${weekStart}`)
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setPlanId(res.data.id)
          setPlannerEntries(res.data.meal_plan_entries ?? [])
        }
      })
      .finally(() => setLoadingPlan(false))
  }, [weekStart])

  // Refresh saved recipes when page loads
  useEffect(() => {
    fetch('/api/nutrition/recipes')
      .then(r => r.json())
      .then(res => { if (res.data) setSavedRecipes(res.data) })
  }, [])

  async function handleAddToPlanner(recipe: any, days: string[], meal: string, servings: number) {
    if (!planId) return

    let recipeId = recipe.id
    if (!recipeId) {
      const saveRes = await fetch('/api/nutrition/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipe.name, description: recipe.description, meal_type: recipe.meal_type,
          servings: recipe.servings, instructions: recipe.instructions, tags: recipe.tags,
          total_calories: recipe.estimated_calories ?? recipe.total_calories,
          total_protein: recipe.estimated_protein ?? recipe.total_protein,
          total_carbs: recipe.estimated_carbs ?? recipe.total_carbs,
          total_fat: recipe.estimated_fat ?? recipe.total_fat,
          ingredients: recipe.ingredients?.map((ing: any) => ({ ...ing, calories: 0, protein: 0, carbs: 0, fat: 0 })) ?? [],
        }),
      }).then(r => r.json())
      recipeId = saveRes.data?.id
      if (saveRes.data) setSavedRecipes(prev => [saveRes.data, ...prev])
    }

    if (!recipeId) return

    for (const day of days) {
      const res = await fetch('/api/nutrition/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_plan_id: planId, recipe_id: recipeId, day_of_week: day, meal_type: meal, servings }),
      }).then(r => r.json())
      if (res.data) setPlannerEntries(prev => [...prev, res.data])
    }
  }

  async function handleRemoveEntry(id: string) {
    await fetch(`/api/nutrition/planner?id=${id}`, { method: 'DELETE' })
    setPlannerEntries(prev => prev.filter(e => e.id !== id))
  }

  async function handleUpdateServings(id: string, servings: number) {
    await fetch('/api/nutrition/planner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, servings }),
    })
    setPlannerEntries(prev => prev.map(e => e.id === id ? { ...e, servings } : e))
  }

  function prevWeek() {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    setWeekStart(getWeekStart(d))
  }

  function nextWeek() {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    setWeekStart(getWeekStart(d))
  }

  const weekEnd = new Date(weekStart + 'T12:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-text-primary font-medium">Nutrition Planner</h2>
          <p className="text-text-tertiary text-xs mt-0.5">
            {format(new Date(weekStart + 'T12:00:00'), 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowProfile(true)} className="btn-connect">
            {profile ? 'edit profile' : 'set up profile'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="btn-connect px-3">←</button>
            <button onClick={() => setWeekStart(getWeekStart(new Date()))} className="btn-connect px-3 text-[10px]">This week</button>
            <button onClick={nextWeek} className="btn-connect px-3">→</button>
          </div>
        </div>
      </div>

      {/* Weekly planner grid — full width */}
      <div className="flex-shrink-0">
        {loadingPlan ? (
          <div className="bg-surface-2 border border-border rounded-lg h-48 flex items-center justify-center">
            <span className="text-xs text-text-tertiary">Loading planner...</span>
          </div>
        ) : (
          <PlannerGrid weekStart={weekStart} entries={plannerEntries} onRemove={handleRemoveEntry} />
        )}
      </div>

      {/* Bottom: 3 columns */}
      <div className="grid grid-cols-3 gap-4 items-start">

        {/* Left — Chat full height matching both stacked panels + gap */}
        <div style={{ height: PANEL_HEIGHT * 2 + 16 }} className="flex flex-col"> 
          <ChatPanel weekStart={weekStart} onRecipeAdd={handleAddToPlanner} plannerEntries={plannerEntries} fullHeight />
        </div>

        {/* Middle — Nutrition summary on top, Grocery list below */}
        <div className="flex flex-col gap-4">
          <NutritionSummary entries={plannerEntries} profile={profile} />
          <GroceryPanel weekStart={weekStart} entries={plannerEntries} />
        </div>

        {/* Right — This week's recipes on top, Recipe library below */}
        <div className="flex flex-col gap-4">
          <RecipesPanel entries={plannerEntries} onUpdateServings={handleUpdateServings} onRemove={handleRemoveEntry} />
          <RecipeLibraryPanel recipes={savedRecipes} planId={planId} onAddToPlanner={handleAddToPlanner} />
        </div>
      </div>

      {/* Profile modal */}
      {showProfile && (
        <ProfileModal
          profile={profile}
          onSave={async (updated) => {
            await fetch('/api/nutrition/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated),
            })
            setProfile(updated)
            setShowProfile(false)
          }}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}