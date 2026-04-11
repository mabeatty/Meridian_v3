'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'

const TIMING_COLORS: Record<string, { bg: string; color: string }> = {
  morning:   { bg: '#faeeda', color: '#633806' },
  breakfast: { bg: '#eaf3de', color: '#27500a' },
  dinner:    { bg: '#eeedfe', color: '#3c3489' },
  evening:   { bg: '#e1f5ee', color: '#085041' },
  training:  { bg: '#faece7', color: '#712b13' },
  meal:      { bg: '#e6f1fb', color: '#0c447c' },
}

const TARGETS = [
  { id: 'water',    label: 'Water',    unit: 'oz',   goal: '64–80', max: 80,   color: '#378ADD' },
  { id: 'protein',  label: 'Protein',  unit: 'g',    goal: '200g',  max: 200,  color: '#639922' },
  { id: 'calories', label: 'Calories', unit: 'kcal', goal: '2,600–2,700', max: 2700, color: '#BA7517' },
  { id: 'carbs',    label: 'Carbs',    unit: 'g',    goal: '275–300', max: 300, color: '#D85A30' },
  { id: 'fat',      label: 'Fat',      unit: 'g',    goal: '95–110', max: 110,  color: '#7F77DD' },
]

function TimingBadge({ timing }: { timing: keyof typeof TIMING_COLORS }) {
  const c = TIMING_COLORS[timing]
  const labels: Record<string, string> = {
    morning: 'Morning · empty stomach',
    breakfast: 'With breakfast · take with fat',
    meal: 'With each meal',
    dinner: 'With dinner',
    evening: 'Evening · with water',
    training: 'Training days',
  }
  return (
    <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap', background: c.bg, color: c.color }}>
      {labels[timing]}
    </span>
  )
}

function SuppRow({ name, dose, note }: { name: string; dose: string; note: string }) {
  return (
    <div style={{ padding: '9px 0', borderBottom: '0.5px solid #242424' }}>
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f0' }}>{name}</div>
      <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#505050', marginTop: '2px' }}>{dose}</div>
      <div style={{ fontSize: '12px', color: '#909090', marginTop: '3px', lineHeight: 1.45 }}>{note}</div>
    </div>
  )
}

