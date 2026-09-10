'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { estimate1RM } from './training-setplan'

/**
 * Kilaže glavnih liftova (squat / bench / deadlift + varijacije) iz prošlog bloka.
 *
 * "Prošli blok" = najnoviji STARIJI blok (po created_at, bez predložaka) koji ima
 * odrađene setove glavnih liftova. Status bloka tu ne pomaže — u bazi postoje samo
 * 'active' i 'planned' — a doslovno prethodni blok zna biti prazan (isplaniran pa
 * nikad odrađen), pa takve preskačemo.
 *
 * Broje se samo setovi označeni kao odrađeni: nezavršeni setovi s kilažom su
 * uglavnom trenerove planirane backoff kilaže, ne ono što je lifter stvarno digao.
 */

const LIFTS = [
  { label: 'SQUAT',    comp: 'Squat',    variation: 'Squat Variation' },
  { label: 'BENCH',    comp: 'Bench',    variation: 'Bench Variation' },
  { label: 'DEADLIFT', comp: 'Deadlift', variation: 'Deadlift Variation' },
] as const
const MAIN_CATS = new Set<string>(LIFTS.flatMap(l => [l.comp, l.variation]))
const MAX_CANDIDATES = 6

type Top = { kg: number; reps: string; fromPlan: boolean; rpe: number | null; e1rm: number | null }
// weeks i best su već svedeni na top setove (vidi topSets)
type ExRow = { name: string; category: string; weeks: Record<number, Top[]>; best: Top[]; bestE1rm: number | null }
type Result = { blockName: string; weeks: number[]; rows: ExRow[]; skipped: number }

// m2o embed stiže kao objekt, ali ga supabase-js bez generiranih tipova zna vratiti kao niz
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

const repsOf = (t: Top) => parseFloat(t.reps) || 0

/**
 * Top setovi = najteži set za svaki broj ponavljanja, ali samo oni koje nijedan
 * drugi set ne nadmašuje I kilažom I ponavljanjima. Tako 237.5×1 i 220×5 oba
 * ostaju (jedinica i petica), a 200×3 otpada jer je 220×5 teži s više ponavljanja.
 * Poredano od jedinica prema većem broju ponavljanja.
 */
function topSets(sets: Top[]): Top[] {
  const byReps = new Map<number, Top>()
  for (const t of sets) {
    const cur = byReps.get(repsOf(t))
    if (!cur || t.kg > cur.kg) byReps.set(repsOf(t), t)
  }
  const cands = [...byReps.values()]
  return cands
    .filter(a => !cands.some(b => b !== a && b.kg >= a.kg && repsOf(b) >= repsOf(a)))
    .sort((a, b) => repsOf(a) - repsOf(b))
}

const skippedLabel = (n: number) =>
  n === 1 ? 'Preskočen 1 prazan blok' : n < 5 ? `Preskočena ${n} prazna bloka` : `Preskočeno ${n} praznih blokova`

