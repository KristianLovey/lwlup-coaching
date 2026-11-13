'use client'
import * as Popover from '@radix-ui/react-popover'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, ChevronDown, Loader2, Trash2 } from 'lucide-react'
import type { MeetAttempt, Competition } from './types'
import { cacheGet, cacheSet, cacheInvalidate, meetKeys } from '@/lib/meetCache'
import { MeetCardPanel } from './meet-card'

const supabase = createClient()

// ─── TYPES ────────────────────────────────────────────────────────
type Lift = 'squat' | 'bench' | 'deadlift'
type AthleteOption = { id: string; full_name: string }
type Competitor    = { id: string; name: string; bw: string; sex: 'male' | 'female'; sq: string; bp: string; dl: string }
type DBCompetitor  = { id: string; competition_id: string; athlete_id: string; name: string; bw_kg: number | null; sex: string; sq_best: number | null; bp_best: number | null; dl_best: number | null }

// ─── GL POINTS ────────────────────────────────────────────────────
function calcGLP(total: number, bw: number, sex: 'male' | 'female'): number {
  if (!total || !bw) return 0
  const P = sex === 'male'
    ? { a: 1199.72839, b: 1025.18162, c: 0.00921 }
    : { a: 610.32796,  b: 1045.59282, c: 0.03048 }
  const denom = P.a - P.b * Math.exp(-P.c * bw)
  return denom > 0 ? Math.round((total * 100 / denom) * 100) / 100 : 0
}
function glpColor(gl: number) {
  return gl >= 115 ? '#ff4444' : gl >= 100 ? '#c0a060' : gl >= 90 ? '#8888ff' : gl >= 80 ? '#44cc88' : gl >= 70 ? '#aaaaaa' : '#6b8cff'
}

const LIFT_META: Record<Lift, { label: string; color: string; short: string }> = {
  squat:    { label: 'Čučanj',        color: '#6b8cff', short: 'SQ' },
  bench:    { label: 'Bench Press',   color: '#f59e0b', short: 'BP' },
  deadlift: { label: 'Mrtvo dizanje', color: '#22c55e', short: 'DL' },
}

// Unos plana, zagrijavanja, rasporeda i rezultata je u meet-card.tsx (MeetCardPanel),
// prema klupskoj Excel tablici; izračuni su u src/lib/meet-card.ts.

