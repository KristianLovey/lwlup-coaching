'use client'
// ── Competitions Manager za Admin Panel ───────────────────────────
// Dodaj ovu komponentu u admin/page.tsx i renderaj je unutar dashboarda
// kao zasebni tab ili sekcija

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Check, Loader2, ChevronDown, Users, Trophy, Calendar, MapPin, X, Edit3 } from 'lucide-react'

const supabase = createClient()

type AthleteStat = {
  id: string
  name: string
  nickname: string | null
  category: string
  img: string | null
}

type CompetitionAthlete = {
  athlete_id: string
  result_squat: number | null
  result_bench: number | null
  result_deadlift: number | null
  result_total: number | null
  result_place: number | null
  result_notes: string | null
}

type Competition = {
  id: string
  name: string
  date: string
  location: string | null
  status: 'announced' | 'ongoing' | 'completed'
  description: string | null
  results_url: string | null
  comp_athletes?: CompetitionAthlete[]
}

export function CompetitionsManager() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [allAthletes, setAllAthletes] = useState<AthleteStat[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingComp, setEditingComp] = useState<Competition | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [expandedComp, setExpandedComp] = useState<string | null>(null)

  const [newComp, setNewComp] = useState({
    name: '', date: '', location: '', status: 'announced' as Competition['status'], description: '', results_url: ''
  })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: comps }, { data: athletes }] = await Promise.all([
      supabase.from('competitions').select('*').order('date', { ascending: true }),
      supabase.from('athlete_stats').select('id, name, nickname, category, img').eq('is_active', true).order('display_order'),
    ])
    setAllAthletes(athletes ?? [])

    // Load comp athletes
    const withAthletes = await Promise.all((comps ?? []).map(async (c) => {
      const { data: ca } = await supabase.from('competition_athletes').select('athlete_id, result_squat, result_bench, result_deadlift, result_total, result_place, result_notes').eq('competition_id', c.id)
      return { ...c, comp_athletes: ca ?? [] }
    }))
    setCompetitions(withAthletes as Competition[])
    setLoading(false)
  }

  const createComp = async () => {
    if (!newComp.name || !newComp.date) return
    setSaving(true)
    const { data } = await supabase.from('competitions').insert({
      name: newComp.name, date: newComp.date,
      location: newComp.location || null,
      status: newComp.status,
      description: newComp.description || null,
      results_url: newComp.results_url || null,
    }).select('*').single()
    if (data) {
      setCompetitions(c => [...c, { ...data, comp_athletes: [] }])
      setNewComp({ name: '', date: '', location: '', status: 'announced', description: '', results_url: '' })
      setShowNewForm(false)
    }
    setSaving(false)
  }

  const updateComp = async (id: string, data: Partial<Competition>) => {
    await supabase.from('competitions').update(data).eq('id', id)
    setCompetitions(c => c.map(x => x.id === id ? { ...x, ...data } : x))
  }

  const deleteComp = async (id: string) => {
    if (!confirm('Obriši natjecanje i sve lifere s njega?')) return
    await supabase.from('competitions').delete().eq('id', id)
    setCompetitions(c => c.filter(x => x.id !== id))
  }

  const toggleAthlete = async (compId: string, athleteId: string) => {
    const comp = competitions.find(c => c.id === compId)
    const isOn = comp?.comp_athletes?.some(ca => ca.athlete_id === athleteId)
    if (isOn) {
      await supabase.from('competition_athletes').delete().eq('competition_id', compId).eq('athlete_id', athleteId)
      setCompetitions(c => c.map(x => x.id === compId ? { ...x, comp_athletes: x.comp_athletes?.filter(ca => ca.athlete_id !== athleteId) } : x))
    } else {
      const { data } = await supabase.from('competition_athletes').insert({ competition_id: compId, athlete_id: athleteId }).select('*').single()
      if (data) setCompetitions(c => c.map(x => x.id === compId ? { ...x, comp_athletes: [...(x.comp_athletes ?? []), data] } : x))
    }
  }

  const updateResult = async (compId: string, athleteId: string, field: string, value: string) => {
    const numVal = value ? Number(value) : null
    await supabase.from('competition_athletes').update({ [field]: numVal }).eq('competition_id', compId).eq('athlete_id', athleteId)
    setCompetitions(c => c.map(x => x.id === compId ? { ...x, comp_athletes: x.comp_athletes?.map(ca => ca.athlete_id === athleteId ? { ...ca, [field]: numVal } : ca) } : x))
  }

  const STATUS_LABELS = { announced: 'NAJAVLJENO', ongoing: 'U TIJEKU', completed: 'ZAVRŠENO' }
  const STATUS_COLORS = { announced: '#facc15', ongoing: '#4ade80', completed: 'rgba(255,255,255,0.3)' }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em' }}>UČITAVANJE...</span>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.2)', marginBottom: '4px' }}>UPRAVLJANJE</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)' }}>NATJECANJA</div>
        </div>
        <button onClick={() => setShowNewForm(!showNewForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: showNewForm ? 'rgba(255,255,255,0.08)' : '#fff', border: 'none', color: showNewForm ? '#fff' : '#000', cursor: 'pointer', fontSize: '0.68rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}>
          {showNewForm ? <X size={13} /> : <Plus size={13} />}
          {showNewForm ? 'ODUSTANI' : 'NOVO NATJECANJE'}
        </button>
      </div>

      {/* New competition form */}
      {showNewForm && (
        <div style={{ marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', padding: '24px', animation: 'fadeUp 0.25s ease' }}>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', marginBottom: '18px', fontFamily: 'var(--fm)' }}>NOVO NATJECANJE</div>
          <div className="comp-new-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {[
              { key: 'name', placeholder: 'Naziv natjecanja', label: 'NAZIV *' },
              { key: 'date', placeholder: '', label: 'DATUM *', type: 'date' },
              { key: 'location', placeholder: 'Zagreb, Hrvatska', label: 'LOKACIJA' },
              { key: 'results_url', placeholder: 'https://...', label: 'LINK REZULTATA' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: '0.52rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', marginBottom: '6px', fontFamily: 'var(--fm)' }}>{f.label}</div>
                <input type={f.type ?? 'text'} value={(newComp as any)[f.key]} onChange={e => setNewComp(x => ({ ...x, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', fontSize: '0.85rem', fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', marginBottom: '6px', fontFamily: 'var(--fm)' }}>STATUS</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['announced','ongoing','completed'] as Competition['status'][]).map(s => (
                <button key={s} onClick={() => setNewComp(x => ({ ...x, status: s }))}
                  style={{ padding: '7px 16px', background: newComp.status === s ? '#fff' : 'transparent', border: `1px solid ${newComp.status === s ? '#fff' : 'rgba(255,255,255,0.1)'}`, color: newComp.status === s ? '#000' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.62rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', marginBottom: '6px', fontFamily: 'var(--fm)' }}>OPIS</div>
            <textarea value={newComp.description} onChange={e => setNewComp(x => ({ ...x, description: e.target.value }))} placeholder="Kratki opis natjecanja..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', fontSize: '0.85rem', fontFamily: 'var(--fm)', outline: 'none', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' }} />
          </div>
          <button onClick={createComp} disabled={!newComp.name || !newComp.date || saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 24px', background: newComp.name && newComp.date ? '#fff' : 'rgba(255,255,255,0.1)', border: 'none', color: newComp.name && newComp.date ? '#000' : 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.68rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}>
            {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
            KREIRAJ NATJECANJE
          </button>
        </div>
      )}

      {/* Competitions list */}
      <style>{`
        @media (max-width: 600px) {
          .comp-header-row { padding: 12px !important; }
          .comp-athletes-grid { grid-template-columns: 1fr !important; }
          .comp-results-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .comp-new-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {competitions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.08)', fontSize: '0.78rem', letterSpacing: '0.2em' }}>
          NEMA NATJECANJA — KREIRAJ PRVO
        </div>
      ) : competitions.map(comp => {
        const isExpanded = expandedComp === comp.id
        const athleteIds = new Set(comp.comp_athletes?.map(ca => ca.athlete_id) ?? [])

        return (
          <div key={comp.id} style={{ border: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px', background: 'rgba(255,255,255,0.02)' }}>
            {/* Status stripe */}
            <div style={{ height: '2px', background: STATUS_COLORS[comp.status], opacity: comp.status === 'completed' ? 0.3 : 0.8 }} />

            {/* Header row */}
            <div className="comp-header-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLORS[comp.status], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{comp.name}</span>
                  <span style={{ fontSize: '0.55rem', color: STATUS_COLORS[comp.status], letterSpacing: '0.2em', fontWeight: 700, flexShrink: 0 }}>{STATUS_LABELS[comp.status]}</span>
                </div>
                <div className="comp-meta-row" style={{ display: 'flex', gap: '12px', paddingLeft: '15px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={11} />{comp.date}</span>
                  {comp.location && <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} />{comp.location}</span>}
                  <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={11} />{athleteIds.size} lifera</span>
                </div>
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {/* Status quick-change */}
                <select value={comp.status} onChange={e => updateComp(comp.id, { status: e.target.value as Competition['status'] })}
                  style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 8px', fontSize: '0.6rem', fontFamily: 'var(--fm)', cursor: 'pointer', outline: 'none', letterSpacing: '0.1em', maxWidth: '100px' }}>
                  <option value="announced">NAJAVLJENO</option>
                  <option value="ongoing">U TIJEKU</option>
                  <option value="completed">ZAVRŠENO</option>
                </select>

                <button onClick={() => setExpandedComp(isExpanded ? null : comp.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 10px', background: isExpanded ? 'rgba(255,255,255,0.07)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  <Users size={11} /> LIFTERI
                  <ChevronDown size={10} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                <button onClick={() => deleteComp(comp.id)}
                  style={{ padding: '7px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', transition: 'color 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Athletes checkboxes + results */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px', animation: 'fadeUp 0.25s ease' }}>
                <div style={{ fontSize: '0.52rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.2)', marginBottom: '14px', fontFamily: 'var(--fm)' }}>
                  ODABERI LIFERE {comp.status === 'completed' && '— UNESI REZULTATE'}
                </div>
                <div className="comp-athletes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                  {allAthletes.map(athlete => {
                    const isSelected = athleteIds.has(athlete.id)
                    const compAthlete = comp.comp_athletes?.find(ca => ca.athlete_id === athlete.id)

                    return (
                      <div key={athlete.id} style={{ border: `1px solid ${isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`, background: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'all 0.2s' }}>
                        {/* Athlete row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', cursor: 'pointer' }} onClick={() => toggleAthlete(comp.id, athlete.id)}>
                          <div style={{ width: '22px', height: '22px', border: `1px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.2)'}`, background: isSelected ? '#fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                            {isSelected && <Check size={13} color="#000" />}
                          </div>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#111' }}>
                            <img src={athlete.img ?? '/slike/placeholder-athlete.jpg'} alt={athlete.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.4)' }}
                              onError={e => { (e.currentTarget as HTMLImageElement).src = '/slike/placeholder-athlete.jpg' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }}>{athlete.name}</div>
                            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{athlete.category}</div>
                          </div>
                        </div>

                        {/* Results inputs (only if selected and comp is completed) */}
                        {isSelected && comp.status === 'completed' && (
                          <div style={{ padding: '0 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                            <div className="comp-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                              {[
                                { key: 'result_squat', label: 'SQ' },
                                { key: 'result_bench', label: 'BP' },
                                { key: 'result_deadlift', label: 'DL' },
                                { key: 'result_total', label: 'TOT' },
                                { key: 'result_place', label: '#' },
                              ].map(f => (
                                <div key={f.key}>
                                  <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '4px', textAlign: 'center' }}>{f.label}</div>
                                  <input
                                    type="number"
                                    defaultValue={(compAthlete as any)?.[f.key] ?? ''}
                                    onBlur={e => updateResult(comp.id, athlete.id, f.key, e.target.value)}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '5px 6px', fontSize: '0.75rem', outline: 'none', fontFamily: 'var(--fm)', textAlign: 'center', boxSizing: 'border-box' }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}