async function loadPrevBlock(athleteId: string, currentBlockId: string | null): Promise<Result | null> {
  const supabase = createClient()
  const { data: blocks, error: bErr } = await supabase.from('blocks')
    .select('id, name, goal, created_at')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
  if (bErr) throw bErr

  // Predloške filtriramo ovdje, ne s .neq('goal', …) — to bi izbacilo i sve normalne blokove (goal IS NULL)
  const real = (blocks ?? []).filter(b => b.goal !== '__template__')
  const idx = currentBlockId ? real.findIndex(b => b.id === currentBlockId) : -1
  const candidates = (idx >= 0 ? real.slice(idx + 1) : real).slice(0, MAX_CANDIDATES)

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i]

    // Pripadnost bloku isključivo relacijom workout → week → block (datumi blokova su nepouzdani)
    const { data: wes, error: weErr } = await supabase.from('workout_exercises')
      .select('id, planned_reps, exercises(name, category), workouts!inner(athlete_id, weeks!inner(week_number, block_id))')
      .eq('workouts.athlete_id', athleteId)
      .eq('workouts.weeks.block_id', cand.id)
    if (weErr) throw weErr

    const meta = new Map<string, { name: string; category: string; week: number; plannedReps: string | null }>()
    for (const r of (wes ?? []) as any[]) {
      const ex = one<any>(r.exercises), wk = one<any>(one<any>(r.workouts)?.weeks)
      if (!ex || !wk || !MAIN_CATS.has(ex.category)) continue
      meta.set(r.id, { name: ex.name, category: ex.category, week: wk.week_number, plannedReps: r.planned_reps })
    }
    if (meta.size === 0) continue

    const { data: sets, error: sErr } = await supabase.from('set_logs')
      .select('workout_exercise_id, weight_kg, reps, rpe')
      .in('workout_exercise_id', [...meta.keys()])
      .eq('completed', true)
      .not('weight_kg', 'is', null)
      .limit(2000)
    if (sErr) throw sErr
    if (!sets?.length) continue

    const byName = new Map<string, ExRow>()
    const weekSet = new Set<number>()
    for (const s of sets as any[]) {
      const m = meta.get(s.workout_exercise_id)
      if (!m) continue
      const kg = Number(s.weight_kg) // numeric kolone stižu kao string
      if (!kg) continue
      // ~10 % odrađenih setova nema upisana ponavljanja → uzmi planirana i označi ih
      const logged = s.reps != null && String(s.reps).trim() !== ''
      const reps = logged ? String(s.reps).trim() : (m.plannedReps ?? '')
      const rpe = s.rpe != null && s.rpe !== '' ? Number(s.rpe) : null
      const top: Top = { kg, reps, fromPlan: !logged && !!reps, rpe, e1rm: estimate1RM(kg, reps, rpe) }

      weekSet.add(m.week)
      let row = byName.get(m.name)
      if (!row) { row = { name: m.name, category: m.category, weeks: {}, heaviest: top, bestE1rm: null }; byName.set(m.name, row) }
      const cur = row.weeks[m.week]
      if (!cur || heavier(cur, top)) row.weeks[m.week] = top
      if (heavier(row.heaviest, top)) row.heaviest = top
      if (top.e1rm != null && (row.bestE1rm == null || top.e1rm > row.bestE1rm)) row.bestE1rm = top.e1rm
    }
    if (byName.size === 0) continue

    return { blockName: cand.name, weeks: [...weekSet].sort((a, b) => a - b), rows: [...byName.values()], skipped: i }
  }
  return null
}

const th: CSSProperties = { fontSize: '0.5rem', letterSpacing: '0.2em', color: '#777', fontWeight: 700, textAlign: 'center', padding: '6px 10px', whiteSpace: 'nowrap' }
const thSticky: CSSProperties = { ...th, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--t-s1)', zIndex: 1 }
const td: CSSProperties = { textAlign: 'center', padding: '10px', whiteSpace: 'nowrap' }
const tdSticky: CSSProperties = { ...td, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--t-s1)', zIndex: 1, minWidth: '130px', maxWidth: '180px', whiteSpace: 'normal' }
const dash = <span style={{ color: '#3a3a45' }}>–</span>

function SetCell({ t, strong = false }: { t: Top; strong?: boolean }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: strong ? '0.92rem' : '0.84rem', color: strong ? '#fff' : '#e0e0e0' }}>{t.kg}</span>
      {t.reps && <span style={{ fontSize: '0.64rem', color: t.fromPlan ? '#666' : '#aaa', marginLeft: '2px' }}>×{t.reps}{t.fromPlan ? '*' : ''}</span>}
      {t.rpe != null && <span style={{ fontSize: '0.56rem', color: '#facc15', marginLeft: '4px' }}>@{t.rpe}</span>}
    </span>
  )
}

type State = { status: 'loading' } | { status: 'error'; msg: string } | { status: 'done'; data: Result | null }

