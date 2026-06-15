'use client'
import { useState, useEffect, useCallback } from 'react'
import type { SetPlan, SetPlanType, DropConfig } from './types'

const FM = 'var(--fm)'
const FD = 'var(--fd, var(--fm))'

// ── Weight calculation ─────────────────────────────────────────────────
export function calcSetWeights(plan: SetPlan, numSets: number): number[] {
  if (numSets < 1 || !plan.top_weight) return []
  if (plan.type === 'backoff') {
    const pct = Math.max(0, Math.min(plan.backoff_pct ?? 10, 99))
    const desc: number[] = []
    let w = plan.top_weight
    for (let i = 0; i < numSets; i++) {
      desc.push(Math.round(w * 10) / 10)
      w = w * (1 - pct / 100)
    }
    return plan.direction === 'asc' ? [...desc].reverse() : desc
  } else {
    const weights: (number | null)[] = [plan.top_weight]
    for (let i = 1; i < numSets; i++) {
      const cfg = plan.drop_configs[i - 1]
      if (cfg != null && cfg.ref >= 0 && cfg.ref < weights.length) {
        const base = weights[cfg.ref] ?? plan.top_weight
        weights.push(Math.round(base * (cfg.pct ?? 100) / 100 * 10) / 10)
      } else {
        weights.push(null)
      }
    }
    return weights.filter((w): w is number => w !== null)
  }
}

function defaultPlan(topWeight: number, numSets: number): SetPlan {
  return {
    type: 'backoff',
    top_weight: topWeight,
    backoff_pct: 10,
    direction: 'desc',
    drop_configs: Array.from({ length: Math.max(0, numSets - 1) }, (_, i) => ({
      pct: 90,
      ref: Math.max(0, i),
    })),
  }
}

