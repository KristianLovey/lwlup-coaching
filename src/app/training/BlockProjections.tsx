'use client'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LIFTS, one, type Top } from './PrevBlockLifts'

/**
 * Projekcije kilaže za kraj bloka + napredak po tjednima.
 *
 * Trener ili admin upisuje cilj po glavnom liftu — jednu vrijednost ("150") ili
 * raspon ("145-150"). Lifter vidi kilažu iz 1. tjedna, skok iz tjedna u tjedan,
 * koliko mu je ostalo do cilja i otprilike koliko po tjednu, pa si skokove može
 * sam odrediti.
 *
 * Tjedna kilaža = najteži ODRAĐENI set natjecateljske varijante (kategorija
 * Squat / Bench / Deadlift, bez varijacija) — cilj se odnosi na natjecateljski
 * lift. Isto pravilo kao PrevBlockLifts: nezavršeni setovi s kilažom su uglavnom
 * trenerove planirane backoff kilaže, ne ono što je lifter stvarno digao.
 *
 * Pisanje štiti RLS na block_projections: upisuje samo admin ili trener liftera.
 */

const supabase = createClient()

type LiftKey = 'squat' | 'bench' | 'deadlift'
const LIFT_KEY: Record<string, LiftKey> = { SQUAT: 'squat', BENCH: 'bench', DEADLIFT: 'deadlift' }

type Projection = { min: number; max: number | null }
type WeekTop = { week: number; top: Top }
type LiftData = { weeks: WeekTop[]; projection: Projection | null }
type Loaded = { totalWeeks: number; lifts: Record<LiftKey, LiftData> }

const fmtKg = (n: number) => String(Math.round(n * 100) / 100)
const fmtProj = (p: Projection) => (p.max == null ? fmtKg(p.min) : `${fmtKg(p.min)}–${fmtKg(p.max)}`)
const half = (n: number) => Math.round(n * 2) / 2
const repsNum = (r: string) => parseFloat(r) || 0

/** "150", "147,5", "145-150", "145 – 150 kg" → projekcija; prazno → null (briše cilj). */
function parseProjection(raw: string): Projection | null | 'invalid' {
  const s = raw.trim().replace(/,/g, '.').replace(/\s+/g, '').replace(/kg$/i, '')
  if (s === '') return null
  const m = /^(\d+(?:\.\d+)?)(?:[-–—](\d+(?:\.\d+)?))?$/.exec(s)
  if (!m) return 'invalid'
  const a = Number(m[1])
  const b = m[2] != null ? Number(m[2]) : null
  if (!a || (b != null && !b)) return 'invalid'
  if (b == null || b === a) return { min: a, max: null }
  return { min: Math.min(a, b), max: Math.max(a, b) }
}

