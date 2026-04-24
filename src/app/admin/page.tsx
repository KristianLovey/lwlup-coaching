'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check, Search,
  Loader2, Settings,
  FolderOpen, Copy, Bell,
  AlertCircle, ChevronLeft, Eye, Trophy, Send
} from 'lucide-react'
import { CompetitionsManager } from './competitions-manager'
import { AppNav, WeekPanel, EditableField } from '../training/training-components'
import type { Block, Week, Workout, WorkoutExercise, Exercise, BlockSummary } from '../training/types'

const supabase = createClient()

type AthleteNote = {
  id: string
  athlete_id: string
  admin_id: string
  content: string
  created_at: string
}

type AthleteProfile = {
  id: string
  full_name: string
  email?: string
  role: string
  created_at: string
  blocks?: Block[]
  notes?: AthleteNote[]
}


// ── Mini sparkline ────────────────────────────────────────────────
function Sparkline({ data, color = '#6366f1', h = 40 }: { data: number[]; color?: string; h?: number }) {
  if (data.length < 2) return null
  const w = 160
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* last point dot */}
      {(() => { const last = data[data.length - 1]; const x = w; const y = h - ((last - min) / range) * (h - 4) - 2; return <circle cx={x} cy={y} r="3" fill={color} /> })()}
    </svg>
  )
}