// ─── MEET DAY TAB ─────────────────────────────────────────────────
export function MeetDayTab({ userId, isAdmin, showAthleteSelector = false }: { userId: string; isAdmin: boolean; showAthleteSelector?: boolean }) {
  const [attempts, setAttempts]         = useState<MeetAttempt[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedComp, setSelectedComp] = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [showCompPicker, setShowCompPicker] = useState(false)

  // For admin — which athlete to view (dynamic selector)
  const [athleteId, setAthleteId]   = useState(userId)
  const [athletes, setAthletes]     = useState<AthleteOption[]>([])
  const [lifterProfile, setLifterProfile] = useState<{ bw: number | null; sex: 'male' | 'female' }>({ bw: null, sex: 'male' })
  const [lifterFullName, setLifterFullName] = useState('')
  // konkurencija, sažetak i bilješke vide se samo na Meet cardu, ne na Nutritionu
  const [meetTab, setMeetTab] = useState<'card' | 'nutrition'>('card')

  // VS Konkurencija
  const [showVS, setShowVS]         = useState(false)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [compDraft, setCompDraft]   = useState<Competitor>({ id: '', name: '', bw: '', sex: 'male', sq: '', bp: '', dl: '' })
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editDraft, setEditDraft]   = useState<Competitor>({ id: '', name: '', bw: '', sex: 'male', sq: '', bp: '', dl: '' })
  const [lifterBwEdit, setLifterBwEdit] = useState('')
  const [savingBw, setSavingBw]     = useState(false)

  // Raspored dana je sad dio kartice (meet_cards.card). Stara tablica meet_schedule
  // je preseljena i ostaje netaknuta u bazi.

  // Real-time bests from LiftCard local state (updates as user types, before save)
  const [localBests, setLocalBests] = useState<Record<Lift, number | null>>({ squat: null, bench: null, deadlift: null })
  const handleBestChange = useCallback((lift: Lift, best: number | null) => {
    setLocalBests(prev => ({ ...prev, [lift]: best }))
  }, [])

  // Load athlete list (admin only) and lifter profile
  useEffect(() => {
    if (showAthleteSelector) {
      supabase.from('lifters').select('id, full_name').order('full_name')
        .then(({ data }) => setAthletes((data ?? []) as AthleteOption[]))
    }
  }, [showAthleteSelector])

  useEffect(() => {
    supabase.from('lifters').select('body_weight, sex, full_name').eq('id', athleteId).single()
      .then(({ data }) => {
        if (data) {
          setLifterFullName(data.full_name ?? '')
          setLifterProfile({ bw: data.body_weight ?? null, sex: (data.sex ?? 'male') as 'male' | 'female' })
          setLifterBwEdit(data.body_weight?.toString() ?? '')
        }
      })
  }, [athleteId])

  // Load competitors from DB when competition or athlete changes
  useEffect(() => {
    if (!selectedComp) { setCompetitors([]); return }
    supabase.from('meet_competitors')
      .select('*').eq('competition_id', selectedComp).eq('athlete_id', athleteId).order('created_at')
      .then(({ data }) => {
        const rows = (data ?? []) as DBCompetitor[]
        setCompetitors(rows.map(r => ({
          id: r.id, name: r.name,
          bw: r.bw_kg?.toString() ?? '', sex: r.sex as 'male' | 'female',
          sq: r.sq_best?.toString() ?? '', bp: r.bp_best?.toString() ?? '', dl: r.dl_best?.toString() ?? '',
        })))
      })
  }, [selectedComp, athleteId])

  const dbAddCompetitor = async (draft: Competitor) => {
    if (!selectedComp) return
    const { data } = await supabase.from('meet_competitors').insert({
      competition_id: selectedComp, athlete_id: athleteId,
      name: draft.name, bw_kg: parseFloat(draft.bw) || null, sex: draft.sex,
      sq_best: parseFloat(draft.sq) || null, bp_best: parseFloat(draft.bp) || null, dl_best: parseFloat(draft.dl) || null,
    }).select('*').single()
    if (data) {
      const r = data as DBCompetitor
      setCompetitors(prev => [...prev, { id: r.id, name: r.name, bw: r.bw_kg?.toString() ?? '', sex: r.sex as 'male' | 'female', sq: r.sq_best?.toString() ?? '', bp: r.bp_best?.toString() ?? '', dl: r.dl_best?.toString() ?? '' }])
    }
  }

  const dbUpdateCompetitor = async (c: Competitor) => {
    await supabase.from('meet_competitors').update({
      name: c.name, bw_kg: parseFloat(c.bw) || null, sex: c.sex,
      sq_best: parseFloat(c.sq) || null, bp_best: parseFloat(c.bp) || null, dl_best: parseFloat(c.dl) || null,
      updated_at: new Date().toISOString(),
    }).eq('id', c.id)
    setCompetitors(prev => prev.map(x => x.id === c.id ? c : x))
    setEditingId(null)
  }

  const dbDeleteCompetitor = async (id: string) => {
    await supabase.from('meet_competitors').delete().eq('id', id)
    setCompetitors(prev => prev.filter(x => x.id !== id))
  }

  const saveLifterBw = async () => {
    const parsed = parseFloat(lifterBwEdit)
    if (!parsed) return
    setSavingBw(true)
    await supabase.from('lifters').update({ body_weight: parsed }).eq('id', athleteId)
    setLifterProfile(prev => ({ ...prev, bw: parsed }))
    setSavingBw(false)
  }


  useEffect(() => {
    const load = async () => {
      // Serve from cache instantly if available — avoids blank loading screen on tab switch
      const cachedComps = cacheGet<Competition[]>(meetKeys.competitions())
      const cachedAtts  = cacheGet<MeetAttempt[]>(meetKeys.attempts(athleteId))
      if (cachedComps && cachedAtts) {
        setCompetitions(cachedComps)
        setAttempts(cachedAtts)
        const latestId = cachedAtts[0]?.competition_id
        if (latestId) setSelectedComp(latestId)
        else if (cachedComps.length > 0) setSelectedComp(cachedComps[0].id)
        setLoading(false)
        // Refresh in background — update cache silently
        Promise.all([
          supabase.from('competitions').select('id,name,date,location,status').order('date', { ascending: false }),
          supabase.from('meet_attempts').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
        ]).then(([c, a]) => {
          if (c.data) { cacheSet(meetKeys.competitions(), c.data as Competition[], 5 * 60_000); setCompetitions(c.data as Competition[]) }
          if (a.data) { cacheSet(meetKeys.attempts(athleteId), a.data as MeetAttempt[], 30_000); setAttempts(a.data as MeetAttempt[]) }
        })
        return
      }
      setLoading(true)
      const [{ data: comps }, { data: atts }] = await Promise.all([
        supabase.from('competitions').select('id,name,date,location,status').order('date', { ascending: false }),
        supabase.from('meet_attempts').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
      ])
      const compList = (comps ?? []) as Competition[]
      const attList  = (atts ?? []) as MeetAttempt[]
      cacheSet(meetKeys.competitions(), compList, 5 * 60_000)
      cacheSet(meetKeys.attempts(athleteId), attList, 30_000)
      setCompetitions(compList)
      setAttempts(attList)
      const latestCompId = attList[0]?.competition_id
      if (latestCompId) setSelectedComp(latestCompId)
      else if (compList.length > 0) setSelectedComp(compList[0].id)
      setLoading(false)
    }
    load()
  }, [athleteId])

  // Set of competition ids that have saved attempts
  const compsWithData = new Set(attempts.map(a => a.competition_id).filter(Boolean) as string[])

  // Get attempts for selected competition
  const activeAttempts = selectedComp
    ? attempts.filter(a => a.competition_id === selectedComp)
    : []
  const attemptByLift = (lift: Lift) => activeAttempts.find(a => a.lift === lift) ?? null

  const currentComp = selectedComp ? competitions.find(c => c.id === selectedComp) ?? null : null

  // MeetCardPanel sprema sam; ovdje se spremljeni redovi spoje u popis i keš se poništi
  const mergeSaved = useCallback((rows: MeetAttempt[]) => {
    setAttempts(prev => {
      const byId = new Map(prev.map(a => [a.id, a]))
      for (const r of rows) byId.set(r.id, r)
      return [...rows.filter(r => !prev.some(a => a.id === r.id)), ...prev.map(a => byId.get(a.id) ?? a)]
    })
    cacheInvalidate(meetKeys.attempts(athleteId))
  }, [athleteId])

  const removeRow = useCallback((id: string) => {
    setAttempts(prev => prev.filter(a => a.id !== id))
    cacheInvalidate(meetKeys.attempts(athleteId))
  }, [athleteId])

  // Total from good lifts
  const bestByLift: Record<Lift, number | null> = { squat: null, bench: null, deadlift: null }
  for (const lift of ['squat','bench','deadlift'] as Lift[]) {
    const att = attemptByLift(lift)
    if (att) {
      const goods = [
        att.attempt1_good && att.attempt1_actual,
        att.attempt2_good && att.attempt2_actual,
        att.attempt3_good && att.attempt3_actual,
      ].filter(Boolean) as number[]
      bestByLift[lift] = goods.length ? Math.max(...goods) : null
    }
  }
  const LIFT_ORDER: Lift[] = ['squat', 'bench', 'deadlift']
  const hasAnyLocalBest = LIFT_ORDER.some(l => localBests[l] !== null)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px', color: '#555' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>UČITAVANJE...</span>
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* Lifter se bira u sidebaru admina (AthleteOverview remounta ovu komponentu po lifteru),
          pa ovdje više nema vlastitog izbornika. */}

      {/* Competition selector */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '8px' }}>NATJECANJE</div>
        <Popover.Root open={showCompPicker} onOpenChange={setShowCompPicker}>
        <div style={{ position: 'relative' }}>
          <Popover.Trigger asChild>
          <button
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: currentComp ? 'var(--t-s3)' : 'var(--t-s2)', border: `1.5px solid ${currentComp ? 'var(--t-border-hi)' : 'var(--t-border)'}`, borderRadius: 'var(--t-r)', cursor: 'pointer', color: '#e0e0e0', fontFamily: 'var(--fm)', fontSize: '0.88rem', fontWeight: 500, transition: 'all 0.15s', textAlign: 'left' as const }}>
            {/* Dot indicator */}
            {currentComp && compsWithData.has(currentComp.id) && (
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', flexShrink: 0, boxShadow: '0 0 6px #4ade80aa' }} />
            )}
            {currentComp ? (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', color: '#f0f0f5', fontWeight: 600 }}>{currentComp.name}</div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', marginTop: '1px' }}>{currentComp.date}{currentComp.location ? ` · ${currentComp.location}` : ''}</div>
              </div>
            ) : (
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>Odaberi natjecanje...</span>
            )}
            <ChevronDown size={14} color="rgba(255,255,255,0.3)" style={{ transform: showCompPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s', flexShrink: 0 }} />
          </button>
          </Popover.Trigger>

            <Popover.Content className="ui-pop" side="bottom" align="start" sideOffset={6} collisionPadding={12}
              style={{ width: 'var(--radix-popover-trigger-width)', background: 'var(--t-s1)', border: '1px solid var(--t-border)', borderRadius: 'var(--t-r)', boxShadow: '0 16px 48px rgba(0,0,0,0.8)', overflowY: 'auto' }}>
              {competitions.length === 0 && (
                <div style={{ padding: '14px 16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)' }}>Nema natjecanja u sustavu</div>
              )}
              {competitions.map(c => {
                const hasSaved = compsWithData.has(c.id)
                const isActive = c.id === selectedComp
                return (
                  <button key={c.id}
                    onClick={() => { setSelectedComp(c.id); setShowCompPicker(false) }}
                    style={{ width: '100%', padding: '11px 16px', background: isActive ? 'var(--t-s3)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.1s', borderBottom: '1px solid var(--t-border)' }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                    {/* Saved indicator dot */}
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: hasSaved ? '#4ade80' : 'var(--t-border)', flexShrink: 0, boxShadow: hasSaved ? '0 0 6px #4ade8066' : 'none', transition: 'all 0.2s' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#f0f0f5' : 'rgba(255,255,255,0.7)', fontFamily: 'var(--fm)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)', marginTop: '1px' }}>{c.date}{c.location ? ` · ${c.location}` : ''}</div>
                    </div>
                    {isActive && <Check size={12} color="#f0f0f0" />}
                  </button>
                )
              })}
            </Popover.Content>
        </div>
        </Popover.Root>
      </div>

      {/* ── MEET CARD + NUTRITION ─────────────────────────── */}
      {selectedComp && currentComp ? (
        <MeetCardPanel
          key={`${athleteId}-${selectedComp}`}
          athleteId={athleteId}
          athleteName={lifterFullName || athletes.find(a => a.id === athleteId)?.full_name || ''}
          competitionId={selectedComp}
          competitionName={currentComp.name}
          competitionDate={currentComp.date ?? null}
          canEdit={isAdmin}
          attempts={activeAttempts}
          onRowsSaved={mergeSaved}
          onRowDeleted={removeRow}
          onBestChange={handleBestChange}
          onTabChange={setMeetTab}
        />
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontFamily: 'var(--fm)' }}>
          Odaberi natjecanje za prikaz planova
        </div>
      )}

      {/* Summary grid — shown when any lift has a saved good lift (DB) or is locally typed */}
      {selectedComp && meetTab === 'card' && (hasAnyLocalBest || LIFT_ORDER.some(l => bestByLift[l] !== null)) && (
        <div className="meet-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '16px', animation: 'popIn 0.35s ease' }}>
          {LIFT_ORDER.map(lift => {
            const val = localBests[lift] ?? bestByLift[lift]
            return (
              <div key={lift} style={{ padding: '14px 16px', background: val ? `${LIFT_META[lift].color}0a` : 'var(--t-s2)', border: `1.5px solid ${val ? LIFT_META[lift].color + '33' : 'var(--t-border)'}`, borderRadius: 'var(--t-r)', textAlign: 'center' as const, transition: 'all 0.3s' }}>
                <div style={{ fontSize: '0.52rem', color: val ? LIFT_META[lift].color : 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '4px' }}>{LIFT_META[lift].short}</div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: val ? LIFT_META[lift].color : 'rgba(255,255,255,0.15)', lineHeight: 1 }}>{val ?? '—'}</div>
                {val && <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)', marginTop: '3px' }}>kg</div>}
              </div>
            )
          })}
          {(() => {
            const displayTotal = LIFT_ORDER.every(l => (localBests[l] ?? bestByLift[l]) !== null)
              ? LIFT_ORDER.reduce((s, l) => s + ((localBests[l] ?? bestByLift[l]) ?? 0), 0)
              : null
            return (
              <div style={{ padding: '14px 16px', background: displayTotal ? 'var(--t-s3)' : 'var(--t-s2)', border: `1.5px solid ${displayTotal ? 'var(--t-border-hi)' : 'var(--t-border)'}`, borderRadius: 'var(--t-r)', textAlign: 'center' as const, transition: 'all 0.3s' }}>
                <div style={{ fontSize: '0.52rem', color: displayTotal ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '4px' }}>TOTAL</div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: displayTotal ? '#f0f0f5' : 'rgba(255,255,255,0.15)', lineHeight: 1 }}>{displayTotal ?? '—'}</div>
                {displayTotal && <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)', marginTop: '3px' }}>kg</div>}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── VS KONKURENCIJA ─────────────────────────────────── */}
      {selectedComp && meetTab === 'card' && (
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => setShowVS(v => !v)}
            style={{ width: '100%', padding: '12px 18px', background: showVS ? 'var(--t-s3)' : 'var(--t-s2)', border: `1.5px solid ${showVS ? 'var(--t-border-hi)' : 'var(--t-border)'}`, borderRadius: 'var(--t-r)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem' }}>⚔️</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: showVS ? '#f0f0f5' : 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>VS KONKURENCIJA</span>
              {competitors.length > 0 && <span style={{ fontSize: '0.52rem', background: 'var(--t-hi)', color: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: 'var(--t-r)', fontFamily: 'var(--fm)' }}>{competitors.length}</span>}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.55)', transform: showVS ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block', fontSize: '0.8rem' }}>↓</span>
          </button>

          {showVS && (() => {
            const lifterSQ   = localBests.squat ?? 0
            const lifterBP   = localBests.bench ?? 0
            const lifterDL   = localBests.deadlift ?? 0
            const lifterTot  = lifterSQ && lifterBP && lifterDL ? lifterSQ + lifterBP + lifterDL : 0
            const activeBw   = parseFloat(lifterBwEdit) || lifterProfile.bw || 0
            const lifterGLP  = calcGLP(lifterTot, activeBw, lifterProfile.sex)
            const lifterName = athletes.find(a => a.id === athleteId)?.full_name ?? 'Moj lifter'

            const compRows = competitors.map(c => {
              const sq = parseFloat(c.sq) || 0, bp = parseFloat(c.bp) || 0, dl = parseFloat(c.dl) || 0
              const tot = sq && bp && dl ? sq + bp + dl : 0
              const glp = calcGLP(tot, parseFloat(c.bw) || 0, c.sex)
              return { ...c, sq, bp, dl, tot, glp }
            })

            const allRows = [
              { id: '__lifter__', name: lifterName, sq: lifterSQ, bp: lifterBP, dl: lifterDL, tot: lifterTot, glp: lifterGLP, isLifter: true },
              ...compRows.map(r => ({ ...r, isLifter: false })),
            ].sort((a, b) => (b.glp || b.tot) - (a.glp || a.tot))

            return (
              <div style={{ marginTop: '10px', border: '1.5px solid var(--t-border)', borderRadius: 'var(--t-r)', overflow: 'hidden', animation: 'fadeUp 0.25s ease' }}>

                {/* Lifter BW + sex row */}
                <div style={{ padding: '12px 16px', background: 'rgba(107,140,255,0.06)', borderBottom: '1px solid rgba(107,140,255,0.15)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: '0.52rem', letterSpacing: '0.12em', color: '#a5b4fc', fontFamily: 'var(--fm)', fontWeight: 700, flexShrink: 0 }}>LIFTER BW</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '160px' }}>
                    <input type="number" step="0.1" placeholder="kg" value={lifterBwEdit}
                      onChange={e => setLifterBwEdit(e.target.value)}
                      onBlur={saveLifterBw}
                      onKeyDown={e => { if (e.key === 'Enter') { saveLifterBw(); (e.target as HTMLInputElement).blur() } }}
                      style={{ width: '80px', background: 'var(--t-s3)', border: '1px solid rgba(107,140,255,0.3)', borderRadius: 'var(--t-r-sm)', color: '#f0f0f5', padding: '6px 10px', fontSize: '0.85rem', fontFamily: 'var(--fm)', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['male','female'] as const).map(s => (
                        <button key={s} onClick={async () => { setLifterProfile(p => ({ ...p, sex: s })); await supabase.from('lifters').update({ sex: s }).eq('id', athleteId) }}
                          style={{ padding: '5px 9px', borderRadius: 'var(--t-r-sm)', border: `1px solid ${lifterProfile.sex === s ? 'rgba(107,140,255,0.4)' : 'var(--t-border)'}`, background: lifterProfile.sex === s ? 'rgba(107,140,255,0.12)' : 'transparent', color: lifterProfile.sex === s ? '#a5b4fc' : 'rgba(255,255,255,0.35)', fontSize: '0.62rem', fontFamily: 'var(--fm)', cursor: 'pointer', transition: 'all 0.15s' }}>
                          {s === 'male' ? '♂' : '♀'}
                        </button>
                      ))}
                    </div>
                    {savingBw && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', color: '#555' }} />}
                    {activeBw > 0 && lifterTot > 0 && <span style={{ fontSize: '0.7rem', color: glpColor(lifterGLP), fontFamily: 'var(--fd)', fontWeight: 700 }}>GLP {lifterGLP}</span>}
                  </div>
                </div>

                {/* Leaderboard */}
                {allRows.length > 0 && (
                  <div>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 52px 52px 52px 64px 64px', gap: '4px', padding: '8px 14px', background: 'var(--t-s3)', borderBottom: '1px solid var(--t-border)', alignItems: 'center' }}>
                      {['#','IME','SQ','BP','DL','TOTAL','GLP'].map(h => (
                        <span key={h} style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em', fontFamily: 'var(--fm)', fontWeight: 700, textAlign: h === '#' || h === 'IME' ? 'left' as const : 'center' as const }}>{h}</span>
                      ))}
                    </div>
                    {allRows.map((row, idx) => {
                      const gc = row.glp > 0 ? glpColor(row.glp) : 'rgba(255,255,255,0.2)'
                      const isEditing = !row.isLifter && editingId === row.id
                      return (
                        <div key={row.id}>
                          {/* Normal row */}
                          {!isEditing && (
                            <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 52px 52px 52px 60px 56px 32px', gap: '4px', padding: '10px 14px', background: row.isLifter ? 'rgba(107,140,255,0.06)' : idx % 2 === 0 ? 'transparent' : 'var(--t-s2)', borderBottom: '1px solid var(--t-border)', alignItems: 'center', borderLeft: row.isLifter ? '3px solid #6b8cff' : '3px solid transparent' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: idx === 0 ? '#facc15' : 'rgba(255,255,255,0.25)', fontFamily: 'var(--fd)' }}>{idx + 1}</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: row.isLifter ? 700 : 500, color: row.isLifter ? '#a5b4fc' : '#e0e0e0', fontFamily: 'var(--fm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{row.name}</span>
                              {(['sq','bp','dl'] as const).map(k => (
                                <span key={k} style={{ fontSize: '0.78rem', fontWeight: 600, color: row[k] ? LIFT_META[k === 'sq' ? 'squat' : k === 'bp' ? 'bench' : 'deadlift'].color : 'rgba(255,255,255,0.18)', fontFamily: 'var(--fd)', textAlign: 'center' as const }}>{row[k] || '—'}</span>
                              ))}
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: row.tot ? '#f0f0f5' : 'rgba(255,255,255,0.18)', fontFamily: 'var(--fd)', textAlign: 'center' as const }}>{row.tot || '—'}</span>
                              <div style={{ textAlign: 'center' as const }}>
                                {row.glp > 0 ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: gc, fontFamily: 'var(--fd)', background: `${gc}14`, padding: '2px 5px', borderRadius: 'var(--t-r-sm)', border: `1px solid ${gc}28` }}>{row.glp}</span>
                                ) : <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem' }}>—</span>}
                              </div>
                              {/* Edit / delete — admin only */}
                              {!row.isLifter && showAthleteSelector && (
                                <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                  <button onClick={() => { setEditingId(row.id); setEditDraft(competitors.find(c => c.id === row.id)!) }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#facc15'}
                                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'}>
                                    ✏️
                                  </button>
                                  <button onClick={() => dbDeleteCompetitor(row.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)'}>
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                              {!row.isLifter && !showAthleteSelector && <div />}
                            </div>
                          )}
                          {/* Inline edit row */}
                          {isEditing && (
                            <div style={{ padding: '10px 14px', background: 'rgba(250,204,21,0.04)', borderBottom: '1px solid rgba(250,204,21,0.15)', borderLeft: '3px solid #facc15' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '6px', marginBottom: '6px' }}>
                                <input value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} placeholder="Ime" style={{ background: 'var(--t-s3)', border: '1px solid var(--t-border-hi)', borderRadius: 'var(--t-r-sm)', color: '#f0f0f5', padding: '5px 9px', fontSize: '0.8rem', fontFamily: 'var(--fm)', outline: 'none' }} />
                                <input type="number" value={editDraft.bw} onChange={e => setEditDraft(d => ({ ...d, bw: e.target.value }))} placeholder="BW" style={{ background: 'var(--t-s3)', border: '1px solid var(--t-border-hi)', borderRadius: 'var(--t-r-sm)', color: '#f0f0f5', padding: '5px 9px', fontSize: '0.8rem', fontFamily: 'var(--fm)', outline: 'none' }} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                {([['sq','SQ','#6b8cff'],['bp','BP','#f59e0b'],['dl','DL','#22c55e']] as const).map(([k, label, color]) => (
                                  <div key={k}>
                                    <div style={{ fontSize: '0.44rem', color, letterSpacing: '0.1em', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '3px' }}>{label}</div>
                                    <input type="number" step="0.5" value={editDraft[k]} onChange={e => setEditDraft(d => ({ ...d, [k]: e.target.value }))} style={{ width: '100%', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 'var(--t-r-sm)', color: '#e0e0e0', padding: '5px 8px', fontSize: '0.82rem', fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' as const }} />
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {(['male','female'] as const).map(s => (
                                  <button key={s} onClick={() => setEditDraft(d => ({ ...d, sex: s }))}
                                    style={{ padding: '4px 10px', borderRadius: 'var(--t-r-sm)', border: `1px solid ${editDraft.sex === s ? 'rgba(107,140,255,0.4)' : 'var(--t-border)'}`, background: editDraft.sex === s ? 'rgba(107,140,255,0.1)' : 'transparent', color: editDraft.sex === s ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: '0.62rem', fontFamily: 'var(--fm)', cursor: 'pointer' }}>
                                    {s === 'male' ? '♂' : '♀'}
                                  </button>
                                ))}
                                <button onClick={() => dbUpdateCompetitor(editDraft)} style={{ marginLeft: 'auto', padding: '4px 14px', background: '#fff', border: 'none', borderRadius: 'var(--t-r-sm)', color: '#000', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--fm)', cursor: 'pointer' }}>SPREMI</button>
                                <button onClick={() => setEditingId(null)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--t-border-hi)', borderRadius: 'var(--t-r-sm)', color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem', fontFamily: 'var(--fm)', cursor: 'pointer' }}>Odustani</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add competitor form — admin/trainer only */}
                {showAthleteSelector && (
                  <div style={{ padding: '14px 16px', background: 'var(--t-s2)', borderTop: '1px solid var(--t-border)' }}>
                    <div style={{ fontSize: '0.52rem', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '10px' }}>DODAJ NATJECATELJA</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px', marginBottom: '8px' }}>
                      <input placeholder="Ime i prezime" value={compDraft.name} onChange={e => setCompDraft(d => ({ ...d, name: e.target.value }))}
                        style={{ background: 'var(--t-s3)', border: '1px solid var(--t-border)', borderRadius: 'var(--t-r-sm)', color: '#e0e0e0', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' as const }} />
                      <input type="number" placeholder="BW kg" value={compDraft.bw} onChange={e => setCompDraft(d => ({ ...d, bw: e.target.value }))}
                        style={{ background: 'var(--t-s3)', border: '1px solid var(--t-border)', borderRadius: 'var(--t-r-sm)', color: '#e0e0e0', padding: '8px 10px', fontSize: '0.82rem', fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' as const }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                      {(['male','female'] as const).map(s => (
                        <button key={s} onClick={() => setCompDraft(d => ({ ...d, sex: s }))}
                          style={{ padding: '7px', borderRadius: 'var(--t-r-sm)', border: `1px solid ${compDraft.sex === s ? 'rgba(107,140,255,0.4)' : 'var(--t-border)'}`, background: compDraft.sex === s ? 'rgba(107,140,255,0.1)' : 'transparent', color: compDraft.sex === s ? '#8ba8ff' : 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontFamily: 'var(--fm)', cursor: 'pointer', transition: 'all 0.15s' }}>
                          {s === 'male' ? '♂ Muški' : '♀ Ženski'}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                      {([['sq','SQ','#6b8cff'],['bp','BP','#f59e0b'],['dl','DL','#22c55e']] as const).map(([k, label, color]) => (
                        <div key={k}>
                          <div style={{ fontSize: '0.46rem', color, letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '4px' }}>{label} (kg)</div>
                          <input type="number" step="0.5" placeholder="best" value={compDraft[k]} onChange={e => setCompDraft(d => ({ ...d, [k]: e.target.value }))}
                            style={{ width: '100%', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 'var(--t-r-sm)', color: '#e0e0e0', padding: '7px 10px', fontSize: '0.85rem', fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' as const }} />
                        </div>
                      ))}
                    </div>

                    <button onClick={async () => {
                      if (!compDraft.name.trim()) return
                      await dbAddCompetitor(compDraft)
                      setCompDraft({ id: '', name: '', bw: '', sex: 'male', sq: '', bp: '', dl: '' })
                    }} style={{ width: '100%', padding: '9px', background: 'var(--t-s3)', border: '1px solid var(--t-border-hi)', borderRadius: 'var(--t-r-sm)', color: '#f0f0f5', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--fm)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Plus size={13} /> DODAJ
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Lifter notes */}
      {selectedComp && meetTab === 'card' && (
        <div style={{ marginTop: '20px', padding: '16px 20px', background: 'var(--t-s1)', border: '1px solid var(--t-border-hi)', borderRadius: 'var(--t-r)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ height: '1px', width: '16px', background: 'var(--t-border)' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>MOJE BILJEŠKE S NATJECANJA</span>
          </div>
          <textarea
            value={activeAttempts[0]?.lifter_notes ?? ''}
            onChange={async e => {
              const notes = e.target.value
              const first = activeAttempts[0]
              if (first) {
                await supabase.from('meet_attempts').update({ lifter_notes: notes }).eq('id', first.id)
                setAttempts(prev => prev.map(a => a.id === first.id ? { ...a, lifter_notes: notes } : a))
              }
            }}
            placeholder="Kako si se osjećao/la, što je prošlo dobro, što bi promijenio/la..."
            disabled={activeAttempts.length === 0}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '0.84rem', fontFamily: 'var(--fm)', resize: 'vertical', minHeight: '60px', boxSizing: 'border-box' as const, lineHeight: 1.7 }}
          />
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes popIn   { from { opacity:0; transform:scale(0.96) translateY(4px) } to { opacity:1; transform:none } }
        @keyframes dropDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }

        /* ── Meet summary: 2×2 on mobile ── */
        @media (max-width: 520px) {
          .meet-summary-grid { grid-template-columns: repeat(2,1fr) !important; }
        }

        /* ── Meet attempt row: stack on mobile ── */
        @media (max-width: 500px) {
          .meet-attempt-admin {
            grid-template-columns: 1fr 40px !important;
            grid-template-rows: auto auto !important;
            align-items: stretch !important;
          }
          .meet-attempt-admin .meet-minmax {
            grid-column: 1 / 2 !important;
            grid-row: 1 !important;
          }
          .meet-attempt-admin .meet-actual {
            grid-column: 1 / 2 !important;
            grid-row: 2 !important;
          }
          .meet-attempt-admin .meet-toggle {
            grid-column: 2 / 3 !important;
            grid-row: 1 / 3 !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  )
}