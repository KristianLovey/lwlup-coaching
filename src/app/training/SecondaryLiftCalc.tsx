'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RPE_ROWS, weightFromRpe } from './training-setplan'

/**
 * Kalkulator sekundarnih (varijacijskih) liftova.
 *
 * Preslikano iz trenerske tablice: natjecateljski 1RM × postotak varijacije =
 * 1RM te varijacije, a iz njega RPE tablica (ista RTS shema koju koristi i
 * ostatak aplikacije) daje kilažu za svaki RPE × broj ponavljanja.
 * Kilaže su zaokružene na 2.5 kg, kako trener i računa — tablica zaokružuje na
 * 1 kg, pa 98 kod nas ispadne 97.5.
 *
 * SSB i Pin Squat namjerno koriste 87 %, iako im je naveden raspon 87.5–90 % —
 * tako računa i tablica iz koje su postotci preuzeti.
 */

type LiftK = 'squat' | 'bench' | 'deadlift'

const LIFTS: { key: LiftK; label: string; col: string }[] = [
  { key: 'squat',    label: 'SQUAT',    col: 'current_squat_1rm' },
  { key: 'bench',    label: 'BENCH',    col: 'current_bench_1rm' },
  { key: 'deadlift', label: 'DEADLIFT', col: 'current_deadlift_1rm' },
]

// pct = postotak koji tablica stvarno koristi; range = raspon naveden uz njega;
// db = naziv vježbe u bazi, gdje postoji (drugdje se zove drugačije nego u tablici)
const VARIATIONS: { lift: LiftK; label: string; pct: number; range: string; db?: string }[] = [
  { lift: 'squat', label: 'Paused Squat',  pct: 93,   range: '92–94',      db: 'Paused Squat' },
  { lift: 'squat', label: 'High Bar Squat', pct: 93,  range: '90–97.5',    db: 'HB Squat' },
  { lift: 'squat', label: 'Tempo Squat',   pct: 90,   range: '87.5–92.5',  db: 'Tempo Squat' },
  { lift: 'squat', label: 'SSB Squat',     pct: 87,   range: '87.5–90',    db: 'SSB Squat' },
  { lift: 'squat', label: 'Pin Squat',     pct: 87,   range: '87.5–90',    db: 'Pin Squat' },
  { lift: 'squat', label: 'Front Squat',   pct: 83,   range: '80–87.5' },

  { lift: 'bench', label: 'Close Grip Bench Press', pct: 96,   range: '96–98',      db: 'Close Grip Bench' },
  { lift: 'bench', label: '3ct Bench Press',        pct: 95,   range: '92.5–97.5',  db: 'Bench 3cnt' },
  { lift: 'bench', label: 'Tempo Bench Press',      pct: 93,   range: '90–97',      db: 'Tempo Bench' },
  { lift: 'bench', label: 'Spoto Press',            pct: 93,   range: '92.5–95',    db: 'Spoto Bench' },
  { lift: 'bench', label: 'T-Shirt Bench Press',    pct: 93,   range: '92.5–95' },
  { lift: 'bench', label: 'Larsen Bench Press',     pct: 92.5, range: '90–95' },

  { lift: 'deadlift', label: 'Trap Bar',                        pct: 107.5, range: '105–110' },
  { lift: 'deadlift', label: 'Block Pull',                      pct: 103,   range: '97.5–107.5', db: 'Block Deadlift' },
  { lift: 'deadlift', label: 'Paused Deadlift (ispod koljena)', pct: 93,    range: '92.5–95',    db: 'Paused Deadlift' },
  { lift: 'deadlift', label: 'Paused Deadlift (sa poda)',       pct: 92.5,  range: '90–95',      db: 'Paused Deadlift' },
  { lift: 'deadlift', label: 'Deficit Pull',                    pct: 92.5,  range: '90–95',      db: 'Deficit Deadlift' },
  { lift: 'deadlift', label: 'Romanian Deadlift',               pct: 80,    range: '75–85',      db: 'RDL' },
]

const REPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const fmt = (n: number) => String(Math.round(n * 100) / 100)
const parseNum = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null }

const eyebrow: CSSProperties = { fontSize: '0.5rem', letterSpacing: '0.22em', color: '#777', fontWeight: 700, textTransform: 'uppercase' }
const th: CSSProperties = { fontSize: '0.5rem', letterSpacing: '0.16em', color: '#777', fontWeight: 700, padding: '6px 8px', whiteSpace: 'nowrap', textAlign: 'center' }
const td: CSSProperties = { padding: '7px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.8rem', color: '#e8e8e8', fontVariantNumeric: 'tabular-nums' }