// ── Athlete Overview ───────────────────────────────────────────────
function AthleteOverview({ athlete, onBack, onGoTraining }: {
  athlete: AthleteProfile; onBack: () => void; onGoTraining: () => void
}) {
  const initials = athlete.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const [tab, setTab] = useState<'opcenito' | 'detaljno'>('opcenito')
  const [bwLogs, setBwLogs] = useState<any[]>([])
  const [nutLogs, setNutLogs] = useState<any[]>([])
  const [waterLogs, setWaterLogs] = useState<any[]>([])
  const [lastMeets, setLastMeets] = useState<any[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([])
  const [e1rms, setE1rms] = useState<{ sq: number|null; bp: number|null; dl: number|null }>({ sq: null, bp: null, dl: null })
  const [bwOpen, setBwOpen] = useState(true)
  const [calOpen, setCalOpen] = useState(true)
  const [waterOpen, setWaterOpen] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calViewDate, setCalViewDate] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [compOpen, setCompOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
      const [bwRes, nutRes, waterRes, meetRes, woRes] = await Promise.all([
        // BW: lifter logs via WeightTracker → pr_logs (lift='other', notes='Tjelesna težina')
        supabase.from('pr_logs')
          .select('id, date, weight_kg')
          .eq('athlete_id', athlete.id)
          .eq('lift', 'other').eq('notes', 'Tjelesna težina')
          .order('date', { ascending: false }).limit(60),
        supabase.from('nutrition_logs').select('*').eq('user_id', athlete.id).order('date', { ascending: false }).limit(60),
        supabase.from('water_logs').select('*').eq('user_id', athlete.id).order('log_date', { ascending: false }).limit(90),
        supabase.from('meet_attempts').select('*, competition:competitions(name,date)').eq('athlete_id', athlete.id).order('meet_date', { ascending: false }).limit(9),
        supabase.from('workouts')
          .select('id, workout_date, completed, day_name, workout_exercises(id, exercise_order, exercise:exercises(name,category), actual_weight_kg, actual_reps, actual_rpe, actual_note, planned_sets, planned_reps, planned_weight_kg, set_logs(set_number, weight_kg, reps, rpe, completed, is_top_set))')
          .eq('athlete_id', athlete.id)
          .order('workout_date', { ascending: false })
          .limit(60),
      ])
      setBwLogs(bwRes.data ?? [])
      setNutLogs(nutRes.data ?? [])
      setWaterLogs(waterRes.data ?? [])
      setLastMeets(meetRes.data ?? [])
      setWorkoutLogs(woRes.data ?? [])

      // Fetch top sets for e1RM — join workout_exercises → workouts → exercises
      const { data: topSets } = await supabase
        .from('set_logs')
        .select('weight_kg, reps, workout_exercise_id, workout_exercises!inner(exercise:exercises(name,category))')
        .eq('athlete_id', athlete.id)
        .eq('is_top_set', true)
        .order('id', { ascending: false })
        .limit(100)

      if (topSets && topSets.length > 0) {
        // Epley: e1RM = weight * (1 + reps/30)
        const epley = (kg: number, reps: number) => Math.round(kg * (1 + reps / 30))
        const catMap: Record<string, number> = {}
        for (const s of topSets) {
          const cat: string = (s as any).workout_exercises?.exercise?.category ?? ''
          const kg = Number(s.weight_kg)
          const reps = parseInt(String(s.reps)) || 1
          if (!kg || !reps) continue
          const e1 = epley(kg, reps)
          const key = cat === 'Squat' || cat === 'Squat Variation' ? 'sq'
            : cat === 'Bench' || cat === 'Bench Variation' ? 'bp'
            : cat === 'Deadlift' || cat === 'Deadlift Variation' ? 'dl'
            : null
          if (key && (!catMap[key] || e1 > catMap[key])) catMap[key] = e1
        }
        setE1rms({ sq: catMap['sq'] ?? null, bp: catMap['bp'] ?? null, dl: catMap['dl'] ?? null })
      }

      setLoading(false)
  }, [athlete.id])

  useEffect(() => {
    loadAll()

    // Real-time: refresh when any relevant table changes for this athlete
    const ch = supabase.channel(`overview-${athlete.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts',       filter: `athlete_id=eq.${athlete.id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'set_logs',       filter: `athlete_id=eq.${athlete.id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pr_logs',        filter: `athlete_id=eq.${athlete.id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nutrition_logs', filter: `user_id=eq.${athlete.id}` },    loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_logs',     filter: `user_id=eq.${athlete.id}` },    loadAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadAll, athlete.id])

  const FM = 'var(--fm)', FD = 'var(--fd)'
  const row = (label: string, val: React.ReactNode, sub?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: FM }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '0.88rem', color: '#e0e0f0', fontFamily: FM, fontWeight: 700 }}>{val}</span>
        {sub && <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{sub}</div>}
      </div>
    </div>
  )

  const Section = ({ title, open, onToggle, children, accent = '#6366f1' }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode; accent?: string }) => (
    <div style={{ background: '#0d0d18', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: accent, fontFamily: FM, fontWeight: 700 }}>{title}</span>
        <ChevronDown size={14} color={accent} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  )

  // Group meet attempts by competition
  const meetsByComp: Record<string, any[]> = {}
  for (const m of lastMeets) {
    const key = m.competition_id ?? m.meet_date
    if (!meetsByComp[key]) meetsByComp[key] = []
    meetsByComp[key].push(m)
  }

  // ── Today's date string — local timezone ──
  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  const todayBw  = bwLogs.find(l => l.date === todayStr)?.weight_kg ?? '—'
  const todayCal = nutLogs.find(l => l.date === todayStr)?.calories ?? '—'
  const todayWaterMl = waterLogs.filter(l => l.log_date === todayStr).reduce((s, l) => s + Number(l.amount_ml), 0)
  const todayWater = todayWaterMl > 0 ? Math.round(todayWaterMl / 100) / 10 : '—'

  // ── Frekvencija logiranja — tekući tjedan PON→NED ──
  const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const weekDates = (() => {
    const now = new Date()
    const dow = now.getDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() + mondayOffset + i)
      return toLocalDate(d)
    })
  })()
  const orderedLabels = ['PON','UTO','SRI','ČET','PET','SUB','NED']

  const hasBw    = (d: string) => bwLogs.some(l => l.date === d)
  const hasWater = (d: string) => waterLogs.some(l => l.log_date === d)
  const hasCal   = (d: string) => nutLogs.some(l => l.date === d)
  const hasWo    = (d: string) => workoutLogs.some(l => l.workout_date === d)

  const FreqGrid = () => (
    <div style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
      <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', fontFamily: FM, marginBottom: '12px', fontWeight: 700 }}>FREKVENCIJA LOGIRANJA</div>
      {/* Header — days */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
        <div />
        {orderedLabels.map((d, i) => {
          const isToday = weekDates[i] === todayStr
          return (
            <div key={i} style={{ textAlign: 'center', fontSize: '0.46rem', color: isToday ? '#fff' : 'rgba(255,255,255,0.3)', fontFamily: FM, fontWeight: isToday ? 800 : 700, letterSpacing: 0 }}>{d}</div>
          )
        })}
      </div>
      {/* Rows */}
      {[
        { label: 'BW',     check: hasBw,    color: '#a78bfa' },
        { label: 'Voda',   check: hasWater,  color: '#38bdf8' },
        { label: 'Kcal',   check: hasCal,    color: '#f59e0b' },
        { label: 'Trening',check: hasWo,     color: '#4ade80' },
      ].map(row => (
        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '2px', marginBottom: '4px', alignItems: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', fontFamily: FM }}>{row.label}</div>
          {weekDates.map((d: string, i: number) => {
            const ok = row.check(d)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `1.5px solid ${ok ? row.color + '80' : 'rgba(255,255,255,0.1)'}`, background: ok ? row.color + '20' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: ok ? row.color : 'rgba(255,255,255,0.15)' }}>
                  {ok ? '✓' : '✗'}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Back */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: FM, padding: '0 0 16px', marginBottom: '4px' }}>
        <ChevronLeft size={13} /> NATRAG
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.15))', border: '2px solid rgba(99,102,241,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: '#c7d2fe', fontFamily: FM, flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f0f0ff', fontFamily: FD, lineHeight: 1 }}>{athlete.full_name}</div>
          <div style={{ fontSize: '0.55rem', color: athlete.role === 'trener' ? '#fbbf24' : '#4ade80', letterSpacing: '0.2em', marginTop: '4px', fontFamily: FM }}>{(athlete.role ?? 'lifter').toUpperCase()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '3px' }}>
        {([['opcenito','OPĆENITO'],['detaljno','DETALJNO'],['trening','UREĐIVANJE TRENINGA']] as const).map(([id, label]) => (
          <button key={id} onClick={() => id === 'trening' ? onGoTraining() : setTab(id as 'opcenito'|'detaljno')}
            style={{ flex: 1, padding: '8px 6px', background: tab === id ? 'rgba(99,102,241,0.18)' : 'transparent', border: tab === id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent', borderRadius: '7px', cursor: 'pointer', fontSize: '0.55rem', fontFamily: FM, fontWeight: tab === id ? 700 : 400, color: tab === id ? '#a5b4fc' : 'rgba(255,255,255,0.35)', transition: 'all 0.15s', letterSpacing: '0.04em', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.2em', fontFamily: FM }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
        </div>
      ) : tab === 'opcenito' ? (
        <>
          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: 'BW', val: todayBw !== '—' ? `${todayBw}kg` : '—', color: '#a78bfa' },
              { label: 'KALORIJE', val: todayCal !== '—' ? `${todayCal}` : '—', color: '#f59e0b' },
              { label: 'VODA', val: todayWater !== '—' ? `${todayWater}L` : '—', color: '#38bdf8' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.45rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', fontFamily: FM }}>{s.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color, fontFamily: FD }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Frekvencija logiranja */}
          <FreqGrid />

          {/* 1RM kartice */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', fontFamily: FM, marginBottom: '8px' }}>ESTIMATED 1RM (top set)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'SQ', val: e1rms.sq, color: '#a78bfa' },
                { label: 'BP', val: e1rms.bp, color: '#f472b6' },
                { label: 'DL', val: e1rms.dl, color: '#fb923c' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0d0d18', border: `1px solid ${s.val ? s.color + '30' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.45rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', fontFamily: FM }}>{s.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.val ? s.color : 'rgba(255,255,255,0.15)', fontFamily: FD }}>{s.val ?? '—'}</div>
                  {s.val && <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.25)', fontFamily: FM, marginTop: '2px' }}>kg e1RM</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Zadnja natjecanja */}
          <Section title="ZADNJA NATJECANJA" open={compOpen} onToggle={() => setCompOpen(v => !v)} accent="#22c55e">
            {Object.keys(meetsByComp).length === 0 ? (
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontFamily: FM, textAlign: 'center', padding: '12px 0' }}>Nema podataka</div>
            ) : Object.entries(meetsByComp).slice(0, 3).map(([key, attempts]) => {
                const squat = attempts.find((a: any) => a.lift === 'squat')
                const bench = attempts.find((a: any) => a.lift === 'bench')
                const dl = attempts.find((a: any) => a.lift === 'deadlift')
                const compName = attempts[0]?.competition?.name ?? key
                const compDate = attempts[0]?.competition?.date ?? attempts[0]?.meet_date
                const bestSq = squat ? [squat.attempt1_actual, squat.attempt2_actual, squat.attempt3_actual].filter((v: any, i: number) => v && [squat.attempt1_good, squat.attempt2_good, squat.attempt3_good][i]).pop() : null
                const bestBe = bench ? [bench.attempt1_actual, bench.attempt2_actual, bench.attempt3_actual].filter((v: any, i: number) => v && [bench.attempt1_good, bench.attempt2_good, bench.attempt3_good][i]).pop() : null
                const bestDl = dl ? [dl.attempt1_actual, dl.attempt2_actual, dl.attempt3_actual].filter((v: any, i: number) => v && [dl.attempt1_good, dl.attempt2_good, dl.attempt3_good][i]).pop() : null
                const total = (bestSq ?? 0) + (bestBe ?? 0) + (bestDl ?? 0)
                return (
                  <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#86efac', fontFamily: FM, fontWeight: 700, marginBottom: '2px' }}>{compName}</div>
                    <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', fontFamily: FM, marginBottom: '8px' }}>{compDate}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[['SQ', bestSq], ['BP', bestBe], ['DL', bestDl], ['TOTAL', total || null]].map(([label, val]) => (
                        <div key={String(label)} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: '3px', fontFamily: FM }}>{label}</div>
                          <div style={{ fontSize: '0.82rem', color: label === 'TOTAL' ? '#22c55e' : '#e0e0f0', fontFamily: FD, fontWeight: 700 }}>{val ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            }
          </Section>
        </>
      ) : (
        <>
          {/* DETALJNO — calendar + day detail */}
          {(() => {
            const { y, m } = calViewDate
            const firstDay = new Date(y, m, 1)
            const daysInMonth = new Date(y, m + 1, 0).getDate()
            // Monday-first offset
            const startOffset = (firstDay.getDay() + 6) % 7
            const cells = startOffset + daysInMonth

            const woByDate: Record<string, any> = {}
            for (const wo of workoutLogs) woByDate[wo.workout_date] = wo
            const bwByDate: Record<string, any> = {}
            for (const l of bwLogs) bwByDate[l.date] = l
            const calByDate: Record<string, any> = {}
            for (const l of nutLogs) calByDate[l.date] = l
            const waterByDate: Record<string, number> = {}
            for (const l of waterLogs) waterByDate[l.log_date] = (waterByDate[l.log_date] ?? 0) + Number(l.amount_ml)

            const monthNames = ['Siječanj','Veljača','Ožujak','Travanj','Svibanj','Lipanj','Srpanj','Kolovoz','Rujan','Listopad','Studeni','Prosinac']

            const selWo = selectedDay ? woByDate[selectedDay] : null
            const selBw = selectedDay ? bwByDate[selectedDay] : null
            const selCal = selectedDay ? calByDate[selectedDay] : null
            const selWater = selectedDay ? waterByDate[selectedDay] : null

            return (
              <>
                {/* Calendar card */}
                <div style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                  {/* Month nav */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <button onClick={() => setCalViewDate(({ y, m }) => m === 0 ? { y: y-1, m: 11 } : { y, m: m-1 })}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e0e0f0', fontFamily: FM, letterSpacing: '0.1em' }}>
                      {monthNames[m]} {y}
                    </span>
                    <button onClick={() => setCalViewDate(({ y, m }) => m === 11 ? { y: y+1, m: 0 } : { y, m: m+1 })}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                  </div>

                  {/* Day-of-week headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
                    {['P','U','S','Č','P','S','N'].map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: '0.44rem', color: 'rgba(255,255,255,0.2)', fontFamily: FM, fontWeight: 700, padding: '2px 0' }}>{d}</div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
                    {Array.from({ length: Math.ceil(cells / 7) * 7 }, (_, ci) => {
                      const dayNum = ci - startOffset + 1
                      if (dayNum < 1 || dayNum > daysInMonth) return <div key={ci} />
                      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
                      const wo = woByDate[dateStr]
                      const hasBwD = !!bwByDate[dateStr]
                      const hasCalD = !!calByDate[dateStr]
                      const hasWaterD = !!waterByDate[dateStr]
                      const isSelected = selectedDay === dateStr
                      const isToday = dateStr === todayStr
                      const hasWoCompleted = wo?.completed
                      const hasWoPlanned = !!wo && !wo.completed

                      return (
                        <button key={ci} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                          style={{
                            background: isSelected ? 'rgba(99,102,241,0.2)' : 'transparent',
                            border: isSelected ? '1px solid rgba(99,102,241,0.5)' : isToday ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                            borderRadius: '7px', cursor: 'pointer', padding: '4px 2px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                            transition: 'all 0.15s',
                          }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: isToday ? 800 : 500, color: isToday ? '#fff' : 'rgba(255,255,255,0.6)', fontFamily: FM, lineHeight: 1 }}>{dayNum}</span>
                          {/* Dot row */}
                          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', minHeight: '7px' }}>
                            {hasWoCompleted && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />}
                            {hasWoPlanned  && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6366f1', opacity: 0.5, flexShrink: 0 }} />}
                            {hasBwD   && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />}
                            {hasCalD  && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />}
                            {hasWaterD && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8', flexShrink: 0 }} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {[
                      { color: '#4ade80', label: 'Trening' },
                      { color: '#a78bfa', label: 'BW' },
                      { color: '#f59e0b', label: 'Kal' },
                      { color: '#38bdf8', label: 'Voda' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: l.color }} />
                        <span style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.3)', fontFamily: FM }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day detail panel */}
                {selectedDay && (
                  <div style={{ background: '#0d0d18', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '12px', animation: 'fadeUp 0.2s ease' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.55rem', color: '#818cf8', fontFamily: FM, fontWeight: 700, letterSpacing: '0.2em' }}>{selectedDay}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {selBw && <span style={{ fontSize: '0.62rem', color: '#c4b5fd', fontFamily: FM, fontWeight: 700 }}>{selBw.weight_kg}kg</span>}
                        {selCal && <span style={{ fontSize: '0.62rem', color: '#fbbf24', fontFamily: FM, fontWeight: 700 }}>{selCal.calories}kcal</span>}
                        {selWater != null && selWater > 0 && <span style={{ fontSize: '0.62rem', color: '#7dd3fc', fontFamily: FM, fontWeight: 700 }}>{(selWater/1000).toFixed(1)}L</span>}
                      </div>
                    </div>

                    {/* Workout table */}
                    {selWo ? (
                      <>
                        <div style={{ fontSize: '0.46rem', letterSpacing: '0.25em', color: selWo.completed ? '#4ade80' : 'rgba(255,255,255,0.3)', fontFamily: FM, fontWeight: 700, marginBottom: '10px' }}>
                          {selWo.completed ? '✓ ODRAĐENO' : '◦ PLANIRANO'}{selWo.day_name ? ` · ${selWo.day_name}` : ''}
                        </div>

                        {/* Table: VJEŽBA | set1 | set2 | ... */}
                        {(() => {
                          const exercises = (selWo.workout_exercises ?? [])
                            .slice().sort((a: any, b: any) => a.exercise_order - b.exercise_order)

                          // Find max number of logged sets across all exercises
                          const maxSets = exercises.reduce((mx: number, we: any) => {
                            const doneSets = (we.set_logs ?? []).filter((s: any) => s.completed && s.weight_kg)
                            return Math.max(mx, doneSets.length)
                          }, 0)

                          if (maxSets === 0) {
                            // No logged sets — show plan only
                            return exercises.map((we: any) => (
                              <div key={we.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: '0.7rem', color: '#c7d2fe', fontFamily: FM, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{we.exercise?.name ?? '—'}</span>
                                <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', fontFamily: FM, flexShrink: 0 }}>{we.planned_sets}×{we.planned_reps}{we.planned_weight_kg ? ` · ${we.planned_weight_kg}kg` : ''}</span>
                                {we.actual_note && <span title={we.actual_note} style={{ fontSize: '0.8rem', cursor: 'default', flexShrink: 0 }}>💬</span>}
                              </div>
                            ))
                          }

                          return (
                            <div style={{ overflowX: 'auto', marginBottom: '4px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' as const }}>
                                <thead>
                                  <tr>
                                    <th style={{ textAlign: 'left', fontSize: '0.44rem', color: 'rgba(255,255,255,0.25)', fontFamily: FM, fontWeight: 700, letterSpacing: '0.15em', padding: '0 8px 6px 0', whiteSpace: 'nowrap' as const }}>VJEŽBA</th>
                                    {Array.from({ length: maxSets }, (_, i) => (
                                      <th key={i} style={{ textAlign: 'center', fontSize: '0.44rem', color: 'rgba(255,255,255,0.25)', fontFamily: FM, fontWeight: 700, letterSpacing: '0.1em', padding: '0 4px 6px', whiteSpace: 'nowrap' as const }}>SET {i+1}</th>
                                    ))}
                                    <th style={{ width: '20px' }} />
                                  </tr>
                                </thead>
                                <tbody>
                                  {exercises.map((we: any) => {
                                    const allSets: any[] = (we.set_logs ?? []).slice().sort((a: any, b: any) => a.set_number - b.set_number)
                                    const doneSets = allSets.filter((s: any) => s.completed && s.weight_kg)
                                    const topSetNum = allSets.find((s: any) => s.is_top_set)?.set_number
                                    const hasLogged = doneSets.length > 0
                                    return (
                                      <tr key={we.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: '7px 8px 7px 0', verticalAlign: 'middle' as const }}>
                                          <span style={{ fontSize: '0.7rem', color: hasLogged ? '#c7d2fe' : 'rgba(255,255,255,0.35)', fontFamily: FM, fontWeight: 700, whiteSpace: 'nowrap' as const, display: 'block', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{we.exercise?.name ?? '—'}</span>
                                          {!hasLogged && (
                                            <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', fontFamily: FM }}>{we.planned_sets}×{we.planned_reps}{we.planned_weight_kg ? ` · ${we.planned_weight_kg}kg` : ''}</span>
                                          )}
                                        </td>
                                        {Array.from({ length: maxSets }, (_, i) => {
                                          const s = doneSets[i]
                                          const isTop = s && s.set_number === topSetNum
                                          return (
                                            <td key={i} style={{ textAlign: 'center', padding: '7px 4px', verticalAlign: 'middle' as const }}>
                                              {s ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                                  {isTop && <span style={{ fontSize: '0.4rem', color: '#facc15', lineHeight: 1 }}>★</span>}
                                                  <span style={{ fontSize: '0.65rem', color: isTop ? '#facc15' : '#e2e8f0', fontFamily: FM, fontWeight: isTop ? 800 : 600, whiteSpace: 'nowrap' as const }}>{s.weight_kg}×{s.reps}</span>
                                                  {s.rpe && <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)', fontFamily: FM }}>@{s.rpe}</span>}
                                                </div>
                                              ) : (
                                                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.1)', fontFamily: FM }}>—</span>
                                              )}
                                            </td>
                                          )
                                        })}
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' as const, padding: '7px 0' }}>
                                          {we.actual_note && <span title={we.actual_note} style={{ fontSize: '0.85rem', cursor: 'default' }}>💬</span>}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )
                        })()}
                      </>
                    ) : (
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.18)', fontFamily: FM, paddingBottom: '4px' }}>Nema treninga ovaj dan.</div>
                    )}

                    {!selBw && !selCal && !(selWater && selWater > 0) && !selWo && (
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.18)', fontFamily: FM, marginTop: '4px' }}>Nema podataka za ovaj dan.</div>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ── Athlete Detail Panel (training-page style) ─────────────────────
function AthletePanel({
  athlete, exercises, allAthletes, adminId, onBack, onRefresh
}: {
  athlete: AthleteProfile
  exercises: Exercise[]
  allAthletes: AthleteProfile[]
  adminId: string
  onBack: () => void
  onRefresh: () => void
}) {
  const [block, setBlock] = useState<Block | null>(null)
  const [allBlocks, setAllBlocks] = useState<BlockSummary[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingBlock, setLoadingBlock] = useState(false)
  const [showBlockSelector, setShowBlockSelector] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState('')
  const [duplicateName, setDuplicateName] = useState('')
  const [showDupModal, setShowDupModal] = useState(false)
  const blockSelectorRef = useRef<HTMLDivElement>(null)
  const addingWorkout = useRef(false)

  const initials = athlete.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  // Close block selector on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (blockSelectorRef.current && !blockSelectorRef.current.contains(e.target as Node))
        setShowBlockSelector(false)
    }
    if (showBlockSelector) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBlockSelector])

  useEffect(() => { loadData() }, [athlete.id])

  const loadData = async () => {
    setLoadingBlock(true)
    const { data: blocksData } = await supabase.from('blocks')
      .select('id, name, status, start_date, end_date')
      .eq('athlete_id', athlete.id)
      .order('created_at', { ascending: false })
    const summaries = (blocksData ?? []) as BlockSummary[]
    setAllBlocks(summaries)

    const { data: activeBlock } = await supabase
      .from('blocks')
      .select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))')
      .eq('athlete_id', athlete.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeBlock) {
      activeBlock.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      activeBlock.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
      })
      setBlock(activeBlock as Block)
    } else {
      setBlock(null)
    }
    setLoadingBlock(false)
  }

  const switchBlock = async (blockId: string) => {
    setLoadingBlock(true)
    setShowBlockSelector(false)
    const { data } = await supabase
      .from('blocks')
      .select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))')
      .eq('id', blockId).single()
    if (data) {
      data.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      data.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
      })
      setBlock(data as Block)
    }
    setLoadingBlock(false)
  }

  const createBlock = async () => {
    const name = prompt('Naziv novog bloka:')
    if (!name?.trim()) return
    setSaving(true)
    const today = new Date()
    const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    // Deactivate current active block
    if (block) {
      await supabase.from('blocks').update({ status: 'planned' }).eq('id', block.id)
      setAllBlocks(bs => bs.map(b => b.id === block.id ? { ...b, status: 'planned' } : b))
    }
    const { data } = await supabase.from('blocks').insert({
      athlete_id: athlete.id, name: name.trim(),
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    }).select('id, name, status, start_date, end_date').single()
    if (data) {
      setAllBlocks(bs => [data as BlockSummary, ...bs])
      setBlock({ ...data, weeks: [] } as unknown as Block)
    }
    setSaving(false)
  }

  const copyBlock = async () => {
    if (!block) return
    const name = prompt(`Kopiraj blok "${block.name}" pod nazivom:`)
    if (!name?.trim()) return
    setSaving(true)
    const today = new Date()
    const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    const { data: nb } = await supabase.from('blocks').insert({
      athlete_id: athlete.id, name: name.trim(),
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    }).select('id, name, status, start_date, end_date').single()
    if (!nb) { setSaving(false); return }
    for (let wi = 0; wi < (block.weeks?.length ?? 0); wi++) {
      const sw = block.weeks![wi]
      const wStart = new Date(today); wStart.setDate(today.getDate() + wi * 7)
      const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6)
      const { data: nw } = await supabase.from('weeks').insert({
        block_id: nb.id, week_number: sw.week_number,
        start_date: wStart.toISOString().split('T')[0],
        end_date: wEnd.toISOString().split('T')[0], notes: sw.notes,
      }).select('*').single()
      if (!nw) continue
      for (let di = 0; di < (sw.workouts?.length ?? 0); di++) {
        const wo = sw.workouts![di]
        const d = new Date(wStart); d.setDate(wStart.getDate() + di)
        const { data: nwo } = await supabase.from('workouts').insert({
          week_id: nw.id, athlete_id: athlete.id,
          day_name: wo.day_name, workout_date: d.toISOString().split('T')[0],
          completed: false, notes: wo.notes,
        }).select('*').single()
        if (!nwo) continue
        for (const ex of (wo.workout_exercises ?? [])) {
          await supabase.from('workout_exercises').insert({
            workout_id: nwo.id, exercise_id: ex.exercise_id,
            exercise_order: ex.exercise_order,
            planned_sets: ex.planned_sets, planned_reps: ex.planned_reps,
            planned_weight_kg: ex.planned_weight_kg, planned_rpe: ex.planned_rpe,
            planned_rest_seconds: ex.planned_rest_seconds, planned_tempo: ex.planned_tempo,
            target_rpe: ex.target_rpe, coach_note: ex.coach_note,
          })
        }
      }
    }
    setAllBlocks(bs => [nb as BlockSummary, ...bs])
    await switchBlock(nb.id)
    setSaving(false)
  }

  const deleteBlock = async () => {
    if (!block) return
    if (!confirm(`Briši blok "${block.name}"? Ova radnja je nepovratna.`)) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/admin/delete-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ blockId: block.id }),
    })
    const remaining = allBlocks.filter(b => b.id !== block.id)
    setAllBlocks(remaining)
    if (remaining.length > 0) {
      await switchBlock(remaining[0].id)
    } else {
      setBlock(null)
    }
    setSaving(false)
  }

  const duplicateBlockTo = async () => {
    if (!block || !duplicateTarget || !duplicateName) return
    setSaving(true)
    const { data: newBlock } = await supabase.from('blocks').insert({
      athlete_id: duplicateTarget, name: duplicateName,
      start_date: block.start_date, end_date: block.end_date,
      status: 'planned', goal: block.goal
    }).select('*').single()
    if (!newBlock) { setSaving(false); return }
    for (const week of (block.weeks ?? [])) {
      const { data: newWeek } = await supabase.from('weeks').insert({
        block_id: newBlock.id, week_number: week.week_number,
        start_date: week.start_date, end_date: week.end_date
      }).select('*').single()
      if (!newWeek) continue
      for (const workout of (week.workouts ?? [])) {
        const { data: newWorkout } = await supabase.from('workouts').insert({
          week_id: newWeek.id, athlete_id: duplicateTarget,
          day_name: workout.day_name, workout_date: workout.workout_date,
          completed: false, notes: workout.notes
        }).select('*').single()
        if (!newWorkout) continue
        for (const we of (workout.workout_exercises ?? [])) {
          await supabase.from('workout_exercises').insert({
            workout_id: newWorkout.id, exercise_id: we.exercise_id,
            exercise_order: we.exercise_order, planned_sets: we.planned_sets,
            planned_reps: we.planned_reps, planned_weight_kg: we.planned_weight_kg,
            planned_rpe: we.planned_rpe, planned_tempo: we.planned_tempo,
            planned_rest_seconds: we.planned_rest_seconds,
            target_rpe: we.target_rpe, coach_note: we.coach_note,
          })
        }
      }
    }
    setSaving(false)
    setShowDupModal(false)
    alert('Blok uspješno dupliciran!')
    onRefresh()
  }

  // ── CRUD ────────────────────────────────────────────────────────
  const addWeek = async () => {
    if (!block || saving) return
    setSaving(true)
    const ew = block.weeks ?? []; const weekNum = ew.length + 1
    const lastEnd = ew.length > 0 ? new Date(ew[ew.length - 1].end_date) : new Date(block.start_date)
    const startDate = new Date(lastEnd); if (ew.length > 0) startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6)
    const sd = startDate.toISOString().split('T')[0]
    const ed = endDate.toISOString().split('T')[0]
    // Optimistic: show week immediately
    const tmpId = `tmp_${Date.now()}`
    setBlock(b => b ? { ...b, weeks: [...(b.weeks ?? []), { id: tmpId, block_id: block.id, week_number: weekNum, start_date: sd, end_date: ed, notes: null, workouts: [] } as Week] } : b)
    const { data, error } = await supabase.from('weeks').insert({
      block_id: block.id, week_number: weekNum, start_date: sd, end_date: ed
    }).select('*').single()
    if (!error && data) {
      setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === tmpId ? { ...data, workouts: [] } : w) } : b)
    } else {
      setBlock(b => b ? { ...b, weeks: b.weeks?.filter(w => w.id !== tmpId) } : b)
    }
    setSaving(false)
  }

  const deleteWeek = useCallback(async (weekId: string) => {
    await supabase.from('weeks').delete().eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.filter(w => w.id !== weekId) } : b)
  }, [])

  const copyWeek = useCallback(async (weekId: string) => {
    setSaving(true)
    const src = block?.weeks?.find(w => w.id === weekId)
    if (!src || !block) { setSaving(false); return }
    const ew = block.weeks ?? []
    const weekNum = ew.length + 1
    const lastEnd = new Date(ew[ew.length - 1].end_date)
    const startDate = new Date(lastEnd); startDate.setDate(lastEnd.getDate() + 1)
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6)
    const { data: newWeek } = await supabase.from('weeks').insert({
      block_id: block.id, week_number: weekNum,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0], notes: src.notes,
    }).select('*').single()
    if (!newWeek) { setSaving(false); return }

    // Insert all workouts + their exercises in parallel
    const newWorkouts = (await Promise.all(
      (src.workouts ?? []).map(async (wo, i) => {
        const d = new Date(startDate); d.setDate(startDate.getDate() + i)
        const { data: nwo } = await supabase.from('workouts').insert({
          week_id: newWeek.id, athlete_id: athlete.id,
          day_name: wo.day_name, workout_date: d.toISOString().split('T')[0],
          completed: false, notes: wo.notes,
        }).select('*').single()
        if (!nwo) return null
        const exercises = (await Promise.all(
          (wo.workout_exercises ?? []).map(ex =>
            supabase.from('workout_exercises').insert({
              workout_id: nwo.id, exercise_id: ex.exercise_id,
              exercise_order: ex.exercise_order,
              planned_sets: ex.planned_sets, planned_reps: ex.planned_reps,
              planned_weight_kg: ex.planned_weight_kg, planned_rpe: ex.planned_rpe,
              planned_rest_seconds: ex.planned_rest_seconds, planned_tempo: ex.planned_tempo,
              target_rpe: ex.target_rpe, coach_note: ex.coach_note,
            }).select('*, exercise:exercises(*)').single().then(r => r.data)
          )
        )).filter(Boolean) as WorkoutExercise[]
        return { ...nwo, workout_exercises: exercises } as Workout
      })
    )).filter(Boolean) as Workout[]

    setBlock(b => b ? { ...b, weeks: [...(b.weeks ?? []), { ...newWeek, workouts: newWorkouts }] } : b)
    setSaving(false)
  }, [block, athlete.id])

  const updateWeek = useCallback(async (weekId: string, data: Partial<Week>) => {
    await supabase.from('weeks').update(data).eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, ...data } : w) } : b)
  }, [])

  const addWorkout = useCallback(async (weekId: string) => {
    if (addingWorkout.current) return
    addingWorkout.current = true
    setSaving(true)
    const week = block?.weeks?.find(w => w.id === weekId)
    if (!week) { setSaving(false); return }
    const nd = week.workouts?.length ?? 0
    const d = new Date(week.start_date); d.setDate(d.getDate() + nd)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/add-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        weekId, athleteId: athlete.id,
        dayName: `Dan ${nd + 1}`,
        workoutDate: d.toISOString().split('T')[0],
      }),
    })
    const json = await res.json()
    if (json.data) setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, workouts: [...(w.workouts ?? []), { ...json.data, workout_exercises: [] }] } : w) } : b)
    addingWorkout.current = false
    setSaving(false)
  }, [block, athlete.id])

  const updateWorkout = useCallback(async (workoutId: string, data: Partial<Workout>) => {
    // Never save 'completed' from admin panel — that's the lifter's domain
    const { completed: _c, ...forDb } = data as any
    if (Object.keys(forDb).length > 0) await supabase.from('workouts').update(forDb).eq('id', workoutId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, ...forDb } : wo) })) } : b)
  }, [])

  const deleteWorkout = useCallback(async (workoutId: string) => {
    await supabase.from('workouts').delete().eq('id', workoutId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.filter(wo => wo.id !== workoutId) })) } : b)
  }, [])

  const addExercise = useCallback(async (workoutId: string, ex: Exercise) => {
    setSaving(true)
    const workout = block?.weeks?.flatMap(w => w.workouts ?? []).find(w => w.id === workoutId)
    const order = (workout?.workout_exercises?.length ?? 0) + 1
    const { data, error } = await supabase.from('workout_exercises').insert({
      workout_id: workoutId, exercise_id: ex.id, exercise_order: order, planned_sets: 3, planned_reps: '5'
    }).select('*, exercise:exercises(*)').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, workout_exercises: [...(wo.workout_exercises ?? []), data as WorkoutExercise] } : wo) })) } : b)
    setSaving(false)
  }, [block])

  const updateExercise = useCallback(async (weId: string, data: Partial<WorkoutExercise>) => {
    const RUNTIME_ONLY = ['_completedSets', '_totalSets']
    const forDb = Object.fromEntries(Object.entries(data).filter(([k]) => !RUNTIME_ONLY.includes(k)))
    if (Object.keys(forDb).length > 0) {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/admin/update-exercise', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ weId, data: forDb }),
      })
    }
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.map(we => we.id === weId ? { ...we, ...data } : we) })) })) } : b)
  }, [])

  const deleteExercise = useCallback(async (weId: string) => {
    await supabase.from('workout_exercises').delete().eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.filter(we => we.id !== weId) })) })) } : b)
  }, [])

  const { totalWorkouts, completedWorkouts, totalSets, doneSets, pct } = useMemo(() => {
    const allWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []) ?? []
    const totalWorkouts = allWorkouts.length
    const completedWorkouts = allWorkouts.filter(w => w.completed).length
    const allExercises = allWorkouts.flatMap(wo => wo.workout_exercises ?? [])
    const totalSets = allExercises.reduce((s, e) => s + (e.planned_sets ?? 0), 0)
    const doneSets = 0
    const pct = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0
    return { totalWorkouts, completedWorkouts, totalSets, doneSets, pct }
  }, [block])

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '8px 16px', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', borderRadius: '8px', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
          <ChevronLeft size={13} /> NAZAD
        </button>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.1))', border: '1.5px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#c7d2fe', fontFamily: 'var(--fm)', flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f0f0ff', fontFamily: 'var(--fd)', lineHeight: 1, letterSpacing: '-0.02em' }}>{athlete.full_name}</div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginTop: '4px' }}>
            {athlete.email} · <span style={{ color: athlete.role === 'admin' ? '#ef4444' : athlete.role === 'trener' ? '#fbbf24' : '#4ade80' }}>{(athlete.role ?? 'lifter').toUpperCase()}</span>
          </div>
        </div>
        {/* Stats */}
        {block && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
            {[
              { val: allBlocks.length, label: 'BLOKOVA' },
              { val: totalWorkouts, label: 'TRENINGA' },
              { val: `${pct}%`, label: 'NAPREDAK' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '10px 18px', background: '#08080e', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 800, color: '#f0f0ff', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Block bar (identical to training page) ── */}
      <div style={{ position: 'relative', marginBottom: '24px' }} ref={blockSelectorRef}>
        <div className="block-bar-inner" style={{ display: 'flex', alignItems: 'stretch', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>

          {/* Row 1: Block switcher + name edit */}
          <div className="block-bar-top" style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
            {/* Block switcher */}
            <button onClick={() => setShowBlockSelector(!showBlockSelector)}
              className="block-bar-switcher"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: showBlockSelector ? '#111113' : 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', flex: 1, textAlign: 'left', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (!showBlockSelector) e.currentTarget.style.background = '#111113' }}
              onMouseLeave={e => { if (!showBlockSelector) e.currentTarget.style.background = 'transparent' }}>
              <FolderOpen size={14} color="#555" />
              <div>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.35em', color: '#888', marginBottom: '2px', fontFamily: 'var(--fm)' }}>AKTIVNI BLOK</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{block?.name ?? 'Nema bloka'}</div>
              </div>
              <ChevronDown size={12} color="#444" style={{ marginLeft: 'auto', transform: showBlockSelector ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* Block name edit */}
            {block && (
              <div className="block-bar-name" style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: '#888', flexShrink: 0, fontFamily: 'var(--fm)' }}>NAZIV</div>
                <EditableField value={block.name} placeholder="Naziv programa"
                  onSave={async v => {
                    await supabase.from('blocks').update({ name: v }).eq('id', block.id)
                    setBlock(b => b ? { ...b, name: v } : b)
                    setAllBlocks(bs => bs.map(b2 => b2.id === block.id ? { ...b2, name: v } : b2))
                  }} />
              </div>
            )}

            {saving && (
              <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                <Loader2 size={13} color="#555" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>

          {/* Row 2 on mobile / inline on desktop: Actions */}
          <div className="block-bar-actions" style={{ display: 'flex', alignItems: 'stretch' }}>
            <button onClick={createBlock} className="block-action-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 14px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#111113' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
              title="Novi blok">
              <Plus size={13} /><span className="block-btn-label"> NOVI BLOK</span>
            </button>
            {block && <>
              <button onClick={copyBlock} className="block-action-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 14px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#111113' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
                title="Kopiraj blok">
                <Copy size={13} /><span className="block-btn-label"> KOPIRAJ</span>
              </button>
              <button onClick={() => { setDuplicateName(`${block.name} (kopija)`); setDuplicateTarget(''); setShowDupModal(true) }} className="block-action-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 14px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
                onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = '#111113' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
                title="Dupliciraj na...">
                <Copy size={13} /><span className="block-btn-label"> DUPLIKAT</span>
              </button>
              <button onClick={deleteBlock} className="block-action-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 14px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; e.currentTarget.style.background = 'transparent' }}
                title="Briši blok">
                <Trash2 size={13} /><span className="block-btn-label"> BRIŠI</span>
              </button>
            </>}
          </div>
        </div>

        {/* Block dropdown */}
        {showBlockSelector && allBlocks.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: '#09090e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxHeight: '280px', overflowY: 'auto', animation: 'dropDown 0.18s ease' }}>
            {allBlocks.map(b => (
              <button key={b.id} onClick={() => switchBlock(b.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: b.id === block?.id ? '#111113' : 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#111113'}
                onMouseLeave={e => e.currentTarget.style.background = b.id === block?.id ? '#111113' : 'transparent'}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: b.status === 'active' ? '#22c55e' : b.status === 'completed' ? '#60a5fa' : '#333', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{b.name}</div>
                  <div style={{ fontSize: '0.56rem', color: '#444', marginTop: '1px', fontFamily: 'var(--fm)' }}>{b.start_date} — {b.end_date}</div>
                </div>
                {b.id === block?.id && <Check size={12} color="#22c55e" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {loadingBlock ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 0', color: '#444' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>UČITAVANJE...</span>
        </div>
      ) : !block ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '3rem', opacity: 0.1, marginBottom: '12px', color: '#fff' }}>—</div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '24px', fontFamily: 'var(--fm)' }}>NEMA AKTIVNOG BLOKA</div>
          <button onClick={createBlock}
            style={{ padding: '12px 28px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '8px' }}>
            + KREIRAJ PRVI BLOK
          </button>
        </div>
      ) : (
        <>
          {(block.weeks?.length ?? 0) === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '16px', fontFamily: 'var(--fm)' }}>
              BLOK JE PRAZAN — DODAJ TJEDAN
            </div>
          )}
          {block.weeks?.map(week => (
            <WeekPanel
              key={week.id}
              week={week}
              exercises={exercises}
              isAdmin={true}
              userId={athlete.id}
              onDeleteWeek={deleteWeek}
              onCopyWeek={copyWeek}
              onUpdateWeek={updateWeek}
              onAddWorkout={addWorkout}
              onUpdateWorkout={updateWorkout}
              onDeleteWorkout={deleteWorkout}
              onAddExercise={addExercise}
              onUpdateExercise={updateExercise}
              onDeleteExercise={deleteExercise}
            />
          ))}
          <button onClick={addWeek}
            style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px dashed rgba(99,102,241,0.25)', color: 'rgba(165,180,252,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.68rem', letterSpacing: '0.3em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s', borderRadius: '8px' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'; e.currentTarget.style.color = '#a5b4fc' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.color = 'rgba(165,180,252,0.5)' }}>
            <Plus size={13} /> DODAJ TJEDAN {(block.weeks?.length ?? 0) + 1}
          </button>
        </>
      )}

      {/* Duplicate to another athlete modal */}
      {showDupModal && block && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={() => setShowDupModal(false)}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#0d0d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '28px', animation: 'slideUp 0.25s ease' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', marginBottom: '6px', fontFamily: 'var(--fm)' }}>DUPLICIRAJ BLOK</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)', marginBottom: '24px' }}>{block.name}</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>NAZIV KOPIJE</div>
              <input value={duplicateName} onChange={e => setDuplicateName(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', fontSize: '0.88rem', outline: 'none', fontFamily: 'var(--fm)', borderRadius: '8px', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>KOPIRAJ NA KORISNIKA</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {allAthletes.filter(a => a.id !== athlete.id).map(a => (
                  <button key={a.id} onClick={() => setDuplicateTarget(a.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: duplicateTarget === a.id ? 'rgba(99,102,241,0.1)' : 'transparent', border: `1px solid ${duplicateTarget === a.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {a.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600, fontFamily: 'var(--fm)' }}>{a.full_name}</div>
                      <div style={{ fontSize: '0.54rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{a.role}</div>
                    </div>
                    {duplicateTarget === a.id && <Check size={12} color="#818cf8" />}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowDupModal(false)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.68rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', borderRadius: '8px' }}>
                ODUSTANI
              </button>
              <button onClick={duplicateBlockTo} disabled={!duplicateTarget || !duplicateName || saving}
                style={{ flex: 1, padding: '10px', background: duplicateTarget && duplicateName ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${duplicateTarget && duplicateName ? 'rgba(99,102,241,0.5)' : 'transparent'}`, color: duplicateTarget && duplicateName ? '#a5b4fc' : 'rgba(255,255,255,0.2)', cursor: duplicateTarget && duplicateName ? 'pointer' : 'not-allowed', fontSize: '0.68rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '8px', transition: 'all 0.2s' }}>
                {saving ? 'DUPLICIRA...' : 'DUPLICIRAJ'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }
        @keyframes slideUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        .add-btn { display:flex; align-items:center; gap:6px; width:100%; padding:10px 14px; background:transparent; border:1px dashed rgba(99,102,241,0.2); color:rgba(165,180,252,0.5); cursor:pointer; font-size:0.65rem; letter-spacing:0.2em; font-family:var(--fm); font-weight:700; transition:all 0.2s; border-radius:7px; justify-content:center; margin-top:6px; }
        .add-btn:hover { border-color:rgba(99,102,241,0.5); color:#a5b4fc; background:rgba(99,102,241,0.05); }
        .icon-btn-danger { background:transparent; border:none; cursor:pointer; color:rgba(255,255,255,0.2); padding:6px; display:flex; align-items:center; justify-content:center; border-radius:6px; transition:all 0.15s; }
        .icon-btn-danger:hover { color:#ef4444; background:rgba(239,68,68,0.08); }
        .cat-btn { padding:4px 12px; font-size:0.62rem; letter-spacing:0.1em; font-weight:700; cursor:pointer; font-family:var(--fm); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:6px; transition:all 0.15s; }
        .cat-btn-active, .cat-btn:hover { background:rgba(99,102,241,0.15); color:#a5b4fc; border-color:rgba(99,102,241,0.4); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes spin { to { transform:rotate(360deg) } }
        @media (max-width: 640px) {
          .block-bar-inner { flex-direction: column !important; }
          .block-bar-top { border-bottom: 1px solid rgba(255,255,255,0.05); }
          .block-bar-name { min-width: unset !important; }
          .block-bar-actions { border-top: none; }
          .block-action-btn { flex: 1; padding: 10px 8px !important; min-height: 38px; }
          .block-btn-label { display: none; }
        }
      `}</style>
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────
export default function AdminPage() {
  const [adminName, setAdminName] = useState('')
  const [adminId, setAdminId] = useState('')
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [adminView, setAdminView] = useState<'overview' | 'training'>('overview')
  const [searchQ, setSearchQ] = useState('')
  const [managingUsers, setManagingUsers] = useState(false)
  const [dashSection, setDashSection] = useState<'athletes' | 'competitions' | 'obavijesti' | 'treneri' | 'tim'>('athletes')
  const [notifMsg, setNotifMsg] = useState('')
  const [notifSelected, setNotifSelected] = useState<string[]>([])
  const [notifSending, setNotifSending] = useState(false)
  const [coaches, setCoaches] = useState<AthleteProfile[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({}) // lifter_id → coach_id
  const [assignSaving, setAssignSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddLifter, setShowAddLifter] = useState(false)
  const [newLifterEmail, setNewLifterEmail] = useState('')
  const [newLifterName, setNewLifterName] = useState('')
  const [addLifterLoading, setAddLifterLoading] = useState(false)
  const [addLifterError, setAddLifterError] = useState('')
  const [addLifterSuccess, setAddLifterSuccess] = useState('')
  type TeamStats = { squat: string; bench: string; deadlift: string; bw: string; wclass: string; sex: string }
  type TeamEntry = { id: string; name: string; role?: string; source: 'profile' | 'stats' }
  const [teamStats, setTeamStats] = useState<Record<string, TeamStats>>({})
  const [teamSaving, setTeamSaving] = useState<Record<string, boolean>>({})
  const [teamEntries, setTeamEntries] = useState<TeamEntry[]>([])

  // Load + persist navigation state
  useEffect(() => {
    const saved = localStorage.getItem('admin:dashSection')
    if (saved && ['athletes','competitions','obavijesti','treneri','tim'].includes(saved))
      setDashSection(saved as any)
  }, [])
  useEffect(() => { localStorage.setItem('admin:dashSection', dashSection) }, [dashSection])
  useEffect(() => {
    if (selectedAthlete) localStorage.setItem('admin:selectedAthleteId', selectedAthlete.id)
    else localStorage.removeItem('admin:selectedAthleteId')
  }, [selectedAthlete])

  const loadTeamStats = async () => {
    const norm = (s: string | null | undefined) => {
      if (!s) return ''
      return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    }
    const [profilesRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, current_squat_1rm, current_bench_1rm, current_deadlift_1rm, body_weight, weight_class, sex').neq('role', 'admin').order('full_name'),
      supabase.from('athlete_stats').select('*').eq('is_active', true),
    ])
    const profileData = profilesRes.data ?? []
    const statsData   = statsRes.data   ?? []
    const map: Record<string, TeamStats> = {}
    const entries: TeamEntry[] = []
    const matchedStatIds = new Set<string>()

    for (const p of profileData) {
      const pNorm = norm(p.full_name)
      const s = statsData.find((st: any) => {
        const sNorm = norm(st.name)
        return sNorm === pNorm || (pNorm.split(' ').pop() === sNorm.split(' ').pop() && !!pNorm)
      })
      if (s) matchedStatIds.add(s.id)
      map[p.id] = {
        squat:    String(p.current_squat_1rm   ?? ''),
        bench:    String(p.current_bench_1rm    ?? ''),
        deadlift: String(p.current_deadlift_1rm ?? ''),
        bw:       String(p.body_weight          ?? ''),
        wclass:   p.weight_class ?? (s?.category ?? '').replace(/^[MF]-/, '') ?? '',
        sex:      p.sex ?? 'male',
      }
      entries.push({ id: p.id, name: p.full_name ?? '', role: p.role, source: 'profile' })
    }

    for (const s of statsData) {
      if (matchedStatIds.has(s.id)) continue
      const sid = `stats_${s.id}`
      const catParts = (s.category ?? '').split('-')
      const sexFromCat = catParts[0] === 'F' ? 'female' : 'male'
      const wclassFromCat = catParts.slice(1).join('-') || ''
      map[sid] = {
        squat:    String(s.squat    ?? ''),
        bench:    String(s.bench    ?? ''),
        deadlift: String(s.deadlift ?? ''),
        bw:       '',
        wclass:   wclassFromCat,
        sex:      sexFromCat,
      }
      entries.push({ id: sid, name: s.name ?? '', source: 'stats' })
    }

    setTeamStats(map)
    setTeamEntries(entries)
  }

  const saveTeamField = async (id: string, field: keyof TeamStats, val: string) => {
    setTeamSaving(p => ({ ...p, [id]: true }))
    if (id.startsWith('stats_')) {
      const realId = id.replace('stats_', '')
      const current = teamStats[id] ?? { squat: '', bench: '', deadlift: '', bw: '', wclass: '', sex: 'male' }
      if (field === 'sex' || field === 'wclass') {
        const sex    = field === 'sex'    ? val : current.sex
        const wclass = field === 'wclass' ? val : current.wclass
        const category = wclass ? `${sex === 'female' ? 'F' : 'M'}-${wclass}` : ''
        await supabase.from('athlete_stats').update({ category }).eq('id', realId)
      } else if (field === 'bw') {
        // athlete_stats has no body_weight column
      } else {
        await supabase.from('athlete_stats').update({ [field]: val === '' ? null : parseFloat(val) }).eq('id', realId)
      }
    } else {
      const dbField: Record<keyof TeamStats, string> = {
        squat: 'current_squat_1rm', bench: 'current_bench_1rm', deadlift: 'current_deadlift_1rm',
        bw: 'body_weight', wclass: 'weight_class', sex: 'sex',
      }
      const numFields = ['squat', 'bench', 'deadlift', 'bw']
      const value = numFields.includes(field) ? (val === '' ? null : parseFloat(val)) : (val || null)
      await supabase.from('profiles').update({ [dbField[field]]: value }).eq('id', id)
    }
    setTeamSaving(p => ({ ...p, [id]: false }))
  }

  const router = useRouter()

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const handleAddLifter = async () => {
    setAddLifterError('')
    setAddLifterSuccess('')
    if (!newLifterEmail || !newLifterName) { setAddLifterError('Email i ime su obavezni.'); return }
    setAddLifterLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/create-lifter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: newLifterEmail, fullName: newLifterName }),
      })
      const json = await res.json()
      if (!res.ok) { setAddLifterError(json.error ?? 'Greška.'); return }
      setAddLifterSuccess(`${newLifterName} uspješno dodan!`)
      setNewLifterEmail('')
      setNewLifterName('')
      // Refresh athletes
      const { data } = await supabase.from('profiles').select('*, blocks:training_blocks(*), notes:athlete_notes(*)').order('full_name')
      if (data) setAthletes(data)
    } catch (e: any) {
      setAddLifterError(e.message)
    } finally {
      setAddLifterLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setError('Nisi prijavljen/a.')
          setLoading(false)
          return
        }

        setAdminId(user.id)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single()

        // Debug: log what we got
        console.log('Profile data:', profile, 'Profile error:', profileError)

        if (profileError) {
          setError(`Greška čitanja profila: ${profileError.message}. Provjeri RLS policies na tablici profiles.`)
          setLoading(false)
          return
        }

        if (!profile) {
          setError('Profil ne postoji u bazi.')
          setLoading(false)
          return
        }

        if (profile.role !== 'admin') {
          setError(`Pristup odbijen — tvoja rola je "${profile.role}", treba biti "admin".`)
          setLoading(false)
          return
        }

        setAdminName(profile.full_name ?? 'Admin')

        const { data: exData } = await supabase.from('exercises').select('*').order('category').order('name')
        setExercises(exData ?? [])

        await loadAthletes()
      } catch (e: any) {
        setError(`Neočekivana greška: ${e?.message ?? String(e)}`)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadAthletes = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('full_name')

    if (data) {
      const withBlocks = await Promise.all(data.map(async (p) => {
        const { data: blocks } = await supabase.from('blocks').select('id, name, status, start_date, end_date').eq('athlete_id', p.id)
        return { ...p, blocks: blocks ?? [] } as AthleteProfile
      }))
      setAthletes(withBlocks)
      setCoaches(withBlocks.filter(p => p.role === 'trener' || p.role === 'admin'))

      // Restore previously selected athlete after refresh
      const savedId = localStorage.getItem('admin:selectedAthleteId')
      if (savedId) {
        const match = withBlocks.find(a => a.id === savedId)
        if (match) setSelectedAthlete(match)
      }

      // Load existing assignments
      const { data: asgn } = await supabase.from('coach_assignments').select('coach_id, lifter_id')
      const map: Record<string, string> = {}
      for (const a of (asgn ?? [])) map[a.lifter_id] = a.coach_id
      setAssignments(map)
    }
  }

  const assignLifterToCoach = async (lifterId: string, coachId: string | null) => {
    setAssignSaving(true)
    if (!coachId) {
      await supabase.from('coach_assignments').delete().eq('lifter_id', lifterId)
      setAssignments(prev => { const n = { ...prev }; delete n[lifterId]; return n })
    } else {
      await supabase.from('coach_assignments').upsert({ coach_id: coachId, lifter_id: lifterId }, { onConflict: 'lifter_id' })
      setAssignments(prev => ({ ...prev, [lifterId]: coachId }))
    }
    setAssignSaving(false)
  }

  const updateRole = async (athleteId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', athleteId)
    setAthletes(a => {
      const updated = a.map(x => x.id === athleteId ? { ...x, role: newRole } : x)
      setCoaches(updated.filter(p => p.role === 'trener' || p.role === 'admin'))
      return updated
    })
  }

  const deleteUser = async (athleteId: string) => {
    if (!confirm('Jesi li siguran/na? Ovo će obrisati sve podatke korisnika.')) return
    // Note: In production, use admin API or edge function to delete auth user
    await supabase.from('profiles').delete().eq('id', athleteId)
    setAthletes(a => a.filter(x => x.id !== athleteId))
    if (selectedAthlete?.id === athleteId) setSelectedAthlete(null)
  }

  const filteredAthletes = athletes.filter(a =>
    a.full_name?.toLowerCase().includes(searchQ.toLowerCase())
  )

  const totalAthletes = athletes.length
  const activeBlocks = athletes.reduce((s, a) => s + ((a.blocks as Block[])?.filter(b => b.status === 'active').length ?? 0), 0)
  const lifters = athletes // svi korisnici mogu primati obavijesti

  if (loading) return (
    <div style={{ background: '#08080a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: 'var(--fm)' }}>
      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.8rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)' }}>UČITAVANJE ADMIN PANELA...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ background: '#08080a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'var(--fm)', padding: '40px' }}>
      <AlertCircle size={32} color="#ff4444" />
      <div style={{ fontSize: '0.9rem', color: '#ff7070', textAlign: 'center', maxWidth: '520px', lineHeight: 1.7 }}>{error}</div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700 }}>
          POKUŠAJ PONOVO
        </button>
        <Link href="/" style={{ padding: '10px 20px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.2em', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>← POČETNA</Link>
      </div>
      <div style={{ marginTop: '8px', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', maxWidth: '520px' }}>
        Otvori F12 → Console za više detalja o grešci.
      </div>
    </div>
  )

  return (
    <div style={{ background: '#04040a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', position: 'relative' }}>

      {/* ── BACKGROUND ── */}
      {/* Noise */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.35,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px' }} />
      {/* Grid */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 72%)' }} />
      {/* Aurora — top right, red tint (admin feel) */}
      <div style={{ position: 'fixed', top: '-20vh', right: '-15vw', width: '70vw', height: '70vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 60% 40%, rgba(220,38,38,0.1) 0%, rgba(239,68,68,0.05) 40%, transparent 70%)',
        filter: 'blur(70px)', transform: 'rotate(10deg)' }} />
      {/* Aurora — bottom left, indigo */}
      <div style={{ position: 'fixed', bottom: '-20vh', left: '-10vw', width: '65vw', height: '65vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 40% 60%, rgba(79,70,229,0.1) 0%, rgba(99,102,241,0.05) 45%, transparent 70%)',
        filter: 'blur(80px)' }} />
      {/* Top beam */}
      <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, height: '1px', zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.3) 30%, rgba(239,68,68,0.4) 50%, rgba(220,38,38,0.3) 70%, transparent 100%)',
        boxShadow: '0 0 40px 8px rgba(220,38,38,0.08)' }} />
      {/* Vignette */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />
      {/* ipflogo — top left, very faint */}
      <div style={{ position: 'fixed', top: '12vh', left: '-1vw', zIndex: 0, pointerEvents: 'none', opacity: 0.035, filter: 'blur(1px) grayscale(1)' }}>
        <img src="/slike/ipflogo.png" alt="" width="200" height="200" loading="lazy" decoding="async" style={{ width: '200px', height: 'auto' }} />
      </div>

      <AppNav athleteName={adminName} isAdmin={true} onLogout={handleLogout} />

      {/* MAIN */}
      <div style={{ paddingTop: '56px', position: 'relative', zIndex: 1 }}>

        {selectedAthlete ? (
          /* ─── ATHLETE VIEW ─── */
          adminView === 'overview' ? (
            <div style={{ padding: '16px 16px 80px', maxWidth: '640px', margin: '0 auto' }}>
              <AthleteOverview
                athlete={selectedAthlete}
                onBack={() => { setSelectedAthlete(null); setAdminView('overview') }}
                onGoTraining={() => setAdminView('training')}
              />
            </div>
          ) : (
            <div className="admin-outer" style={{ padding: '24px 16px 100px', maxWidth: '1300px', margin: '0 auto' }}>
              <AthletePanel
                athlete={selectedAthlete}
                exercises={exercises}
                allAthletes={athletes}
                adminId={adminId}
                onBack={() => setAdminView('overview')}
                onRefresh={loadAthletes}
              />
            </div>
          )
        ) : (
          /* ─── DASHBOARD ─── */
          <div className="admin-outer" style={{ padding: '48px 60px 100px', maxWidth: '1400px', margin: '0 auto' }}>

            {/* Hero */}
            <div style={{ marginBottom: '48px', animation: 'fadeUp 0.6s ease' }}>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.6em', color: 'rgba(255,255,255,0.2)', marginBottom: '10px' }}>LWL UP · UPRAVLJANJE LIFERIMA</div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,4.5vw,4.5rem)', fontWeight: 800, lineHeight: 0.88, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
                ADMIN<br /><span style={{ color: 'rgba(255,255,255,0.15)' }}>PANEL</span>
              </h1>

              {/* Section switcher */}
              <div className="admin-section-switcher" style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', width: 'fit-content', marginBottom: '32px' }}>
                {([['athletes', 'Lifteri'], ['tim', 'Tim'], ['treneri', 'Treneri'], ['competitions', 'Natjecanja'], ['obavijesti', 'Obavijesti']] as [string,string][]).map(([sec, label]) => (
                  <button key={sec} onClick={() => { setDashSection(sec as any); if (sec === 'tim') loadTeamStats() }}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', background: dashSection === sec ? 'rgba(255,255,255,0.1)' : 'transparent', border: dashSection === sec ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent', borderRadius: '7px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--fm)', fontWeight: dashSection === sec ? 700 : 400, color: dashSection === sec ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', letterSpacing: '0.04em' }}>
                    {sec === 'competitions' && <Trophy size={13} />}
                    {sec === 'obavijesti' && <Bell size={13} />}
                    {label}
                  </button>
                ))}
              </div>

              {/* Summary stats */}
              <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', maxWidth: '450px' }}>
                {[
                  { val: totalAthletes, label: 'LIFERA', color: '#fff' },
                  { val: activeBlocks, label: 'AKT. BLOKOVA', color: '#4ade80' },
                  { val: athletes.reduce((s, a) => s + ((a.blocks as Block[])?.length ?? 0), 0), label: 'UK. BLOKOVA', color: '#fff' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '18px 20px', background: '#08080a', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {dashSection === 'competitions' && <CompetitionsManager />}

            {dashSection === 'obavijesti' && (
              <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: '680px' }}>
                {/* Compose box */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', overflow: 'hidden', marginBottom: '28px' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>NOVA OBAVIJEST</div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
                    <textarea
                      value={notifMsg}
                      onChange={e => setNotifMsg(e.target.value)}
                      placeholder="Upiši poruku za lifere..."
                      style={{ width: '100%', minHeight: '90px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', fontFamily: 'var(--fm)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.6, borderRadius: '6px' }}
                    />

                    {/* Lifter selection */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>PRIMATELJI ({notifSelected.length}/{lifters.length})</div>
                        <button
                          onClick={() => setNotifSelected(notifSelected.length === lifters.length ? [] : lifters.map(a => a.id))}
                          style={{ background: notifSelected.length === lifters.length ? 'rgba(251,191,36,0.12)' : 'transparent', border: `1px solid ${notifSelected.length === lifters.length ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.12)'}`, color: notifSelected.length === lifters.length ? '#fbbf24' : 'rgba(255,255,255,0.4)', padding: '4px 14px', cursor: 'pointer', fontSize: '0.58rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '5px', transition: 'all 0.15s' }}>
                          SVI KORISNICI
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px', maxHeight: '220px', overflowY: 'auto' as const }}>
                        {lifters.map(a => {
                          const sel = notifSelected.includes(a.id)
                          const initials = a.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                          return (
                            <button key={a.id} onClick={() => setNotifSelected(sel ? notifSelected.filter(id => id !== a.id) : [...notifSelected, a.id])}
                              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: sel ? 'rgba(251,191,36,0.06)' : 'transparent', border: `1px solid ${sel ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' as const }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, color: '#fff', flexShrink: 0, fontFamily: 'var(--fm)' }}>{initials}</div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: sel ? '#fff' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--fm)', flex: 1 }}>{a.full_name}</span>
                              <span style={{ fontSize: '0.45rem', letterSpacing: '0.1em', color: a.role === 'admin' ? '#ef4444' : a.role === 'trener' ? '#fbbf24' : 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', fontWeight: 700 }}>{(a.role ?? 'lifter').toUpperCase()}</span>
                              {sel && <Check size={13} color="#fbbf24" />}
                            </button>
                          )
                        })}
                        {lifters.length === 0 && <div style={{ padding: '16px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontFamily: 'var(--fm)' }}>Nema korisnika.</div>}
                      </div>
                    </div>

                    {/* Send button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        disabled={!notifMsg.trim() || notifSelected.length === 0 || notifSending}
                        onClick={async () => {
                          if (!notifMsg.trim() || notifSelected.length === 0) return
                          setNotifSending(true)
                          await supabase.from('notifications').insert(
                            notifSelected.map(rid => ({ recipient_id: rid, sender_id: adminId, message: notifMsg.trim(), read: false }))
                          )
                          setNotifMsg('')
                          setNotifSelected([])
                          setNotifSending(false)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? '#fbbf24' : 'rgba(255,255,255,0.06)', border: 'none', color: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? '#000' : 'rgba(255,255,255,0.2)', cursor: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? 'pointer' : 'not-allowed', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '7px', transition: 'all 0.2s' }}>
                        {notifSending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                        POŠALJI OBAVIJEST {notifSelected.length > 0 && `(${notifSelected.length})`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {dashSection === 'tim' && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <div style={{ fontSize: '0.52rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginBottom: '28px' }}>
                  STATISTIKE TIMA — uredi 1RM svakog liftera
                </div>

                {teamEntries.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', fontFamily: 'var(--fm)' }}>Nema liftera.</div>
                )}

                <div className="admin-tim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {teamEntries.map(a => {
                    const stats = teamStats[a.id] ?? { squat: '', bench: '', deadlift: '', bw: '', wclass: '', sex: 'male' }
                    const saving = teamSaving[a.id]
                    const initials = a.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() || '??'
                    const inp = (field: 'squat'|'bench'|'deadlift'|'bw'|'wclass', accent: string, placeholder: string, label: string) => (
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.44rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginBottom: '5px', fontWeight: 700 }}>{label}</div>
                        <input
                          type={field === 'wclass' ? 'text' : 'number'}
                          value={(stats as any)[field]}
                          onChange={e => setTeamStats(p => ({ ...p, [a.id]: { ...stats, [field]: e.target.value } }))}
                          onBlur={e => saveTeamField(a.id, field, e.target.value)}
                          placeholder={placeholder}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '7px', color: '#f0f0f5', padding: '11px 10px', fontFamily: 'var(--fm)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }}
                          onFocus={e => { e.currentTarget.style.borderColor = accent }}
                          onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                        />
                      </div>
                    )

                    return (
                      <div key={a.id} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px 16px', display: 'flex', flexDirection: 'column' as const, gap: '14px', transition: 'border-color 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.04) 100%)', border: '1.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#fff', flexShrink: 0, fontFamily: 'var(--fm)' }}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0f0f5', fontFamily: 'var(--fm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.name}</div>
                            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', letterSpacing: '0.08em', marginTop: '1px' }}>{a.role?.toUpperCase() ?? 'LIFTER'}</div>
                          </div>
                          {saving && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: '#fbbf24', flexShrink: 0 }} />}
                        </div>

                        {/* Sex + Weight class */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: '0 0 60px' }}>
                            <div style={{ fontSize: '0.44rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginBottom: '5px', fontWeight: 700 }}>SPOL</div>
                            <select value={stats.sex} onChange={e => { setTeamStats(p => ({ ...p, [a.id]: { ...stats, sex: e.target.value } })); saveTeamField(a.id, 'sex', e.target.value) }}
                              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', color: '#f0f0f5', padding: '8px 6px', fontFamily: 'var(--fm)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                              <option value="male">M</option>
                              <option value="female">Ž</option>
                            </select>
                          </div>
                          {inp('wclass', 'rgba(255,255,255,0.3)', '-83', 'KATEGORIJA')}
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                        {/* 1RMs */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {inp('squat',    '#22c55e66', '—', 'S')}
                          {inp('bench',    '#f59e0b66', '—', 'B')}
                          {inp('deadlift', '#ef444466', '—', 'D')}
                        </div>

                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: '16px', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)', letterSpacing: '0.1em' }}>
                  Sprema se automatski pri izlasku iz polja.
                </div>
              </div>
            )}

            {dashSection === 'treneri' && (
              <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: '780px' }}>
                <div style={{ fontSize: '0.52rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginBottom: '20px' }}>
                  UPRAVLJANJE TRENERIMA — dodjeli liftera treneru ili promijeni rolu korisnika u trenera
                </div>

                {/* Coach-lifter assignment */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', marginBottom: '28px' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>DODJELA LIFTERA TRENERU</span>
                    {assignSaving && <span style={{ fontSize: '0.55rem', color: '#fbbf24', fontFamily: 'var(--fm)' }}>Sprema...</span>}
                  </div>
                  {athletes.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', fontFamily: 'var(--fm)' }}>Nema korisnika.</div>
                  ) : athletes.map(lifter => (
                    <div key={lifter.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--fm)' }}>{lifter.full_name}</div>
                      </div>
                      <select
                        value={assignments[lifter.id] ?? ''}
                        onChange={e => assignLifterToCoach(lifter.id, e.target.value || null)}
                        style={{ background: '#0f0f14', border: '1px solid rgba(255,255,255,0.12)', color: assignments[lifter.id] ? '#fff' : 'rgba(255,255,255,0.35)', padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--fm)', borderRadius: '6px', outline: 'none', cursor: 'pointer', minWidth: '180px' }}>
                        <option value="">— Bez trenera —</option>
                        {coaches.map(c => (
                          <option key={c.id} value={c.id}>{c.full_name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {coaches.length === 0 && (
                    <div style={{ padding: '16px 20px', background: 'rgba(251,191,36,0.04)', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.72rem', color: '#fbbf24', fontFamily: 'var(--fm)' }}>
                      Nema trenera — promijeni rolu korisnika u "trener" ispod.
                    </div>
                  )}
                </div>

                {/* Role management for coaches */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>ROLE KORISNIKA</div>
                  {athletes.filter(a => a.role !== 'admin').map(a => (
                    <div key={a.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--fm)' }}>{a.full_name}</div>
                      </div>
                      <select
                        value={a.role}
                        onChange={e => updateRole(a.id, e.target.value)}
                        style={{ background: '#0f0f14', border: `1px solid ${a.role === 'trener' ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.12)'}`, color: a.role === 'trener' ? '#fbbf24' : '#fff', padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--fm)', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}>
                        <option value="lifter">Lifter</option>
                        <option value="trener">Trener</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dashSection === 'athletes' && <>
            {/* Search + manage */}
            <div className="admin-search-row" style={{ display: 'flex', gap: '12px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', maxWidth: '360px' }}>
                <Search size={14} color="rgba(255,255,255,0.3)" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Pretraži lifere..."
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.88rem', width: '100%', fontFamily: 'var(--fm)' }} />
              </div>
              <button onClick={() => setManagingUsers(!managingUsers)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: managingUsers ? 'rgba(239,68,68,0.1)' : 'transparent', border: `1px solid ${managingUsers ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, color: managingUsers ? '#ef4444' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}>
                <Settings size={13} /> {managingUsers ? 'ZATVORI UPRAVLJANJE' : 'UPRAVLJAJ KORISNICIMA'}
              </button>
              <button onClick={() => { setShowAddLifter(true); setAddLifterError(''); setAddLifterSuccess('') }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
                <Plus size={13} /> DODAJ LIFTERA
              </button>
            </div>

            {/* Athlete circles grid */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.2)', marginBottom: '16px', fontFamily: 'var(--fm)' }}>KORISNICI — KLIKNI NA PROFIL ZA UREĐIVANJE</div>
              <div className="admin-athlete-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {filteredAthletes.length === 0 && (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', padding: '40px 0' }}>Nema lifera.</div>
                )}
                {filteredAthletes.map(athlete => {
                  const initials = athlete.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                  const activeBlock = (athlete.blocks as Block[])?.find(b => b.status === 'active')
                  const blockCount = (athlete.blocks as Block[])?.length ?? 0
                  const noteCount = (athlete.notes as any[])?.length ?? 0

                  return (
                    <div key={athlete.id} style={{ position: 'relative', animation: 'fadeUp 0.4s ease', minWidth: 0 }}>
                      {/* Card */}
                      <div
                        onClick={() => { if (!managingUsers) { setSelectedAthlete(athlete); setAdminView('overview') } }}
                        style={{ width: '100%', minWidth: 0, padding: '18px 14px 0', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.09)', borderTop: `2px solid ${athlete.role === 'admin' ? 'rgba(239,68,68,0.55)' : activeBlock ? 'rgba(74,222,128,0.45)' : 'rgba(255,255,255,0.09)'}`, borderRadius: '10px', overflow: 'hidden', cursor: managingUsers ? 'default' : 'pointer', transition: 'all 0.22s', textAlign: 'center', position: 'relative', boxSizing: 'border-box' as const }}
                        onMouseEnter={e => { if (!managingUsers) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                      >
                        {/* Avatar circle */}
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.04) 100%)', border: '1.5px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fm)', margin: '0 auto 10px', position: 'relative' }}>
                          {initials}
                          {(activeBlock || athlete.role === 'admin') && <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '9px', height: '9px', borderRadius: '50%', background: athlete.role === 'admin' ? '#ef4444' : '#4ade80', border: '2px solid #09090e', boxShadow: athlete.role === 'admin' ? '0 0 6px #ef4444' : '0 0 6px #4ade80' }} />}
                        </div>

                        {/* Name */}
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', marginBottom: '3px', lineHeight: 1.25, padding: '0 2px' }}>{athlete.full_name}</div>

                        {/* Active block / role */}
                        <div style={{ fontSize: '0.5rem', color: athlete.role === 'admin' ? '#ef4444' : (activeBlock ? '#4ade80' : 'rgba(255,255,255,0.2)'), letterSpacing: '0.07em', marginBottom: '12px', minHeight: '13px' }}>
                          {athlete.role === 'admin' ? '⚙ ADMINISTRATOR' : (activeBlock ? activeBlock.name : 'Nema ak. bloka')}
                        </div>

                        {/* Micro stats — flush to card edges */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 -14px' }}>
                          <div style={{ padding: '8px 4px', background: 'rgba(6,6,16,0.92)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--fd)' }}>{blockCount}</div>
                            <div style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em', marginTop: '2px' }}>BLOKOVA</div>
                          </div>
                          <div style={{ padding: '8px 4px', background: 'rgba(6,6,16,0.92)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: noteCount > 0 ? '#facc15' : '#fff', fontFamily: 'var(--fd)' }}>{noteCount}</div>
                            <div style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em', marginTop: '2px' }}>BILJEŠKI</div>
                          </div>
                        </div>

                        {/* Manage overlay */}
                        {managingUsers && (
                          <div style={{ marginTop: '10px', display: 'flex', gap: '4px' }}>
                            <select
                              value={athlete.role}
                              onChange={e => { e.stopPropagation(); updateRole(athlete.id, e.target.value) }}
                              style={{ flex: 1, background: '#0d0d10', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '5px 8px', fontSize: '0.6rem', fontFamily: 'var(--fm)', cursor: 'pointer', outline: 'none' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="lifter">lifter</option>
                              <option value="trener">trener</option>
                              <option value="admin">admin</option>
                            </select>
                            <button onClick={e => { e.stopPropagation(); deleteUser(athlete.id) }}
                              style={{ padding: '5px 8px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', color: '#ff7070', cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,60,60,0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,60,60,0.08)'}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}

                        {/* View arrow */}
                        {!managingUsers && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0, transition: 'opacity 0.2s' }} className="view-arrow">
                            <Eye size={12} color="rgba(255,255,255,0.4)" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </>}
          </div>
        )}
      </div>

      {/* Add Lifter Modal */}
      {showAddLifter && (
        <div onClick={() => setShowAddLifter(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0e0e10', border: '1px solid rgba(255,255,255,0.1)', padding: '36px', width: '100%', maxWidth: '420px', animation: 'slideUp 0.25s ease' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '24px', fontFamily: 'var(--fm)', fontWeight: 700 }}>DODAJ NOVOG LIFTERA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>IME I PREZIME</div>
                <input value={newLifterName} onChange={e => setNewLifterName(e.target.value)} placeholder="Ime Prezime"
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.95rem', padding: '8px 0', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>EMAIL</div>
                <input value={newLifterEmail} onChange={e => setNewLifterEmail(e.target.value)} placeholder="email@gmail.com" type="email"
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.95rem', padding: '8px 0', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)' }}>Defaultna lozinka: <span style={{ color: 'rgba(255,255,255,0.5)' }}>LwlupChange123!</span></div>
              {addLifterError && <div style={{ fontSize: '0.75rem', color: '#ef4444', fontFamily: 'var(--fm)' }}>{addLifterError}</div>}
              {addLifterSuccess && <div style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: 'var(--fm)' }}>{addLifterSuccess}</div>}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setShowAddLifter(false)}
                  style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                  ODUSTANI
                </button>
                <button onClick={handleAddLifter} disabled={addLifterLoading}
                  style={{ flex: 1, padding: '12px', background: addLifterLoading ? 'rgba(255,255,255,0.05)' : '#fff', color: addLifterLoading ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', cursor: addLifterLoading ? 'not-allowed' : 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {addLifterLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> DODAVANJE...</> : 'DODAJ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown{ from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideUp  { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeUp   { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin     { to { transform: rotate(360deg) } }
        @keyframes dropDown { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
        @keyframes pingPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(2.2); opacity: 0; }
        }
        div:hover .view-arrow { opacity: 1 !important; }

        /* ── Nav styles (same as training) ── */
        .tnav-pill { display: flex; align-items: center; }
        .nav-menu-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; background: transparent; border: none;
          cursor: pointer; color: #999; font-size: 0.82rem;
          font-family: var(--fm); transition: all 0.15s; text-align: left;
          border-radius: 6px;
        }
        .nav-menu-item:hover { background: rgba(255,255,255,0.07); color: #e0e0e0; }
        .nav-menu-logout { color: rgba(255,80,80,0.7) !important; }
        .nav-menu-logout:hover { background: rgba(255,60,60,0.08) !important; color: #ff6060 !important; }
        .profile-dropdown { width: min(220px, calc(100vw - 32px)) !important; right: 0 !important; }

        /* ── Navbar ── */
        @media (max-width: 640px) { .appnav-status { display: none !important; } }
        @media (max-width: 520px) { .appnav-name { display: none !important; } }

        /* ── Main outer padding ── */
        .admin-outer { padding: 32px 24px 100px !important; }
        @media (max-width: 600px) { .admin-outer { padding: 20px 14px 90px !important; } }

        /* ── Dashboard hero title ── */
        @media (max-width: 480px) {
          .admin-outer h1 { font-size: 2.6rem !important; }
        }

        /* ── Section switcher: full width + scrollable ── */
        .admin-section-switcher {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
          width: 100% !important;
          max-width: 100% !important;
          scrollbar-width: none;
        }
        .admin-section-switcher::-webkit-scrollbar { display: none; }
        .admin-section-switcher button { white-space: nowrap; flex-shrink: 0; }

        /* ── Summary stats: 3→1 row on mobile ── */
        .admin-stats-grid { max-width: 100% !important; }
        @media (max-width: 480px) {
          .admin-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .admin-stats-grid > div { padding: 12px 10px !important; }
        }

        /* ── Search row: stack on mobile ── */
        @media (max-width: 520px) {
          .admin-search-row { flex-direction: column !important; align-items: stretch !important; }
          .admin-search-row > div { max-width: 100% !important; }
          .admin-search-row > button { justify-content: center; width: 100%; }
        }

        /* ── Tim athlete cards grid ── */
        @media (max-width: 600px) {
          .admin-tim-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }

        /* ── Athlete cards grid ── */
        @media (max-width: 640px) {
          .admin-athlete-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
            margin: 0 -14px !important;
          }
        }

        /* ── Treneri section ── */
        @media (max-width: 520px) {
          .admin-outer select { min-width: 0 !important; width: 100% !important; }
        }

        /* ══ ATHLETE DETAIL (training-style) ══ */

        /* ── Detail header: stack vertically on mobile ── */
        .admin-detail-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
        @media (max-width: 600px) {
          .admin-detail-header { gap: 12px; }
        }

        /* ── Detail stats pill: full width on mobile ── */
        .admin-detail-stats-pill { margin-left: auto; }
        @media (max-width: 600px) {
          .admin-detail-stats-pill { margin-left: 0; width: 100%; }
          .admin-detail-stats-pill > div { flex: 1; }
        }
        @media (max-width: 380px) {
          .admin-detail-stats-pill > div { padding: 8px 10px !important; }
          .admin-detail-stats-pill > div > div:first-child { font-size: 1.1rem !important; }
        }

        /* ── Block bar: wrap + compact on mobile ── */
        @media (max-width: 600px) {
          .admin-outer [style*="borderRadius: '12px'"] { border-radius: 10px; }
        }
        @media (max-width: 520px) {
          /* Block name edit field: hide on very small */
          .block-bar-name { display: none !important; }
        }
        @media (max-width: 480px) {
          /* Block bar action buttons: smaller text */
          .admin-outer button[style*="0 14px"] { padding: 0 10px !important; font-size: 0.55rem !important; }
        }

        /* ── WeekPanel ── */
        .week-header-top { padding: clamp(12px,3vw,20px) clamp(14px,4vw,24px) 0 !important; }
        .week-w-num { font-size: clamp(1.6rem,5vw,3.6rem) !important; }
        @media (max-width: 480px) {
          .day-grid > div { padding: 8px 6px !important; }
        }

        /* ── WorkoutCard ── */
        .workout-card { border-radius: 8px !important; }
        .workout-header-inner { padding: 12px 14px !important; gap: 10px !important; }
        @media (max-width: 480px) {
          .workout-header-inner { padding: 10px 12px !important; }
          .workout-controls { gap: 6px !important; }
          .done-badge { padding: 5px 8px !important; }
          .done-badge span { font-size: 0.46rem !important; letter-spacing: 0.12em !important; }
        }
        @media (max-width: 360px) {
          .done-badge span { display: none !important; }
        }

        /* ── ExerciseRow (admin isAdmin=true layout) ── */
        /* Main row: grip 48px | content 1fr | delete 44px */
        .ex-row-main { min-height: 52px !important; }
        @media (max-width: 480px) {
          .ex-row-main { grid-template-columns: 36px 1fr 36px !important; }
          .ex-row-main > div:first-child { width: 36px !important; }
        }

        /* Inline plan fields below exercise name */
        @media (max-width: 400px) {
          .ex-row-main [style*="paddingLeft: '18px'"] { padding-left: 8px !important; gap: 6px !important; }
        }

        /* ── SetLogSection (admin per-set KG/RPE grid) ── */
        /* COACH_GRID: 48px 1fr 88px */
        @media (max-width: 480px) {
          /* Shrink set label col */
          .ex-row-wrap > div > div[style*="gridTemplateColumns: '48px 1fr 88px'"] {
            grid-template-columns: 36px 1fr 72px !important;
          }
        }

        /* ── Footer add button ── */
        .ex-table-footer { flex-wrap: wrap !important; }
        @media (max-width: 480px) {
          .ex-table-footer { padding: 10px 12px !important; gap: 8px !important; }
          .ex-table-footer .add-btn { width: 100% !important; }
        }

        /* ── Notif section ── */
        @media (max-width: 520px) {
          .admin-outer textarea { font-size: 0.85rem !important; }
        }

        /* ── Add week button ── */
        @media (max-width: 480px) {
          .admin-outer button[style*="DODAJ TJEDAN"] { font-size: 0.6rem !important; padding: 12px !important; }
        }
      `}</style>
    </div>
  )
}