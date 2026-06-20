'use client'
import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Search, Bell, Eye, Check, Send } from 'lucide-react'
import { AppNav } from '../training/training-components'
import { AthleteOverview, AthletePanel, type AthleteProfile } from '../admin/athlete-panels'
import type { Block, Exercise } from '../training/types'
import '../admin/admin-os.css'

const supabase = createClient()

// ── Glass styles ────────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
}
const glassCard: React.CSSProperties = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
}

// ── Main Trainer Page ──────────────────────────────────────────────
export default function TrainerPage() {
  const [trainerName, setTrainerName] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [trainerView, setTrainerView] = useState<'overview' | 'training'>('overview')
  const [searchQ, setSearchQ] = useState('')
  const [dashSection, setDashSection] = useState<'athletes' | 'obavijesti'>('athletes')
  const [notifMsg, setNotifMsg] = useState('')
  const [notifSelected, setNotifSelected] = useState<string[]>([])
  const [notifSending, setNotifSending] = useState(false)

  const router = useRouter()
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const loadAthletes = async (coachId: string) => {
    const { data: assignments } = await supabase
      .from('coach_assignments')
      .select('lifter_id')
      .eq('coach_id', coachId)

    const lifterIds = (assignments ?? []).map((a: any) => a.lifter_id)
    if (lifterIds.length === 0) { setAthletes([]); return }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .in('id', lifterIds)
      .order('full_name')

    if (profilesData) {
      const withBlocks = await Promise.all(profilesData.map(async (p) => {
        const { data: blocks } = await supabase
          .from('blocks')
          .select('id, name, status, start_date, end_date')
          .eq('athlete_id', p.id)
        return { ...p, blocks: blocks ?? [] } as AthleteProfile
      }))
      setAthletes(withBlocks)

      // Restore previously selected athlete after refresh
      const savedId = localStorage.getItem('trainer:selectedAthleteId')
      if (savedId) {
        const match = withBlocks.find(a => a.id === savedId)
        if (match) setSelectedAthlete(match)
      }
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { setError('Nisi prijavljen/a.'); setLoading(false); return }

        setTrainerId(user.id)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          setError('Profil ne postoji u bazi.')
          setLoading(false)
          return
        }

        if (profile.role !== 'trener' && profile.role !== 'admin') {
          setError(`Pristup odbijen — tvoja rola je "${profile.role}".`)
          setLoading(false)
          return
        }

        setTrainerName(profile.full_name ?? 'Trener')

        const { data: exData } = await supabase.from('exercises').select('*').order('category').order('name')
        setExercises(exData ?? [])

        await loadAthletes(user.id)
      } catch (e: any) {
        setError(`Neočekivana greška: ${e?.message ?? String(e)}`)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Persist selected athlete
  useEffect(() => {
    if (selectedAthlete) localStorage.setItem('trainer:selectedAthleteId', selectedAthlete.id)
    else localStorage.removeItem('trainer:selectedAthleteId')
  }, [selectedAthlete])

  const filteredAthletes = athletes.filter(a =>
    a.full_name?.toLowerCase().includes(searchQ.toLowerCase())
  )

  const totalAthletes = athletes.length
  const activeBlocks = athletes.reduce((s, a) => s + ((a.blocks as Block[])?.filter(b => b.status === 'active').length ?? 0), 0)

  if (loading) return (
    <div style={{ background: '#090909', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: 'var(--fm)' }}>
      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.8rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)' }}>UČITAVANJE TRENER PROFILA...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ background: '#090909', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'var(--fm)', padding: '40px' }}>
      <AlertCircle size={32} color="#ff4444" />
      <div style={{ fontSize: '0.9rem', color: '#ff7070', textAlign: 'center', maxWidth: '520px', lineHeight: 1.7 }}>{error}</div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700 }}>
          POKUŠAJ PONOVO
        </button>
        <a href="/" style={{ padding: '10px 20px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.2em', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>← POČETNA</a>
      </div>
    </div>
  )

  return (
    <div className="lwl-admin-os" style={{ background: '#090909', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', position: 'relative' }}>

      {/* ── BACKGROUND ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.35,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 72%)' }} />
      {/* Aurora — subtle white */}
      <div style={{ position: 'fixed', top: '-20vh', right: '-15vw', width: '70vw', height: '70vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 60% 40%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)',
        filter: 'blur(70px)', transform: 'rotate(10deg)' }} />
      <div style={{ position: 'fixed', bottom: '-20vh', left: '-10vw', width: '65vw', height: '65vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 40% 60%, rgba(255,255,255,0.03) 0%, transparent 70%)',
        filter: 'blur(80px)' }} />
      <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, height: '1px', zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(239,53,53,0.25) 30%, rgba(239,53,53,0.35) 50%, rgba(239,53,53,0.25) 70%, transparent 100%)',
        boxShadow: '0 0 40px 8px rgba(239,53,53,0.06)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />

      <AppNav athleteName={trainerName} isAdmin={true} role="trener" onLogout={handleLogout} />

      {/* MAIN */}
      <div style={{ paddingTop: '56px', position: 'relative', zIndex: 1 }}>

        {selectedAthlete ? (
          /* ─── ATHLETE VIEW ─── */
          trainerView === 'overview' ? (
            <div style={{ padding: '16px 32px 80px', maxWidth: '1200px', margin: '0 auto' }}>
              <AthleteOverview
                athlete={selectedAthlete}
                onBack={() => { setSelectedAthlete(null); setTrainerView('overview') }}
                onGoTraining={() => setTrainerView('training')}
              />
            </div>
          ) : (
            <div className="admin-outer" style={{ padding: '24px 16px 100px', maxWidth: '1300px', margin: '0 auto', animation: 'panelSlideIn 0.32s cubic-bezier(0.16,1,0.3,1)' }}>
              <AthletePanel
                athlete={selectedAthlete}
                exercises={exercises}
                allAthletes={athletes}
                onBack={() => setTrainerView('overview')}
                onRefresh={() => loadAthletes(trainerId)}
              />
            </div>
          )
        ) : (
          /* ─── DASHBOARD ─── */
          <div className="admin-outer" style={{ padding: '48px 60px 100px', maxWidth: '1400px', margin: '0 auto' }}>

            {/* Hero */}
            <div style={{ marginBottom: '48px', animation: 'fadeUp 0.6s ease' }}>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.6em', color: 'rgba(255,255,255,0.2)', marginBottom: '10px' }}>LWL UP · UPRAVLJANJE LIFTERIMA</div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,4.5vw,4.5rem)', fontWeight: 800, lineHeight: 0.88, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
                TRENER<br /><span style={{ color: 'rgba(255,255,255,0.15)' }}>PROFIL</span>
              </h1>

              {/* Section switcher — only 2 tabs */}
              <div className="admin-section-switcher" style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', width: 'fit-content', marginBottom: '32px' }}>
                {([['athletes', 'Moji Lifteri'], ['obavijesti', 'Obavijesti']] as [string,string][]).map(([sec, label]) => (
                  <button key={sec} onClick={() => setDashSection(sec as any)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', background: dashSection === sec ? 'rgba(255,255,255,0.1)' : 'transparent', border: dashSection === sec ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent', borderRadius: '7px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--fm)', fontWeight: dashSection === sec ? 700 : 400, color: dashSection === sec ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', letterSpacing: '0.04em' }}>
                    {sec === 'obavijesti' && <Bell size={13} />}
                    {label}
                  </button>
                ))}
              </div>

              {/* Summary stats */}
              <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', ...glass, overflow: 'hidden', maxWidth: '300px' }}>
                {[
                  { val: totalAthletes, label: 'MOJI LIFTERI', color: '#fff' },
                  { val: activeBlocks, label: 'AKT. BLOKOVA', color: '#4ade80' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', borderRight: i < 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── OBAVIJESTI ─── */}
            {dashSection === 'obavijesti' && (
              <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: '680px' }}>
                <div style={{ ...glass, borderRadius: '12px', overflow: 'hidden', marginBottom: '28px' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>NOVA OBAVIJEST</div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
                    <textarea
                      value={notifMsg}
                      onChange={e => setNotifMsg(e.target.value)}
                      placeholder="Upiši poruku za lifere..."
                      style={{ width: '100%', minHeight: '90px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', fontFamily: 'var(--fm)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.6, borderRadius: '6px' }}
                    />

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>PRIMATELJI ({notifSelected.length}/{athletes.length})</div>
                        <button
                          onClick={() => setNotifSelected(notifSelected.length === athletes.length ? [] : athletes.map(a => a.id))}
                          style={{ background: notifSelected.length === athletes.length ? 'rgba(239,53,53,0.12)' : 'transparent', border: `1px solid ${notifSelected.length === athletes.length ? 'rgba(239,53,53,0.35)' : 'rgba(255,255,255,0.12)'}`, color: notifSelected.length === athletes.length ? '#ef3535' : 'rgba(255,255,255,0.4)', padding: '4px 14px', cursor: 'pointer', fontSize: '0.58rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '5px', transition: 'all 0.15s' }}>
                          SVI MOJI LIFTERI
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px', maxHeight: '220px', overflowY: 'auto' as const }}>
                        {athletes.map(a => {
                          const sel = notifSelected.includes(a.id)
                          const initials = a.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                          return (
                            <button key={a.id} onClick={() => setNotifSelected(sel ? notifSelected.filter(id => id !== a.id) : [...notifSelected, a.id])}
                              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: sel ? 'rgba(239,53,53,0.06)' : 'transparent', border: `1px solid ${sel ? 'rgba(239,53,53,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' as const }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, color: '#fff', flexShrink: 0, fontFamily: 'var(--fm)' }}>{initials}</div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: sel ? '#fff' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--fm)', flex: 1 }}>{a.full_name}</span>
                              <span style={{ fontSize: '0.45rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', fontWeight: 700 }}>{(a.role ?? 'lifter').toUpperCase()}</span>
                              {sel && <Check size={13} color="#ef3535" />}
                            </button>
                          )
                        })}
                        {athletes.length === 0 && <div style={{ padding: '16px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontFamily: 'var(--fm)' }}>Nemaš dodijeljenih lifera.</div>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        disabled={!notifMsg.trim() || notifSelected.length === 0 || notifSending}
                        onClick={async () => {
                          if (!notifMsg.trim() || notifSelected.length === 0) return
                          setNotifSending(true)
                          await supabase.from('notifications').insert(
                            notifSelected.map(rid => ({ recipient_id: rid, sender_id: trainerId, message: notifMsg.trim(), read: false }))
                          )
                          setNotifMsg('')
                          setNotifSelected([])
                          setNotifSending(false)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? '#ef3535' : 'rgba(255,255,255,0.06)', border: 'none', color: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? '#fff' : 'rgba(255,255,255,0.2)', cursor: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? 'pointer' : 'not-allowed', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '7px', transition: 'all 0.2s' }}>
                        {notifSending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                        POŠALJI OBAVIJEST {notifSelected.length > 0 && `(${notifSelected.length})`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── ATHLETES ─── */}
            {dashSection === 'athletes' && <>
              <div className="admin-search-row" style={{ display: 'flex', gap: '12px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', ...glass, padding: '10px 16px', maxWidth: '360px' }}>
                  <Search size={14} color="rgba(255,255,255,0.3)" />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Pretraži lifere..."
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.88rem', width: '100%', fontFamily: 'var(--fm)' }} />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.52rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.2)', marginBottom: '16px', fontFamily: 'var(--fm)' }}>MOJI LIFTERI — KLIKNI ZA PREGLED</div>
                {filteredAthletes.length === 0 && (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', padding: '40px 0', fontFamily: 'var(--fm)' }}>
                    {athletes.length === 0 ? 'Nisi dodijeljen/a nijednom liferu. Kontaktiraj admina.' : 'Nema rezultata pretrage.'}
                  </div>
                )}
                <div className="admin-athlete-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {filteredAthletes.map(athlete => {
                    const initials = athlete.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                    const activeBlock = (athlete.blocks as Block[])?.find(b => b.status === 'active')
                    const blockCount = (athlete.blocks as Block[])?.length ?? 0

                    return (
                      <div key={athlete.id} style={{ position: 'relative', animation: 'fadeUp 0.4s ease', minWidth: 0 }}>
                        <div
                          onClick={() => { setSelectedAthlete(athlete); setTrainerView('overview') }}
                          style={{ width: '100%', minWidth: 0, padding: '18px 14px 0', ...glassCard, borderTop: `2px solid ${activeBlock ? 'rgba(74,222,128,0.45)' : 'rgba(255,255,255,0.09)'}`, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.22s', textAlign: 'center', position: 'relative', boxSizing: 'border-box' as const }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                        >
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.04) 100%)', border: '1.5px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fm)', margin: '0 auto 10px', position: 'relative' }}>
                            {initials}
                            {activeBlock && <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '9px', height: '9px', borderRadius: '50%', background: '#4ade80', border: '2px solid #09090e', boxShadow: '0 0 6px #4ade80' }} />}
                          </div>

                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', marginBottom: '3px', lineHeight: 1.25, padding: '0 2px' }}>{athlete.full_name}</div>

                          <div style={{ fontSize: '0.5rem', color: activeBlock ? '#4ade80' : 'rgba(255,255,255,0.2)', letterSpacing: '0.07em', marginBottom: '12px', minHeight: '13px' }}>
                            {activeBlock ? activeBlock.name : 'Nema ak. bloka'}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 -14px' }}>
                            <div style={{ padding: '8px 4px', background: '#0e0e0e', textAlign: 'center' }}>
                              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--fd)' }}>{blockCount}</div>
                              <div style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em', marginTop: '2px' }}>BLOKOVA</div>
                            </div>
                          </div>

                          <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0, transition: 'opacity 0.2s' }} className="view-arrow">
                            <Eye size={12} color="rgba(255,255,255,0.4)" />
                          </div>
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

      <style>{`
        @keyframes fadeIn       { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp      { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeUp       { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin         { to { transform: rotate(360deg) } }
        @keyframes panelSlideIn { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        div:hover .view-arrow { opacity: 1 !important; }

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

        @media (max-width: 640px) { .appnav-status { display: none !important; } }
        @media (max-width: 520px) { .appnav-name { display: none !important; } }

        .admin-outer { padding: 32px 24px 100px !important; }
        @media (max-width: 600px) { .admin-outer { padding: 20px 14px 90px !important; } }

        @media (max-width: 480px) {
          .admin-outer h1 { font-size: 2.6rem !important; }
        }

        .admin-section-switcher {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
          width: 100% !important;
          max-width: 100% !important;
          scrollbar-width: none;
        }
        .admin-section-switcher::-webkit-scrollbar { display: none; }
        .admin-section-switcher button { white-space: nowrap; flex-shrink: 0; }

        .admin-stats-grid { max-width: 100% !important; }

        @media (max-width: 520px) {
          .admin-search-row { flex-direction: column !important; align-items: stretch !important; }
          .admin-search-row > div { max-width: 100% !important; }
        }

        @media (max-width: 640px) {
          .admin-athlete-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
            margin: 0 -14px !important;
          }
        }

        @media (max-width: 520px) {
          .admin-outer textarea { font-size: 0.85rem !important; }
        }

        .week-header-top { padding: clamp(12px,3vw,20px) clamp(14px,4vw,24px) 0 !important; }
        .week-w-num { font-size: clamp(1.6rem,5vw,3.6rem) !important; }
        @media (max-width: 480px) {
          .day-grid > div { padding: 8px 6px !important; }
        }

        .workout-card { border-radius: 8px !important; }
        .workout-header-inner { padding: 12px 14px !important; gap: 10px !important; }
        @media (max-width: 480px) {
          .workout-header-inner { padding: 10px 12px !important; }
          .workout-controls { gap: 6px !important; }
          .done-badge { padding: 5px 8px !important; }
          .done-badge span { font-size: 0.46rem !important; letter-spacing: 0.12em !important; }
        }

        .ex-row-main { min-height: 52px !important; }
        @media (max-width: 400px) {
          .ex-row-main [style*="paddingLeft: '18px'"] { padding-left: 8px !important; gap: 6px !important; }
        }
        @media (max-width: 480px) {
          .ex-row-wrap > div > div[style*="gridTemplateColumns: '48px 1fr 88px'"] {
            grid-template-columns: 36px 1fr 72px !important;
          }
        }

        .ex-table-footer { flex-wrap: wrap !important; }
        @media (max-width: 480px) {
          .ex-table-footer { padding: 10px 12px !important; gap: 8px !important; }
          .ex-table-footer .add-btn { width: 100% !important; }
        }

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