async function loadProjections(athleteId: string, blockId: string): Promise<Loaded> {
  const [projRes, weeksRes, wesRes] = await Promise.all([
    supabase.from('block_projections').select('lift, target_min, target_max').eq('block_id', blockId),
    supabase.from('weeks').select('week_number').eq('block_id', blockId),
    // Pripadnost bloku isključivo relacijom workout → week → block (datumi blokova su nepouzdani)
    supabase.from('workout_exercises')
      .select('id, planned_reps, exercises(category), workouts!inner(athlete_id, weeks!inner(week_number, block_id))')
      .eq('workouts.athlete_id', athleteId)
      .eq('workouts.weeks.block_id', blockId),
  ])
  if (projRes.error) throw projRes.error
  if (weeksRes.error) throw weeksRes.error
  if (wesRes.error) throw wesRes.error

  const lifts: Record<LiftKey, LiftData> = {
    squat:    { weeks: [], projection: null },
    bench:    { weeks: [], projection: null },
    deadlift: { weeks: [], projection: null },
  }
  for (const p of (projRes.data ?? []) as any[]) {
    const k = p.lift as LiftKey
    // numeric kolone stižu kao stringovi
    if (lifts[k]) lifts[k].projection = { min: Number(p.target_min), max: p.target_max != null ? Number(p.target_max) : null }
  }

  const compToKey = new Map<string, LiftKey>(LIFTS.map(l => [l.comp, LIFT_KEY[l.label]]))
  const meta = new Map<string, { key: LiftKey; week: number; plannedReps: string | null }>()
  for (const r of (wesRes.data ?? []) as any[]) {
    const ex = one<any>(r.exercises)
    const wk = one<any>(one<any>(r.workouts)?.weeks)
    const key = ex ? compToKey.get(ex.category) : undefined
    if (!key || !wk) continue
    meta.set(r.id, { key, week: wk.week_number, plannedReps: r.planned_reps })
  }

  if (meta.size > 0) {
    const { data: sets, error } = await supabase.from('set_logs')
      .select('workout_exercise_id, weight_kg, reps, rpe')
      .in('workout_exercise_id', [...meta.keys()])
      .eq('completed', true)
      .not('weight_kg', 'is', null)
      .limit(2000)
    if (error) throw error

    const best = new Map<string, WeekTop & { key: LiftKey }>()
    for (const s of (sets ?? []) as any[]) {
      const m = meta.get(s.workout_exercise_id)
      if (!m) continue
      const kg = Number(s.weight_kg)
      if (!kg) continue
      // dio odrađenih setova nema upisana ponavljanja → uzmi planirana i označi ih
      const logged = s.reps != null && String(s.reps).trim() !== ''
      const reps = logged ? String(s.reps).trim() : (m.plannedReps ?? '')
      const rpe = s.rpe != null && s.rpe !== '' ? Number(s.rpe) : null
      const top: Top = { kg, reps, fromPlan: !logged && !!reps, rpe, e1rm: null }
      const id = `${m.key}:${m.week}`
      const cur = best.get(id)
      if (!cur || kg > cur.top.kg || (kg === cur.top.kg && repsNum(reps) > repsNum(cur.top.reps))) {
        best.set(id, { key: m.key, week: m.week, top })
      }
    }
    for (const wt of best.values()) lifts[wt.key].weeks.push({ week: wt.week, top: wt.top })
    for (const k of Object.keys(lifts) as LiftKey[]) lifts[k].weeks.sort((a, b) => a.week - b.week)
  }

  const weekNums = (weeksRes.data ?? []).map((w: any) => Number(w.week_number)).filter(Boolean)
  return { totalWeeks: weekNums.length ? Math.max(...weekNums) : 0, lifts }
}

// ── stilovi ───────────────────────────────────────────────────────
const eyebrow: CSSProperties = { fontSize: '0.5rem', letterSpacing: '0.22em', color: '#777', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }
const bigNum: CSSProperties = { fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '1.15rem', color: '#f0f0f0', lineHeight: 1.1, marginTop: '4px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div style={{ background: 'var(--t-s1)', padding: '10px 12px', minWidth: 0 }}>
      <div style={eyebrow}>{label}</div>
      <div style={{ ...bigNum, color: tone ?? bigNum.color }}>{value}</div>
    </div>
  )
}

function SetText({ t }: { t: Top }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9rem', color: '#f0f0f0' }}>{fmtKg(t.kg)}</span>
      {t.reps && <span style={{ fontSize: '0.64rem', color: t.fromPlan ? '#666' : '#aaa', marginLeft: '3px' }}>×{t.reps}{t.fromPlan ? '*' : ''}</span>}
      {t.rpe != null && <span style={{ fontSize: '0.58rem', color: '#facc15', marginLeft: '5px' }}>@{t.rpe}</span>}
    </span>
  )
}

/** Unos cilja za trenera/admina — sprema na blur (ili Enter), greška se uvijek prikaže. */
function ProjectionInput({ blockId, lift, value, onSaved }: {
  blockId: string; lift: LiftKey; value: Projection | null; onSaved: (p: Projection | null) => void
}) {
  const stored = value ? fmtProj(value) : ''
  const [text, setText] = useState(stored)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [err, setErr] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const commit = async () => {
    const p = parseProjection(text)
    if (p === 'invalid') { setStatus('error'); setErr('Upiši broj (150) ili raspon (145-150)'); return }
    const next = p ? fmtProj(p) : ''
    if (next === stored) { setText(next); setStatus('idle'); setErr(''); return }

    setStatus('saving'); setErr('')
    const { error } = p
      ? await supabase.from('block_projections')
          .upsert({ block_id: blockId, lift, target_min: p.min, target_max: p.max }, { onConflict: 'block_id,lift' })
      : await supabase.from('block_projections').delete().eq('block_id', blockId).eq('lift', lift)
    if (error) { setStatus('error'); setErr('Greška pri spremanju: ' + error.message); return }

    setText(next)
    onSaved(p)
    setStatus('saved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 1400)
  }

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...eyebrow, color: '#4ade80' }}>CILJ ZA KRAJ BLOKA</span>
        <input value={text} onChange={e => { setText(e.target.value); if (status === 'error') setStatus('idle') }}
          onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
          placeholder="npr. 150 ili 145-150" inputMode="decimal" aria-label={`Cilj za ${lift}`}
          style={{ flex: 1, minWidth: 0, background: 'var(--t-s2)', border: `1px solid ${status === 'error' ? '#f87171' : 'var(--t-border)'}`, borderRadius: '8px', padding: '8px 10px', color: '#f0f0f0', fontFamily: 'var(--fm)', fontSize: '0.8rem', outline: 'none' }} />
        <span style={{ fontSize: '0.6rem', color: '#666', flexShrink: 0 }}>kg</span>
        <span style={{ width: '16px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          {status === 'saving' && <Loader2 size={13} color="#888" style={{ animation: 'spin 1s linear infinite' }} />}
          {status === 'saved' && <Check size={14} color="#4ade80" />}
        </span>
      </div>
      {status === 'error' && <div style={{ fontSize: '0.62rem', color: '#f87171', marginTop: '5px' }}>{err}</div>}
    </div>
  )
}