function SuppCard({ timing, children }: { timing: keyof typeof TIMING_COLORS; children: React.ReactNode }) {
  return (
    <div style={{ background: '#161616', border: '1px solid #242424', borderRadius: '10px', padding: '14px' }}>
      <div style={{ marginBottom: '10px' }}>
        <TimingBadge timing={timing} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

function TargetsCard() {
  const [values, setValues] = useState<Record<string, string>>({})
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const saved = localStorage.getItem(`supplement-targets-${today}`)
    if (saved) setValues(JSON.parse(saved))
  }, [])

  function handleChange(id: string, val: string) {
    const next = { ...values, [id]: val }
    setValues(next)
    localStorage.setItem(`supplement-targets-${today}`, JSON.stringify(next))
  }

  return (
    <div style={{ background: '#161616', border: '1px solid #242424', borderRadius: '10px', padding: '14px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#505050', fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>
        Daily targets
      </div>
      {TARGETS.map(t => {
        const val = parseFloat(values[t.id] || '0') || 0
        const pct = Math.min(Math.round((val / t.max) * 100), 100)
        return (
          <div key={t.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', borderBottom: '0.5px solid #242424' }}>
              <div style={{ fontSize: '12px', flex: 1, color: '#f0f0f0' }}>{t.label}</div>
              <input
                type="number"
                placeholder="0"
                value={values[t.id] ?? ''}
                onChange={e => handleChange(t.id, e.target.value)}
                style={{ width: '54px', fontSize: '12px', fontFamily: 'DM Mono, monospace', textAlign: 'right', padding: '3px 6px', borderRadius: '5px', border: '0.5px solid #363636', background: '#1e1e1e', color: '#f0f0f0', outline: 'none' }}
              />
              <span style={{ fontSize: '10px', color: '#505050', width: '22px' }}>{t.unit}</span>
              <div style={{ fontSize: '10px', color: '#505050', fontFamily: 'DM Mono, monospace', width: '52px', textAlign: 'right' }}>{t.goal}</div>
            </div>
            <div style={{ height: '2px', background: '#242424', borderRadius: '1px', marginTop: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: '1px', background: t.color, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SupplementsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Header />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '12px', maxWidth: '1400px' }}>

          {/* LEFT — Morning + Breakfast */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SuppCard timing="morning">
              <SuppRow name="L-Tyrosine" dose="500mg – 2g" note="Dopamine/norepinephrine precursor — focus, drive, motivation. Start at 500mg, build to 2g." />
              <SuppRow name="Rhodiola Rosea" dose="200 – 400mg" note="Sports Research. Adaptogen — reduces cortisol, improves stress resilience and mental stamina." />
              <SuppRow name="L-Theanine" dose="100 – 200mg" note="Calm focus without sedation — pairs well with tyrosine. Can take with or without food." />
              <SuppRow name="Magnesium L-Threonate" dose="1.5 – 2g (as Magtein)" note="Crosses blood-brain barrier — cognitive function, anxiety reduction, sleep quality." />
              <SuppRow name="L-Glutamine" dose="5g powder" note="NOW Foods. Gut lining repair, immune support, muscle recovery, GABA/glutamate balance." />
              <div style={{ padding: '9px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f0' }}>Probiotic</div>
                <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#505050', marginTop: '2px' }}>1 capsule</div>
                <div style={{ fontSize: '12px', color: '#909090', marginTop: '3px', lineHeight: 1.45 }}>Seed DS-01 or Garden of Life 50B. Microbiome restoration and maintenance.</div>
              </div>
            </SuppCard>

            <SuppCard timing="breakfast">
              <SuppRow name="Vitamin D3" dose="2,000 – 5,000 IU" note="Take with fat for absorption. Immune function, mood regulation, testosterone support." />
              <div style={{ padding: '9px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f0' }}>B Complex</div>
                <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#505050', marginTop: '2px' }}>1 capsule</div>
                <div style={{ fontSize: '12px', color: '#909090', marginTop: '3px', lineHeight: 1.45 }}>Take with food to avoid nausea. Energy metabolism, nervous system function, stress response.</div>
              </div>
            </SuppCard>
          </div>

          {/* MIDDLE — Dinner + Evening + Training */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SuppCard timing="dinner">
              <SuppRow name="Fish Oil" dose="2g EPA" note="Sports Research Triple Strength. Anti-inflammatory, cardiovascular health, brain function, mood." />
              <SuppRow name="Ashwagandha KSM-66" dose="300 – 600mg" note="Sports Research. Cortisol reduction, stress resilience, sleep quality, testosterone support." />
              <SuppRow name="Magnesium Glycinate" dose="200 – 400mg" note="Sports Research. Nervous system calming, sleep quality, muscle recovery." />
              <div style={{ padding: '9px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f0' }}>Zinc</div>
                <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#505050', marginTop: '2px' }}>1 capsule</div>
                <div style={{ fontSize: '12px', color: '#909090', marginTop: '3px', lineHeight: 1.45 }}>NOW Foods. Immune function, testosterone support, sleep quality.</div>
              </div>
            </SuppCard>

            <SuppCard timing="evening">
              <div style={{ padding: '9px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f0' }}>Psyllium Husk</div>
                <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#505050', marginTop: '2px' }}>Start 1 cap → build to 3 over 3 weeks</div>
                <div style={{ fontSize: '12px', color: '#909090', marginTop: '3px', lineHeight: 1.45 }}>NOW Foods. Prebiotic fiber — feeds beneficial bacteria, improves motility. Must take with 8–12oz water, follow with another full glass.</div>
              </div>
            </SuppCard>

            <SuppCard timing="training">
              <SuppRow name="Creatine" dose="5g" note="Any time — consistency matters more than timing. Strength, power output, cognitive function." />
              <div style={{ padding: '9px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f0' }}>Protein Powder</div>
                <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#505050', marginTop: '2px' }}>40 – 50g across day</div>
                <div style={{ fontSize: '12px', color: '#909090', marginTop: '3px', lineHeight: 1.45 }}>To hit 200g total daily protein target.</div>
              </div>
            </SuppCard>
          </div>

          {/* RIGHT — Targets + Each Meal + Systemic summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <TargetsCard />

            <SuppCard timing="meal">
              <div style={{ padding: '9px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f0' }}>Digestive Enzymes</div>
                <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#505050', marginTop: '2px' }}>1 – 2 capsules</div>
                <div style={{ fontSize: '12px', color: '#909090', marginTop: '3px', lineHeight: 1.45 }}>Enzymedica Digest Gold. Breaks down food before fermentation — directly reduces bloating and gas.</div>
              </div>
            </SuppCard>

            <div style={{ background: '#161616', borderLeft: '3px solid #1D9E75', borderRadius: '0 10px 10px 0', border: '1px solid #242424', borderLeft: '3px solid #1D9E75', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#505050', fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>
                What this stack is doing
              </div>
              <p style={{ fontSize: '12px', color: '#909090', lineHeight: 1.6, margin: '0 0 8px' }}>
                The morning stack addresses dopamine and stress resilience — tyrosine and rhodiola together support the drive and focus needed to play offense rather than manage threat.
              </p>
              <p style={{ fontSize: '12px', color: '#909090', lineHeight: 1.6, margin: '0 0 8px' }}>
                The gut protocol — glutamine, enzymes, probiotic, psyllium — repairs the gut-brain axis which directly influences mood, serotonin production, and baseline anxiety.
              </p>
              <p style={{ fontSize: '12px', color: '#909090', lineHeight: 1.6, margin: '0 0 8px' }}>
                The evening stack brings cortisol down, supports sleep architecture, and allows the nervous system to restore overnight.
              </p>
              <p style={{ fontSize: '12px', color: '#909090', lineHeight: 1.6, margin: 0 }}>
                The vivid dreams are a direct indicator that REM sleep quality is improving — the system consolidating psychological work during sleep.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
