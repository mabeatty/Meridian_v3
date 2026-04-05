'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface Category {
  id: string
  name: string
  monthly_budget: number
  color: string
}

interface Transaction {
  id: string
  name: string
  amount: number
  date: string
  plaid_category: string | null
  category_id: string | null
  budget_categories: { id: string; name: string; color: string } | null
}

interface CategorySummary {
  id: string
  name: string
  color: string
  monthly_budget: number
  carryover: number
  effective_budget: number
  spent: number
  remaining: number
  pct: number
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(n)

const fmtFull = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
  minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n)

export function BudgetClient({ initialCategories, initialTransactions, initialMonth }: {
  initialCategories: Category[]
  initialTransactions: Transaction[]
  initialMonth: string
}) {
  const [month, setMonth] = useState(initialMonth)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [summary, setSummary] = useState<CategorySummary[]>([])
  const [totalBudget, setTotalBudget] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCatForm, setNewCatForm] = useState({ name: '', monthly_budget: '', color: '#60a5fa' })
  const [editCatForm, setEditCatForm] = useState({ name: '', monthly_budget: '', color: '' })
  const [saving, setSaving] = useState(false)
  const [txSearch, setTxSearch] = useState('')
  const [txFilter, setTxFilter] = useState('all')

  useEffect(() => {
    loadSummary()
    loadTransactions()
  }, [month])

  async function loadSummary() {
    const res = await fetch(`/api/budget/summary?month=${month}`).then(r => r.json())
    setSummary(res.summary ?? [])
    setTotalBudget(res.totalBudget ?? 0)
    setTotalSpent(res.totalSpent ?? 0)
  }

  async function loadTransactions() {
    const res = await fetch(`/api/budget/transactions?month=${month}`).then(r => r.json())
    setTransactions(res.data ?? [])
  }

  async function syncTransactions() {
    setSyncing(true)
    setSyncMsg('')
    const res = await fetch('/api/budget/sync', { method: 'POST' }).then(r => r.json())
    setSyncMsg(res.synced ? `Synced ${res.synced} transactions` : 'Sync failed')
    await loadTransactions()
    await loadSummary()
    setSyncing(false)
  }

  async function assignCategory(txId: string, categoryId: string | null) {
    const res = await fetch('/api/budget/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: txId, category_id: categoryId }),
    }).then(r => r.json())
    if (res.data) {
      setTransactions(prev => prev.map(t => t.id === txId ? res.data : t))
      await loadSummary()
    }
  }

  async function saveCategory() {
    setSaving(true)
    if (editCategory) {
      const res = await fetch('/api/budget/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editCategory.id, ...editCatForm, monthly_budget: parseFloat(editCatForm.monthly_budget) }),
      }).then(r => r.json())
      if (res.data) {
        setCategories(prev => prev.map(c => c.id === res.data.id ? res.data : c))
        await loadSummary()
      }
      setEditCategory(null)
    } else {
      const res = await fetch('/api/budget/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCatForm, monthly_budget: parseFloat(newCatForm.monthly_budget) }),
      }).then(r => r.json())
      if (res.data) {
        setCategories(prev => [...prev, res.data])
        await loadSummary()
      }
      setShowAddCategory(false)
      setNewCatForm({ name: '', monthly_budget: '', color: '#60a5fa' })
    }
    setSaving(false)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category? Transactions will be unassigned.')) return
    await fetch(`/api/budget/categories?id=${id}`, { method: 'DELETE' })
    setCategories(prev => prev.filter(c => c.id !== id))
    await loadSummary()
  }

  function prevMonth() {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() - 1)
    setMonth(d.toISOString().slice(0, 7))
  }

  function nextMonth() {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + 1)
    setMonth(d.toISOString().slice(0, 7))
  }

  const filteredTx = transactions.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(txSearch.toLowerCase())
    const matchFilter = txFilter === 'all' ? true
      : txFilter === 'unassigned' ? !t.category_id
      : t.category_id === txFilter
    return matchSearch && matchFilter
  })

  const monthLabel = new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-primary font-medium">Budget</h2>
          <p className="text-text-tertiary text-xs mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-[10px] text-text-tertiary">{syncMsg}</span>}
          <button onClick={syncTransactions} disabled={syncing} className="btn-connect text-[10px] py-1">
            {syncing ? 'Syncing...' : 'Sync transactions'}
          </button>
          <button onClick={prevMonth} className="btn-connect px-3">←</button>
          <button onClick={() => setMonth(new Date().toISOString().slice(0, 7))} className="btn-connect px-3 text-[10px]">This month</button>
          <button onClick={nextMonth} className="btn-connect px-3">→</button>
        </div>
      </div>

      {/* Total progress */}
      <div className="bg-surface-2 border border-border rounded-lg p-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-2xl font-light font-mono text-text-primary">{fmt(totalSpent)}</span>
            <span className="text-sm text-text-tertiary ml-2">/ {fmt(totalBudget)}</span>
          </div>
          <span className={`text-sm font-mono ${totalSpent > totalBudget ? 'text-accent-red' : 'text-accent'}`}>
            {fmt(totalBudget - totalSpent)} {totalSpent > totalBudget ? 'over' : 'remaining'}
          </span>
        </div>
        <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
              backgroundColor: totalSpent / totalBudget > 1 ? '#f87171'
                : totalSpent / totalBudget > 0.85 ? '#fbbf24' : '#4ade80'
            }} />
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-2 gap-4">

        {/* Left — Categories */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="widget-label">Categories</span>
            <button
              onClick={() => { setShowAddCategory(true); setEditCategory(null) }}
              className="btn-connect text-[10px] py-1">
              + add category
            </button>
          </div>

          {/* Add/edit form */}
          {(showAddCategory || editCategory) && (
            <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
              <span className="widget-label">{editCategory ? 'Edit category' : 'New category'}</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="widget-label">Name</label>
                  <input
                    value={editCategory ? editCatForm.name : newCatForm.name}
                    onChange={e => editCategory
                      ? setEditCatForm(p => ({ ...p, name: e.target.value }))
                      : setNewCatForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Category name"
                    className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="widget-label">Monthly budget ($)</label>
                  <input
                    type="number"
                    value={editCategory ? editCatForm.monthly_budget : newCatForm.monthly_budget}
                    onChange={e => editCategory
                      ? setEditCatForm(p => ({ ...p, monthly_budget: e.target.value }))
                      : setNewCatForm(p => ({ ...p, monthly_budget: e.target.value }))}
                    placeholder="0"
                    className="bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="widget-label">Color</label>
                  <input
                    type="color"
                    value={editCategory ? editCatForm.color : newCatForm.color}
                    onChange={e => editCategory
                      ? setEditCatForm(p => ({ ...p, color: e.target.value }))
                      : setNewCatForm(p => ({ ...p, color: e.target.value }))}
                    className="bg-surface-3 border border-border rounded-md px-2 py-1 h-10 w-full cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveCategory} disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : editCategory ? 'Update' : 'Add category'}
                </button>
                <button
                  onClick={() => { setShowAddCategory(false); setEditCategory(null) }}
                  className="text-xs text-text-tertiary hover:text-text-secondary">cancel</button>
              </div>
            </div>
          )}

          {/* Category list */}
          <div className="flex flex-col gap-2">
            {summary.filter(c => c.monthly_budget > 0).sort((a, b) => b.pct - a.pct).map(cat => (
              <div key={cat.id} className="bg-surface-2 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs font-medium text-text-primary">{cat.name}</span>
                    {cat.carryover !== 0 && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${cat.carryover > 0 ? 'bg-accent/10 text-accent' : 'bg-accent-red/10 text-accent-red'}`}>
                        {cat.carryover > 0 ? '+' : ''}{fmt(cat.carryover)} carry
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditCategory(categories.find(c => c.id === cat.id) ?? null)
                        setEditCatForm({ name: cat.name, monthly_budget: cat.monthly_budget.toString(), color: cat.color })
                        setShowAddCategory(false)
                      }}
                      className="text-[10px] text-text-tertiary hover:text-text-secondary">edit</button>
                    <button onClick={() => deleteCategory(cat.id)}
                      className="text-[10px] text-accent-red hover:text-accent-red/80">✕</button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-text-tertiary">{fmt(cat.spent)} spent</span>
                  <span className="text-[10px] font-mono text-text-tertiary">{fmt(cat.effective_budget)} budget</span>
                </div>
                <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.pct}%`,
                      backgroundColor: cat.pct >= 100 ? '#f87171' : cat.pct >= 85 ? '#fbbf24' : cat.color
                    }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-mono"
                    style={{ color: cat.remaining < 0 ? '#f87171' : '#666' }}>
                    {cat.remaining < 0 ? `${fmt(Math.abs(cat.remaining))} over` : `${fmt(cat.remaining)} left`}
                  </span>
                  <span className="text-[10px] font-mono text-text-dim">{Math.round(cat.pct)}%</span>
                </div>
              </div>
            ))}

            {/* Categories with no budget set */}
            {summary.filter(c => c.monthly_budget === 0).length > 0 && (
              <div className="mt-2">
                <span className="widget-label mb-2 block">No budget set</span>
                {summary.filter(c => c.monthly_budget === 0).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between py-2 px-3 hover:bg-surface-3 rounded-md transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-text-secondary">{cat.name}</span>
                      {cat.spent > 0 && <span className="text-[10px] font-mono text-accent-amber">{fmt(cat.spent)}</span>}
                    </div>
                    <button
                      onClick={() => {
                        setEditCategory(categories.find(c => c.id === cat.id) ?? null)
                        setEditCatForm({ name: cat.name, monthly_budget: '', color: cat.color })
                        setShowAddCategory(false)
                      }}
                      className="text-[10px] text-text-tertiary hover:text-text-secondary">set budget</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Transactions */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="widget-label">Transactions ({filteredTx.length})</span>
            <span className="text-[10px] text-text-tertiary">
              {transactions.filter(t => !t.category_id).length} unassigned
            </span>
          </div>

          {/* Search and filter */}
          <div className="flex items-center gap-2">
            <input
              value={txSearch}
              onChange={e => setTxSearch(e.target.value)}
              placeholder="Search transactions..."
              className="flex-1 bg-surface-2 border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
            <select
              value={txFilter}
              onChange={e => setTxFilter(e.target.value)}
              className="bg-surface-2 border border-border rounded-md px-2 py-2 text-xs text-text-primary focus:outline-none">
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Transaction list */}
          <div className="bg-surface-2 border border-border rounded-lg overflow-hidden max-h-[700px] overflow-y-auto">
            {filteredTx.length === 0 && (
              <div className="px-4 py-8 text-xs text-text-tertiary text-center">
                {transactions.length === 0
                  ? 'No transactions yet — click "Sync transactions" to pull from Plaid'
                  : 'No transactions match your filters'}
              </div>
            )}
            {filteredTx.map(tx => (
              <div key={tx.id}
                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-xs text-text-primary truncate">{tx.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-text-tertiary font-mono">{tx.date}</span>
                    {tx.plaid_category && (
                      <span className="text-[10px] text-text-dim">{tx.plaid_category}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-text-primary">{fmtFull(tx.amount)}</span>
                  <select
                    value={tx.category_id ?? ''}
                    onChange={e => assignCategory(tx.id, e.target.value || null)}
                    className="bg-surface-3 border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none max-w-[130px]"
                    style={{ color: tx.budget_categories?.color ?? undefined }}>
                    <option value="">Uncategorized</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}