function LiftCard({ label, data, totalWeeks, editor }: {
  label: string; data: LiftData; totalWeeks: number; editor: ReactNode
}) {
  const { weeks, projection: p } = data
  const first = weeks.length ? weeks[0].top.kg : null
  const lastW = weeks.length ? weeks[weeks.length - 1] : null
  const last = lastW ? lastW.top.kg : null

  const remMin = p && last != null ? p.min - last : null
  const remMax = p && p.max != null && last != null ? p.max - last : null
  const reached = remMin != null && remMin <= 0
  const weeksLeft = lastW ? Math.max(0, totalWeeks - lastW.week) : totalWeeks
  const perMin = remMin != null && remMin > 0 && weeksLeft > 0 ? half(remMin / weeksLeft) : null
  const perMax = remMax != null && remMax > 0 && weeksLeft > 0 ? half(remMax / weeksLeft) : null
  const pct = p && first != null && last != null
    ? (p.min > first ? Math.max(0, Math.min(1, (last - first) / (p.min - first))) : 1)
    : 0

  return (
    <section style={{ padding: '14px 18px 16px', borderTop: '1px solid var(--t-border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.66rem', letterSpacing: '0.3em', fontWeight: 800, color: '#f0f0f0' }}>{label}</span>
        <span style={{ fontSize: '0.64rem', color: p ? '#4ade80' : '#666', letterSpacing: '0.06em' }}>
          {p ? <>CILJ <strong style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: '#4ade80' }}>{fmtProj(p)}</strong> kg</> : 'cilj nije upisan'}
        </span>
      </div>

      {p && first != null && (
        <div style={{ height: '4px', background: 'var(--t-s3)', borderRadius: '99px', overflow: 'hidden', marginTop: '10px' }}>
          <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: reached ? '#4ade80' : 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: '99px', transition: 'width 0.4s' }} />
        </div>
      )}

      <div className="bp-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1px', background: 'var(--t-border)', border: '1px solid var(--t-border)', borderRadius: '10px', overflow: 'hidden', marginTop: '12px' }}>
        <Stat label="1. tjedan" value={first != null ? fmtKg(first) : '—'} />
        <Stat label={lastW ? `Zadnje · tj ${lastW.week}` : 'Zadnje'} value={last != null ? fmtKg(last) : '—'} />
        <Stat label="Preostalo" tone={reached ? '#4ade80' : undefined}
          value={reached ? 'dosegnut' : remMin != null ? (remMax != null ? `${fmtKg(remMin)}–${fmtKg(remMax)}` : fmtKg(remMin)) : '—'} />
        <Stat label={weeksLeft > 0 ? `Po tjednu · ${weeksLeft} tj` : 'Po tjednu'}
          value={perMin != null ? (perMax != null ? `≈${fmtKg(perMin)}–${fmtKg(perMax)}` : `≈${fmtKg(perMin)}`) : '—'} />
      </div>

      {weeks.length > 0 ? (
        <div style={{ marginTop: '10px' }}>
          {weeks.map((w, i) => {
            const jump = i > 0 ? w.top.kg - weeks[i - 1].top.kg : null
            return (
              <div key={w.week} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 2px', borderBottom: i < weeks.length - 1 ? '1px solid var(--t-border)' : 'none' }}>
                <span style={{ ...eyebrow, width: '38px', flexShrink: 0 }}>TJ {w.week}</span>
                <span style={{ flex: 1, minWidth: 0 }}><SetText t={w.top} /></span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  color: jump == null ? '#555' : jump > 0 ? '#4ade80' : jump < 0 ? '#f87171' : '#777' }}>
                  {jump == null ? 'start' : jump > 0 ? `+${fmtKg(jump)}` : jump < 0 ? fmtKg(jump) : '='}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: '0.66rem', color: '#666', marginTop: '10px' }}>Još nema odrađenih setova za ovaj lift u bloku.</div>
      )}

      {editor}
    </section>
  )
}