export function SecondaryLiftCalcModal({ athleteId, athleteName, onClose }: {
  athleteId: string; athleteName?: string; onClose: () => void
}) {
  const [lift, setLift] = useState<LiftK>('squat')
  const [maxes, setMaxes] = useState<Record<LiftK, string>>({ squat: '', bench: '', deadlift: '' })
  const [fromProfile, setFromProfile] = useState<Record<LiftK, boolean>>({ squat: false, bench: false, deadlift: false })
  const [picked, setPicked] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 1RM iz profila kao prijedlog — polje se slobodno prepisuje rukom
  useEffect(() => {
    let alive = true
    const supabase = createClient()
    supabase.from('lifters').select('current_squat_1rm, current_bench_1rm, current_deadlift_1rm').eq('id', athleteId).maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        if (data) {
          const next = { squat: '', bench: '', deadlift: '' } as Record<LiftK, string>
          const have = { squat: false, bench: false, deadlift: false } as Record<LiftK, boolean>
          for (const l of LIFTS) {
            const v = (data as Record<string, unknown>)[l.col]
            if (v != null && Number(v) > 0) { next[l.key] = fmt(Number(v)); have[l.key] = true }
          }
          setMaxes(next); setFromProfile(have)
        }
        setLoading(false)
      })
    return () => { alive = false }
  }, [athleteId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const compMax = parseNum(maxes[lift])
  const rows = VARIATIONS.filter(v => v.lift === lift)
  const sel = rows.find(v => v.label === picked) ?? null
  const varMax = sel && compMax ? Math.round(compMax * sel.pct) / 100 : null

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.15s ease' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Kalkulator sekundarnih liftova"
        style={{ width: '100%', maxWidth: '680px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--t-s1)', border: '1px solid var(--t-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)', fontFamily: 'var(--fm)', color: '#e0e0e0' }}>

        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--t-border)', background: 'var(--t-s2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', color: '#888' }}>KALKULATOR · SEKUNDARNI LIFTOVI</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', fontWeight: 700, color: '#f0f0f0', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athleteName ?? 'Kilaže varijacija'}</div>
          </div>
          <button onClick={onClose} aria-label="Zatvori" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '14px 18px 18px' }}>
          {/* Lift + natjecateljski 1RM */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {LIFTS.map(l => (
              <button key={l.key} onClick={() => { setLift(l.key); setPicked(null) }}
                style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.16em', fontWeight: 700,
                  background: lift === l.key ? '#f0f0f0' : 'var(--t-s2)', color: lift === l.key ? '#0a0a0a' : '#aaa', border: `1px solid ${lift === l.key ? '#f0f0f0' : 'var(--t-border)'}` }}>
                {l.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
            <span style={{ ...eyebrow, flexShrink: 0 }}>Natjecateljski 1RM</span>
            <input value={maxes[lift]} inputMode="decimal"
              onChange={e => { setMaxes(m => ({ ...m, [lift]: e.target.value })); setFromProfile(f => ({ ...f, [lift]: false })) }}
              placeholder={loading ? '…' : 'npr. 130'} aria-label="Natjecateljski 1RM"
              style={{ width: '110px', background: 'var(--t-s2)', border: '1px solid var(--t-border)', borderRadius: '8px', padding: '8px 10px', color: '#f0f0f0', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.95rem', outline: 'none' }} />
            <span style={{ fontSize: '0.6rem', color: '#666' }}>kg</span>
            {loading
              ? <Loader2 size={13} color="#666" style={{ animation: 'spin 1s linear infinite' }} />
              : <span style={{ fontSize: '0.56rem', color: '#666' }}>{fromProfile[lift] ? 'iz profila' : 'ručni unos'}</span>}
          </div>

          {/* 1RM po varijacijama */}
          <div style={{ ...eyebrow, marginTop: '18px', marginBottom: '8px' }}>1RM varijacija — odaberi za tablicu</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '7px' }}>
            {rows.map(v => {
              const on = picked === v.label
              const kg = compMax ? Math.round(compMax * v.pct) / 100 : null
              return (
                <button key={v.label} onClick={() => setPicked(on ? null : v.label)}
                  style={{ textAlign: 'left', padding: '9px 11px', borderRadius: '10px', cursor: 'pointer', minWidth: 0,
                    background: on ? 'var(--t-s3)' : 'var(--t-s2)', border: `1px solid ${on ? '#4ade80' : 'var(--t-border)'}`, fontFamily: 'var(--fm)' }}>
                  <div style={{ fontSize: '0.64rem', color: on ? '#fff' : '#ddd', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginTop: '3px' }}>
                    <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '1rem', color: kg != null ? '#4ade80' : '#555', fontVariantNumeric: 'tabular-nums' }}>{kg != null ? fmt(kg) : '—'}</span>
                    <span style={{ fontSize: '0.5rem', color: '#666' }}>kg · {fmt(v.pct)}%</span>
                  </div>
                  <div style={{ fontSize: '0.48rem', color: '#5a5a5a', marginTop: '2px', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    raspon {v.range}%{v.db ? ` · ${v.db}` : ''}
                  </div>
                </button>
              )
            })}
          </div>

          {/* RPE tablica za odabranu varijaciju */}
          {sel && varMax != null ? (
            <>
              <div style={{ ...eyebrow, marginTop: '18px', marginBottom: '8px' }}>
                {sel.label} · 1RM {fmt(varMax)} kg — kilaže po RPE i ponavljanjima
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--t-border)', borderRadius: '10px' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'var(--t-s2)' }}>
                      <th style={{ ...th, position: 'sticky', left: 0, background: 'var(--t-s2)', zIndex: 1 }}>@</th>
                      {REPS.map(r => <th key={r} style={th}>x{r}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {RPE_ROWS.map(rpe => (
                      <tr key={rpe} style={{ borderTop: '1px solid var(--t-border)' }}>
                        <td style={{ ...td, position: 'sticky', left: 0, background: 'var(--t-s1)', color: '#facc15', fontSize: '0.7rem', zIndex: 1 }}>{rpe}</td>
                        {REPS.map(r => {
                          const kg = weightFromRpe(varMax, r, rpe)
                          return <td key={r} style={td}>{kg != null ? fmt(kg) : '—'}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '0.58rem', color: '#666', lineHeight: 1.6, marginTop: '10px' }}>
                Kilaže su zaokružene na 2.5 kg. Postotak varijacije množi natjecateljski 1RM, a RPE tablica je ista koju
                aplikacija koristi za procjenu 1RM.
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.64rem', color: '#666', marginTop: '16px' }}>
              {compMax ? 'Odaberi varijaciju za tablicu kilaža po RPE i ponavljanjima.' : 'Upiši natjecateljski 1RM za ovaj lift.'}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
