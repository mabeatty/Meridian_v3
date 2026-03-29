'use client'

import { useState } from 'react'
import { format } from 'date-fns'

interface JournalEntry {
  id: string
  content: string
  mood: number | null
  energy: number | null
  tags: string[]
  entry_date: string
  created_at: string
}

interface Realization {
  id: string
  headline: string
  clinical_summary: string
  source_text: string
  tags: string[]
  created_at: string
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface-2 border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ScoreInput({ label, value, onChange }: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="widget-label">{label}</label>
      <div className="flex items-center gap-1">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            className={`w-7 h-7 rounded text-xs transition-all ${
              value === n
                ? 'bg-accent text-surface font-medium'
                : 'bg-surface-3 text-text-tertiary hover:text-text-primary'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function JournalClient({ initialEntries, initialRealizations, initialSummary }: {
  initialEntries: JournalEntry[]
  initialRealizations: Realization[]
  initialSummary: string | null
}) {
  // Journal state
  const [entries, setEntries] = useState(initialEntries)
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showEntries, setShowEntries] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  // Realizations state
  const [realizations, setRealizations] = useState(initialRealizations)
  const [selectedRealization, setSelectedRealization] = useState<Realization | null>(null)
  const [showNewRealization, setShowNewRealization] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState<{ headline: string; clinical_summary: string } | null>(null)
  const [realizationTags, setRealizationTags] = useState<string[]>([])
  const [realizationTagInput, setRealizationTagInput] = useState('')
  const [savingRealization, setSavingRealization] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Executive summary state
  const [summary, setSummary] = useState(initialSummary)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  async function saveEntry() {
    if (!content.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mood, energy, tags }),
      }).then(r => r.json())

      if (res.data) {
        setEntries(prev => [res.data, ...prev])
        setContent('')
        setMood(null)
        setEnergy(null)
        setTags([])
      }
    } catch (err) {
      console.error('Failed to save entry:', err)
    }
    setSaving(false)
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/journal?id=${id}`, { method: 'DELETE' })
    setEntries(prev => prev.filter(e => e.id !== id))
    setSelectedEntry(null)
  }