// ── ADMIN / TRENER EDITOR ──────────────────────────────────────────────
export function SetPlanSection({
  initialPlan,
  topWeightFallback,
  numSets,
  onSave,
  onClear,
}: {
  initialPlan: SetPlan | null | undefined
  topWeightFallback: number | null | undefined
  numSets: number
  onSave: (plan: SetPlan) => void
  onClear: () => void
}) {
  const [plan, setPlan] = useState<SetPlan>(
    () => initialPlan ?? defaultPlan(topWeightFallback ?? 100, numSets)
  )

  // Sync drop_configs length when numSets changes
  useEffect(() => {
    const needed = Math.max(0, numSets - 1)
    if (plan.drop_configs.length !== needed) {
      const next: SetPlan = {
        ...plan,
        drop_configs: Array.from({ length: needed }, (_, i) =>
          plan.drop_configs[i] ?? { pct: 90, ref: Math.max(0, i) }
        ),
      }
      setPlan(next)
      onSave(next)
    }
  }, [numSets]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(<K extends keyof SetPlan>(key: K, val: SetPlan[K]) => {
    setPlan(prev => {
      const next = { ...prev, [key]: val }
      onSave(next)
      return next
    })
  }, [onSave])

  const updateDrop = useCallback((idx: number, field: keyof DropConfig, val: number) => {
    setPlan(prev => {
      const configs = [...prev.drop_configs]
      configs[idx] = { ...configs[idx], [field]: val }
      const next = { ...prev, drop_configs: configs }
      onSave(next)
      return next
    })
  }, [onSave])

  const weights = calcSetWeights(plan, numSets)
  const BLUE = '#6b8cff'

  return (
    <div style={{ background: 'rgba(0,0,0,0.35)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px 16px' }}>

      {/* Type toggle + clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' }}>
          {(['backoff', 'dropset'] as SetPlanType[]).map(t => (
            <button key={t} onClick={() => update('type', t)}
              style={{ padding: '5px 12px', background: plan.type === t ? 'rgba(107,140,255,0.18)' : 'transparent', border: `1px solid ${plan.type === t ? 'rgba(107,140,255,0.45)' : 'transparent'}`, borderRadius: '5px', color: plan.type === t ? BLUE : 'rgba(255,255,255,0.3)', fontSize: '0.52rem', fontFamily: FM, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s' }}>
              {t === 'backoff' ? 'BACKOFF' : 'DROP SET'}
            </button>
          ))}
        </div>
        <button onClick={onClear}
          style={{ marginLeft: 'auto', padding: '4px 10px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: 'rgba(255,100,100,0.6)', fontSize: '0.5rem', fontFamily: FM, cursor: 'pointer', letterSpacing: '0.1em' }}>
          UKLONI PLAN
        </button>
      </div>

      {/* Top weight */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.44rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', fontFamily: FM, minWidth: '76px' }}>TOP SET</span>
        <input type="number" min={0} step={0.5} value={plan.top_weight || ''}
          onChange={e => update('top_weight', Number(e.target.value) || 0)}
          style={{ width: '72px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#f0f0f0', fontFamily: FD, fontSize: '1rem', fontWeight: 800, padding: '4px 8px', outline: 'none', textAlign: 'right' as const }} />
        <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', fontFamily: FM }}>kg</span>
      </div>

      {plan.type === 'backoff' ? (
        <>
          {/* % reduction */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.44rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', fontFamily: FM, minWidth: '76px' }}>SMANJENJE</span>
            <input type="number" min={0.5} max={50} step={0.5} value={plan.backoff_pct || ''}
              onChange={e => update('backoff_pct', Number(e.target.value) || 10)}
              style={{ width: '58px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(107,140,255,0.3)', borderRadius: '6px', color: BLUE, fontFamily: FD, fontSize: '1rem', fontWeight: 800, padding: '4px 8px', outline: 'none', textAlign: 'right' as const }} />
            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', fontFamily: FM }}>% po seriji</span>
          </div>

          {/* Direction */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.44rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', fontFamily: FM, minWidth: '76px' }}>SMJER</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {([['desc', '↓ OPADAJUĆI'], ['asc', '↑ RASTUĆI']] as const).map(([d, label]) => (
                <button key={d} onClick={() => update('direction', d)}
                  style={{ padding: '4px 11px', background: plan.direction === d ? 'rgba(107,140,255,0.14)' : 'transparent', border: `1px solid ${plan.direction === d ? 'rgba(107,140,255,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '5px', color: plan.direction === d ? BLUE : 'rgba(255,255,255,0.3)', fontSize: '0.5rem', fontFamily: FM, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Drop set per-set config */
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.44rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: FM, marginBottom: '8px' }}>KONFIGURACIJA SETOVA</div>

          {/* Set 1 — top (read-only display) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', padding: '7px 10px', background: 'rgba(239,53,53,0.08)', border: '1px solid rgba(239,53,53,0.2)', borderRadius: '7px' }}>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontFamily: FM, minWidth: '42px' }}>SET 1</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef3535', fontFamily: FD }}>{plan.top_weight} kg</span>
            <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.2)', fontFamily: FM, marginLeft: 'auto', letterSpacing: '0.15em' }}>TOP SET</span>
          </div>

          {plan.drop_configs.map((cfg, i) => {
            const displayIdx = i + 2 // Set 2, Set 3...
            const calcKg = weights[i + 1]
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px' }}>
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', fontFamily: FM, minWidth: '42px' }}>SET {displayIdx}</span>
                <input type="number" min={1} max={200} step={0.5} value={cfg.pct || ''}
                  onChange={e => updateDrop(i, 'pct', Number(e.target.value) || 90)}
                  style={{ width: '50px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(107,140,255,0.3)', borderRadius: '5px', color: BLUE, fontFamily: FD, fontSize: '0.82rem', fontWeight: 800, padding: '3px 6px', outline: 'none', textAlign: 'right' as const }} />
                <span style={{ fontSize: '0.44rem', color: 'rgba(255,255,255,0.28)', fontFamily: FM }}>% od</span>
                <select value={cfg.ref}
                  onChange={e => updateDrop(i, 'ref', Number(e.target.value))}
                  style={{ background: '#111', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '5px', color: 'rgba(255,255,255,0.7)', fontFamily: FM, fontSize: '0.52rem', padding: '3px 6px', outline: 'none', cursor: 'pointer' }}>
                  {Array.from({ length: displayIdx - 1 }, (_, ri) => (
                    <option key={ri} value={ri} style={{ background: '#0d0d0d' }}>Set {ri + 1}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: calcKg != null ? '#f0f0f0' : '#555', fontFamily: FD, marginLeft: 'auto', minWidth: '52px', textAlign: 'right' as const }}>
                  {calcKg != null ? `${calcKg} kg` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview weights strip */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
        <div style={{ fontSize: '0.4rem', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.18)', fontFamily: FM, marginBottom: '8px' }}>PREGLED SERIJA</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const }}>
          {weights.map((w, i) => {
            const isTop = plan.type === 'backoff'
              ? (plan.direction === 'desc' ? i === 0 : i === numSets - 1)
              : i === 0
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '6px 10px', background: isTop ? 'rgba(239,53,53,0.1)' : 'rgba(107,140,255,0.08)', border: `1px solid ${isTop ? 'rgba(239,53,53,0.3)' : 'rgba(107,140,255,0.22)'}`, borderRadius: '7px', minWidth: '46px' }}>
                <span style={{ fontSize: '0.36rem', color: 'rgba(255,255,255,0.28)', fontFamily: FM, letterSpacing: '0.12em' }}>S{i + 1}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isTop ? '#ef3535' : BLUE, fontFamily: FD, lineHeight: 1.1 }}>{w}</span>
                <span style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.18)', fontFamily: FM }}>kg</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── LIFTER READ-ONLY VIEW ──────────────────────────────────────────────
export function SetPlanWeightsView({ plan, numSets }: { plan: SetPlan; numSets: number }) {
  const weights = calcSetWeights(plan, numSets)
  if (weights.length === 0) return null

  const isTop = (i: number) =>
    plan.type === 'backoff'
      ? (plan.direction === 'desc' ? i === 0 : i === numSets - 1)
      : i === 0

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const, marginTop: '7px' }}>
      {weights.map((w, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '4px 7px', background: isTop(i) ? 'rgba(239,53,53,0.08)' : 'rgba(107,140,255,0.06)', border: `1px solid ${isTop(i) ? 'rgba(239,53,53,0.25)' : 'rgba(107,140,255,0.18)'}`, borderRadius: '6px', minWidth: '36px' }}>
          <span style={{ fontSize: '0.34rem', color: 'rgba(255,255,255,0.22)', fontFamily: FM, letterSpacing: '0.1em' }}>S{i + 1}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isTop(i) ? '#ef3535' : '#6b8cff', fontFamily: FD, lineHeight: 1.1 }}>{w}</span>
          <span style={{ fontSize: '0.3rem', color: 'rgba(255,255,255,0.15)', fontFamily: FM }}>kg</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
        <span style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.15)', fontFamily: FM, letterSpacing: '0.1em' }}>
          {plan.type === 'backoff'
            ? `${plan.direction === 'desc' ? '↓' : '↑'} −${plan.backoff_pct}%`
            : 'DROP SET'}
        </span>
      </div>
    </div>
  )
}