type State = { status: 'loading' } | { status: 'error'; msg: string } | { status: 'done'; data: Loaded }

export function BlockProjectionsModal({ athleteId, blockId, blockName, canEdit, onClose }: {
  athleteId: string; blockId: string; blockName: string; canEdit: boolean; onClose: () => void
}) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    loadProjections(athleteId, blockId)
      .then(data => { if (alive) setState({ status: 'done', data }) })
      .catch(e => { if (alive) setState({ status: 'error', msg: e?.message ?? String(e) }) })
    return () => { alive = false }
  }, [athleteId, blockId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // spremljeni cilj odmah u prikaz — bez ponovnog učitavanja i spinnera
  const setProjection = (key: LiftKey, p: Projection | null) =>
    setState(s => s.status !== 'done' ? s : {
      ...s, data: { ...s.data, lifts: { ...s.data.lifts, [key]: { ...s.data.lifts[key], projection: p } } },
    })

  const data = state.status === 'done' ? state.data : null
  const anyProjection = !!data && Object.values(data.lifts).some(l => l.projection)
  const hasPlanReps = !!data && Object.values(data.lifts).some(l => l.weeks.some(w => w.top.fromPlan))

  // Portal na <body>: isti izgled na stranici treninga i u admin panelu (admin remapira --t-* tokene)
  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.15s ease' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Projekcije kilaža za kraj bloka"
        style={{ width: '100%', maxWidth: '620px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--t-s1)', border: '1px solid var(--t-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)', fontFamily: 'var(--fm)', color: '#e0e0e0' }}>

        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--t-border)', background: 'var(--t-s2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', color: '#888' }}>PROJEKCIJE · KRAJ BLOKA</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', fontWeight: 700, color: '#f0f0f0', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blockName}</div>
          </div>
          <button onClick={onClose} aria-label="Zatvori"
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', paddingBottom: '14px' }}>
          {state.status === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '48px 0', color: '#666' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em' }}>UČITAVANJE…</span>
            </div>
          )}

          {state.status === 'error' && (
            <div style={{ padding: '32px 18px', color: '#f87171', fontSize: '0.75rem' }}>Greška pri učitavanju: {state.msg}</div>
          )}

          {data && (
            <>
              <div style={{ padding: '12px 18px', fontSize: '0.66rem', color: '#888', lineHeight: 1.65 }}>
                {canEdit
                  ? 'Upiši kilažu koju očekuješ da lifter digne na kraju bloka — jedan broj (150) ili raspon (145-150). Lifter to vidi uz svoj napredak po tjednima.'
                  : anyProjection
                    ? 'Trenerov cilj za kraj bloka i tvoj napredak: najteži odrađeni set po tjednu, skok od prošlog tjedna i koliko ti je ostalo.'
                    : 'Trener još nije upisao projekcije za ovaj blok. Napredak po tjednima vidiš i bez njih.'}
              </div>

              {LIFTS.map(l => {
                const key = LIFT_KEY[l.label]
                return (
                  <LiftCard key={key} label={l.label} data={data.lifts[key]} totalWeeks={data.totalWeeks}
                    editor={canEdit
                      ? <ProjectionInput blockId={blockId} lift={key} value={data.lifts[key].projection} onSaved={p => setProjection(key, p)} />
                      : null} />
                )
              })}

              <div style={{ padding: '10px 18px 0', fontSize: '0.6rem', color: '#666', lineHeight: 1.6 }}>
                Tjedna kilaža je najteži odrađeni set natjecateljske varijante (bez varijacija). „Po tjednu" je preostala kilaža
                podijeljena s tjednima koji su ostali do kraja bloka, zaokruženo na 0.5 kg.
                {hasPlanReps && <><br />* ponavljanja nisu upisana — prikazana su planirana</>}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 460px) {
          .bp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
    </div>,
    document.body,
  )
}