  async function analyzeText() {
    if (!pasteText.trim()) return
    setAnalyzing(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/realizations/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_text: pasteText }),
      }).then(r => r.json())

      if (res.headline) {
        setAnalyzed({ headline: res.headline, clinical_summary: res.clinical_summary })
      } else {
        setSaveError(res.error ?? 'Analysis failed')
      }
    } catch (err) {
      setSaveError('Analysis failed — check your API key')
    }
    setAnalyzing(false)
  }

  async function saveRealization() {
    if (!analyzed) return
    setSavingRealization(true)
    setSaveError(null)

    try {
      // Save source text as journal entry first
      let journalEntryId: string | null = null
      try {
        const journalRes = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: pasteText,
            tags: ['realization', ...realizationTags],
          }),
        })
        const journalData = await journalRes.json()
        journalEntryId = journalData.data?.id ?? null
      } catch (err) {
        console.error('Journal entry save failed, continuing without it:', err)
      }

      // Save realization
      const res = await fetch('/api/realizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: analyzed.headline,
          clinical_summary: analyzed.clinical_summary,
          source_text: pasteText,
          journal_entry_id: journalEntryId,
          tags: realizationTags,
        }),
      })

      const data = await res.json()

      if (data.data) {
        setRealizations(prev => [data.data, ...prev])
        setShowNewRealization(false)
        setPasteText('')
        setAnalyzed(null)
        setRealizationTags([])
      } else {
        setSaveError(data.error ?? 'Failed to save realization')
      }
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save')
    }

    setSavingRealization(false)
  }

  async function generateSummary() {
    if (realizations.length === 0) return
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/realizations/summary', { method: 'POST' }).then(r => r.json())
      if (res.summary) {
        setSummary(res.summary)
        setShowSummary(true)
      }
    } catch (err) {
      console.error('Summary generation failed:', err)
    }
    setGeneratingSummary(false)
  }

  function addRealizationTag() {
    const t = realizationTagInput.trim().toLowerCase()
    if (t && !realizationTags.includes(t)) setRealizationTags(prev => [...prev, t])
    setRealizationTagInput('')
  }

  return (
    <div className="flex gap-6 h-full">

      {/* ── Left 2/3 — Journal ─────────────────────────── */}
      <div className="flex-[2] flex flex-col gap-4 min-w-0">
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="widget-label">Journal</span>
            <span className="text-[10px] text-text-tertiary font-mono">
              {format(new Date(), 'EEE, MMM d')}
            </span>
          </div>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind..."
            rows={10}
            className="bg-surface-3 border border-border rounded-md px-4 py-3 text-sm text-text-primary
                       placeholder:text-text-tertiary focus:outline-none focus:border-border-strong
                       transition-colors resize-none leading-relaxed"
          />

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag + Enter"
                className="bg-surface-3 border border-border rounded-md px-3 py-1.5 text-xs text-text-primary
                           placeholder:text-text-tertiary focus:outline-none focus:border-border-strong flex-1"
              />
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-text-secondary">
                    {tag}
                    <button onClick={() => setTags(p => p.filter(t => t !== tag))} className="text-text-tertiary hover:text-accent-red">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Mood + Energy */}
          <div className="grid grid-cols-2 gap-3">
            <ScoreInput label="Mood" value={mood} onChange={setMood} />
            <ScoreInput label="Energy" value={energy} onChange={setEnergy} />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={saveEntry} disabled={saving || !content.trim()} className="btn-primary">
              {saving ? 'Saving...' : 'Save entry'}
            </button>
            <button
              onClick={() => setShowEntries(true)}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {entries.length} past {entries.length === 1 ? 'entry' : 'entries'} →
            </button>
          </div>
        </div>
      </div>

      {/* ── Right 1/3 — Realizations ───────────────────── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="widget-label">Realizations</span>
          <button onClick={() => setShowNewRealization(true)} className="btn-connect text-[10px]">
            + new
          </button>
        </div>

        {/* Executive Summary card */}
        <div
          className="bg-surface-2 border border-border-strong rounded-lg p-3 cursor-pointer hover:border-accent/30 transition-colors flex-shrink-0"
          onClick={() => summary ? setShowSummary(true) : generateSummary()}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-accent">Executive Summary</span>
            <button
              onClick={e => { e.stopPropagation(); generateSummary() }}
              disabled={generatingSummary || realizations.length === 0}
              className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {generatingSummary ? 'generating...' : 'regenerate'}
            </button>
          </div>
          {summary ? (
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{summary}</p>
          ) : (
            <p className="text-xs text-text-tertiary italic">
              {realizations.length === 0
                ? 'Add realizations to generate your psychological growth summary'
                : 'Click to generate your executive summary'}
            </p>
          )}
        </div>

        {/* Realization cards */}
        {realizations.length === 0 && (
          <div className="text-xs text-text-tertiary text-center py-4">
            No realizations yet — paste a Claude conversation to extract insights
          </div>
        )}

        {realizations.map(r => (
          <div
            key={r.id}
            onClick={() => setSelectedRealization(r)}
            className="bg-surface-2 border border-border rounded-lg p-3 cursor-pointer hover:border-border-strong transition-colors flex-shrink-0"
          >
            <p className="text-xs font-medium text-text-primary leading-snug">{r.headline}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-text-tertiary font-mono">
                {format(new Date(r.created_at), 'MMM d, yyyy')}
              </span>
              {r.tags.length > 0 && (
                <div className="flex gap-1">
                  {r.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-tertiary">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Past entries modal ──────────────────────────── */}
      {showEntries && (
        <Modal onClose={() => { setShowEntries(false); setSelectedEntry(null) }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary font-medium">Past entries</h3>
              <button onClick={() => setShowEntries(false)} className="text-text-tertiary hover:text-text-primary text-lg">×</button>
            </div>
            {selectedEntry ? (
              <div className="flex flex-col gap-3">
                <button onClick={() => setSelectedEntry(null)} className="text-xs text-text-tertiary hover:text-text-secondary w-fit">
                  ← back
                </button>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-tertiary font-mono">
                    {format(new Date(selectedEntry.created_at), 'EEEE, MMMM d yyyy · h:mm a')}
                  </span>
                  <button onClick={() => deleteEntry(selectedEntry.id)} className="text-xs text-accent-red hover:text-accent-red/80">delete</button>
                </div>
                {(selectedEntry.mood || selectedEntry.energy) && (
                  <div className="flex gap-3">
                    {selectedEntry.mood && <span className="text-xs text-text-tertiary">Mood: <span className="text-text-primary font-mono">{selectedEntry.mood}/10</span></span>}
                    {selectedEntry.energy && <span className="text-xs text-text-tertiary">Energy: <span className="text-text-primary font-mono">{selectedEntry.energy}/10</span></span>}
                  </div>
                )}
                {selectedEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-text-secondary">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{selectedEntry.content}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {entries.length === 0 && <p className="text-sm text-text-tertiary">No entries yet</p>}
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="bg-surface-3 rounded-lg p-3 cursor-pointer hover:bg-surface-4 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-text-tertiary font-mono">
                        {format(new Date(entry.created_at), 'MMM d, yyyy')}
                      </span>
                      <div className="flex items-center gap-2">
                        {entry.mood && <span className="text-[10px] text-text-tertiary">mood {entry.mood}</span>}
                        {entry.energy && <span className="text-[10px] text-text-tertiary">energy {entry.energy}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">{entry.content}</p>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {entry.tags.map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-2 text-text-tertiary">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Realization detail modal ────────────────────── */}
      {selectedRealization && (
        <Modal onClose={() => setSelectedRealization(null)}>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-text-primary font-medium leading-snug">{selectedRealization.headline}</h3>
              <button onClick={() => setSelectedRealization(null)} className="text-text-tertiary hover:text-text-primary text-lg flex-shrink-0">×</button>
            </div>
            <span className="text-[10px] text-text-tertiary font-mono">
              {format(new Date(selectedRealization.created_at), 'EEEE, MMMM d yyyy')}
            </span>
            {selectedRealization.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedRealization.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-text-secondary">{tag}</span>
                ))}
              </div>
            )}
            <div className="bg-surface-3 rounded-lg p-4">
              <p className="text-sm text-text-primary leading-relaxed">{selectedRealization.clinical_summary}</p>
            </div>
            <div className="border-t border-border pt-3">
              <details>
                <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary">
                  View source conversation
                </summary>
                <p className="text-xs text-text-tertiary mt-2 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedRealization.source_text}
                </p>
              </details>
            </div>
            <button
              onClick={async () => {
                await fetch(`/api/realizations?id=${selectedRealization.id}`, { method: 'DELETE' })
                setRealizations(prev => prev.filter(r => r.id !== selectedRealization.id))
                setSelectedRealization(null)
              }}
              className="text-xs text-accent-red hover:text-accent-red/80 w-fit"
            >
              Delete realization
            </button>
          </div>
        </Modal>
      )}

      {/* ── New realization modal ───────────────────────── */}
      {showNewRealization && (
        <Modal onClose={() => { setShowNewRealization(false); setPasteText(''); setAnalyzed(null); setSaveError(null) }}>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-medium">New realization</h3>
              <button
                onClick={() => { setShowNewRealization(false); setPasteText(''); setAnalyzed(null); setSaveError(null) }}
                className="text-text-tertiary hover:text-text-primary text-lg"
              >×</button>
            </div>

            {!analyzed ? (
              <>
                <p className="text-xs text-text-tertiary">
                  Paste a conversation with Claude where you had a significant realization. Claude will extract and frame the key insight.
                </p>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste your Claude conversation here..."
                  rows={12}
                  className="bg-surface-3 border border-border rounded-md px-4 py-3 text-sm text-text-primary
                             placeholder:text-text-tertiary focus:outline-none focus:border-border-strong
                             resize-none leading-relaxed"
                />
                {saveError && <p className="text-xs text-accent-red">{saveError}</p>}
                <button
                  onClick={analyzeText}
                  disabled={analyzing || !pasteText.trim()}
                  className="btn-primary"
                >
                  {analyzing ? 'Analyzing...' : 'Extract realization'}
                </button>
              </>
            ) : (
              <>
                <div className="bg-surface-3 rounded-lg p-4 flex flex-col gap-2">
                  <span className="widget-label">Extracted realization</span>
                  <p className="text-sm font-medium text-text-primary">{analyzed.headline}</p>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1">{analyzed.clinical_summary}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="widget-label">Tags (optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={realizationTagInput}
                      onChange={e => setRealizationTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRealizationTag())}
                      placeholder="Add tag + Enter"
                      className="bg-surface-3 border border-border rounded-md px-3 py-1.5 text-xs text-text-primary
                                 placeholder:text-text-tertiary focus:outline-none flex-1"
                    />
                  </div>
                  {realizationTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {realizationTags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-text-secondary">
                          {tag}
                          <button onClick={() => setRealizationTags(p => p.filter(t => t !== tag))} className="text-text-tertiary hover:text-accent-red">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {saveError && <p className="text-xs text-accent-red">{saveError}</p>}

                <div className="flex items-center gap-3">
                  <button onClick={saveRealization} disabled={savingRealization} className="btn-primary">
                    {savingRealization ? 'Saving...' : 'Save realization'}
                  </button>
                  <button onClick={() => { setAnalyzed(null); setSaveError(null) }} className="text-xs text-text-tertiary hover:text-text-secondary">
                    ← re-analyze
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── Executive summary modal ─────────────────────── */}
      {showSummary && summary && (
        <Modal onClose={() => setShowSummary(false)}>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-medium">Psychological Growth Summary</h3>
              <button onClick={() => setShowSummary(false)} className="text-text-tertiary hover:text-text-primary text-lg">×</button>
            </div>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{summary}</p>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                onClick={generateSummary}
                disabled={generatingSummary}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {generatingSummary ? 'Regenerating...' : 'Regenerate'}
              </button>
              <span className="text-[10px] text-text-dim font-mono">Based on {realizations.length} realizations</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}