export function PrevBlockLiftsModal({ athleteId, currentBlockId, onClose }: {
  athleteId: string; currentBlockId: string | null; onClose: () => void
}) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    loadPrevBlock(athleteId, currentBlockId)
      .then(data => { if (alive) setState({ status: 'done', data }) })
      .catch(e => { if (alive) setState({ status: 'error', msg: e?.message ?? String(e) }) })
    return () => { alive = false }
  }, [athleteId, currentBlockId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const data = state.status === 'done' ? state.data : null
  const hasPlanReps = !!data?.rows.some(r => Object.values(r.weeks).some(t => t.fromPlan) || r.heaviest.fromPlan)

  // Portal na <body>: modal izgleda isto na stranici treninga i u admin panelu
  // (admin remapira --t-* tokene) i ne može ga zarobiti roditelj s transformom.
  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.15s ease' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Kilaže iz prošlog bloka"
        style={{ width: '100%', maxWidth: '780px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: 'var(--t-s1)', border: '1px solid var(--t-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)', fontFamily: 'var(--fm)', color: '#e0e0e0' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--t-border)', background: 'var(--t-s2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', color: '#888' }}>KILAŽE · PROŠLI BLOK</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', fontWeight: 800, color: '#f0f0f0', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {state.status === 'done' ? (data?.blockName ?? '—') : '…'}
            </div>
            {data && data.skipped > 0 && (
              <div style={{ fontSize: '0.6rem', color: '#777', marginTop: '4px' }}>{skippedLabel(data.skipped)} bez odrađenih setova</div>
            )}
          </div>
          <button onClick={onClose} aria-label="Zatvori"
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '6px 0 16px' }}>
          {state.status === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '48px 0', color: '#666' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em' }}>UČITAVANJE…</span>
            </div>
          )}

          {state.status === 'error' && (
            <div style={{ padding: '32px 20px', color: '#f87171', fontSize: '0.75rem' }}>Greška pri učitavanju: {state.msg}</div>
          )}

          {state.status === 'done' && !data && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#777', fontSize: '0.75rem', lineHeight: 1.7 }}>
              Nema prošlog bloka s odrađenim setovima za squat, bench ili deadlift.<br />
              Kilaže se pojave čim lifter u nekom starijem bloku označi setove kao odrađene.
            </div>
          )}

          {data && LIFTS.map(lift => {
            const rows = data.rows
              .filter(r => r.category === lift.comp || r.category === lift.variation)
              // comp lift prvi, pa varijacije abecedno
              .sort((a, b) => (a.category === lift.comp ? 0 : 1) - (b.category === lift.comp ? 0 : 1) || a.name.localeCompare(b.name, 'hr'))
            return (
              <section key={lift.label} style={{ padding: '14px 20px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.62rem', letterSpacing: '0.3em', fontWeight: 800, color: '#f0f0f0' }}>{lift.label}</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--t-border)' }} />
                </div>
                {rows.length === 0 ? (
                  <div style={{ fontSize: '0.68rem', color: '#666', padding: '4px 0 10px' }}>Nema odrađenih setova u ovom bloku.</div>
                ) : (
                  // Tablica se na mobitelu scrolla vodoravno, stupac s vježbom ostaje zalijepljen
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr>
                          <th style={thSticky}>VJEŽBA</th>
                          {data.weeks.map(w => <th key={w} style={th}>TJ {w}</th>)}
                          <th style={th}>NAJTEŽE</th>
                          <th style={{ ...th, color: '#4ade80' }}>e1RM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.name} style={{ borderTop: '1px solid var(--t-border)' }}>
                            <td style={tdSticky}>
                              <div style={{ fontSize: '0.74rem', color: '#e8e8e8', fontWeight: 600 }}>{r.name}</div>
                              <div style={{ fontSize: '0.5rem', letterSpacing: '0.18em', color: r.category === lift.comp ? '#facc15' : '#666', marginTop: '2px' }}>
                                {r.category === lift.comp ? 'COMP' : 'VARIJACIJA'}
                              </div>
                            </td>
                            {data.weeks.map(w => <td key={w} style={td}>{r.weeks[w] ? <SetCell t={r.weeks[w]} /> : dash}</td>)}
                            <td style={td}><SetCell t={r.heaviest} strong /></td>
                            <td style={td}>
                              {r.bestE1rm != null ? (
                                <span style={{ fontFamily: 'var(--fd)', fontWeight: 800, color: '#4ade80', fontSize: '0.9rem' }}>
                                  {r.bestE1rm}<span style={{ fontSize: '0.55rem', color: 'rgba(74,222,128,0.55)', marginLeft: '2px' }}>kg</span>
                                </span>
                              ) : dash}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )
          })}

          {data && (
            <div style={{ padding: '12px 20px 0', fontSize: '0.6rem', color: '#666', lineHeight: 1.6 }}>
              Po tjednu je prikazan najteži odrađeni set (kg × ponavljanja @RPE).
              {hasPlanReps && <><br />* ponavljanja nisu upisana — prikazana su planirana</>}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
