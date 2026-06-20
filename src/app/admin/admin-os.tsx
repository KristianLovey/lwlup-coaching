'use client'
// ───────────────────────────────────────────────────────────
// LWL UP · ADMIN OS — new shell (nav + rail + sections)
// Reskins the admin into the "Claude design" layout. All data is real
// (Supabase). Deep per-athlete features reuse the existing components.
// ───────────────────────────────────────────────────────────
import './admin-os.css'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutGrid, Users, Dumbbell, Trophy, Bell, Search, Plus, Check, Send,
  Loader2, PanelLeft, PanelRight, ChevronRight, ChevronLeft, ChevronDown, Settings, Trash2, LogOut, AlertCircle, SlidersHorizontal,
  User, Activity, Menu,
} from 'lucide-react'
import type { AthleteProfile } from './athlete-panels'
import type { Block, Exercise } from '../training/types'
import { AthleteDashboard, SettingsDrawer, defaultCards, type DashCards, type CardId, type CardState } from './admin-os-dashboard'

const supabase = createClient()

// Heavy per-athlete screens — code-split so they don't bloat the initial load
const SectionLoader = () => (
  <div className="os-empty" style={{ display: 'flex', justifyContent: 'center' }}><Loader2 size={20} className="os-spin" /></div>
)
const AthleteOverview = dynamic(() => import('./athlete-panels').then(m => ({ default: m.AthleteOverview })), { ssr: false, loading: SectionLoader })
const AthletePanel = dynamic(() => import('./athlete-panels').then(m => ({ default: m.AthletePanel })), { ssr: false, loading: SectionLoader })
const CompetitionsManager = dynamic(() => import('./competitions-manager').then(m => ({ default: m.CompetitionsManager })), { ssr: false, loading: SectionLoader })

type Section = 'dashboard' | 'lifteri' | 'tim' | 'treneri' | 'natjecanja' | 'obavijesti'
type Coach = AthleteProfile

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: <LayoutGrid size={19} /> },
  { id: 'lifteri',    label: 'Lifteri',    icon: <Users size={19} /> },
  { id: 'tim',        label: 'Tim',        icon: <Dumbbell size={19} /> },
  { id: 'treneri',    label: 'Treneri',    icon: <Users size={19} /> },
  { id: 'natjecanja', label: 'Natjecanja', icon: <Trophy size={19} /> },
  { id: 'obavijesti', label: 'Obavijesti', icon: <Bell size={19} /> },
]

const initials = (name?: string) => (name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??')

// ─────────────────────────────────────────────────────────────
export default function AdminOS({ role = 'admin' }: { role?: 'admin' | 'trener' }) {
  const isTrener = role === 'trener'
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminName, setAdminName] = useState(isTrener ? 'Trener' : 'Admin')
  const [adminId, setAdminId] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [compCount, setCompCount] = useState(0)

  const [section, setSection] = useState<Section>('dashboard')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lifteriManaging, setLifteriManaging] = useState(false)
  const [view, setView] = useState<'overview' | 'training'>('overview')
  const [navCollapsed, setNavCollapsed] = useState(true)
  const [navMobileOpen, setNavMobileOpen] = useState(false)
  const [railOpen, setRailOpen] = useState(false)
  const [railHidden, setRailHidden] = useState(true)
  const [search, setSearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cards, setCards] = useState<DashCards>(defaultCards)
  const setCard = useCallback((id: CardId, patch: Partial<CardState>) => setCards(prev => ({ ...prev, [id]: { ...prev[id], ...patch } })), [])

  const selected = useMemo(() => athletes.find(a => a.id === selectedId) ?? null, [athletes, selectedId])

  // persist dashboard card settings + side-menu state
  useEffect(() => {
    const saved = localStorage.getItem('adminos:cards')
    if (saved) { try { setCards(prev => ({ ...prev, ...JSON.parse(saved) })) } catch { /* ignore */ } }
    const nc = localStorage.getItem('adminos:navCollapsed'); if (nc != null) setNavCollapsed(nc === '1')
    const rh = localStorage.getItem('adminos:railHidden'); if (rh != null) setRailHidden(rh === '1')
  }, [])
  useEffect(() => { localStorage.setItem('adminos:cards', JSON.stringify(cards)) }, [cards])
  useEffect(() => { localStorage.setItem('adminos:navCollapsed', navCollapsed ? '1' : '0') }, [navCollapsed])
  useEffect(() => { localStorage.setItem('adminos:railHidden', railHidden ? '1' : '0') }, [railHidden])

  // close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return
    const h = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [profileOpen])

  // ── Load (single round-trip for blocks + assignments — no N+1) ──
  const loadAthletes = useCallback(async () => {
    let scopedIds: string[] | null = null
    if (isTrener) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: asg } = await supabase.from('coach_assignments').select('lifter_id').eq('coach_id', user?.id ?? '')
      scopedIds = (asg ?? []).map(a => a.lifter_id)
      if (scopedIds.length === 0) { setAthletes([]); setCoaches([]); return }
    }
    let q = supabase.from('lifters').select('id, full_name, role, created_at')
    if (scopedIds) q = q.in('id', scopedIds)
    const { data } = await q.order('full_name')
    if (!data) return
    const ids = data.map(p => p.id)
    const [{ data: allBlocks }, { data: asgn }] = await Promise.all([
      supabase.from('blocks').select('id, name, status, start_date, end_date, athlete_id').in('athlete_id', ids),
      supabase.from('coach_assignments').select('coach_id, lifter_id'),
    ])
    const byAthlete: Record<string, Block[]> = {}
    for (const b of (allBlocks ?? [])) (byAthlete[(b as { athlete_id: string }).athlete_id] ??= []).push(b as unknown as Block)
    const withBlocks = data.map(p => ({ ...p, blocks: byAthlete[p.id] ?? [] }) as AthleteProfile)
    setAthletes(withBlocks)
    setCoaches(withBlocks.filter(p => p.role === 'trener' || p.role === 'admin'))
    const map: Record<string, string> = {}
    for (const a of (asgn ?? [])) map[a.lifter_id] = a.coach_id
    setAssignments(map)
  }, [])

  const deleteUser = useCallback(async (id: string) => {
    await supabase.from('lifters').delete().eq('id', id)
    setSelectedId(prev => (prev === id ? null : prev))
    setAthletes(a => a.filter(x => x.id !== id))
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Nisi prijavljen/a.'); setLoading(false); return }
        setAdminId(user.id)
        const { data: profile } = await supabase.from('lifters').select('full_name, role').eq('id', user.id).single()
        if (!profile) { setError('Profil ne postoji.'); setLoading(false); return }
        const allowed = isTrener ? (profile.role === 'trener' || profile.role === 'admin') : profile.role === 'admin'
        if (!allowed) { setError(`Pristup odbijen — rola "${profile.role}".`); setLoading(false); return }
        setAdminName(profile.full_name ?? (isTrener ? 'Trener' : 'Admin'))
        const [{ data: exData }, { count }] = await Promise.all([
          supabase.from('exercises').select('*').order('category').order('name'),
          supabase.from('competitions').select('id', { count: 'exact', head: true }),
        ])
        setExercises(exData ?? [])
        setCompCount(count ?? 0)
        await loadAthletes()
        const savedId = localStorage.getItem('adminos:selectedAthleteId')
        if (savedId) setSelectedId(savedId)
        const savedSec = localStorage.getItem('adminos:section') as Section | null
        if (savedSec) setSection(savedSec)
      } catch (e) {
        setError(`Greška: ${(e as Error)?.message ?? String(e)}`)
      } finally { setLoading(false) }
    }
    init()
  }, [loadAthletes])

  useEffect(() => { if (selectedId) localStorage.setItem('adminos:selectedAthleteId', selectedId) }, [selectedId])
  useEffect(() => { localStorage.setItem('adminos:section', section) }, [section])

  const toggleRail = () => { if (window.innerWidth > 1180) setRailHidden(h => !h); else setRailOpen(o => !o) }
  // Rail / dashboard selection → shows the analytics dashboard
  const pickAthlete = (id: string) => { setSelectedId(id); setSection('dashboard'); setLifteriManaging(false); setRailOpen(false) }
  // Lifteri grid → opens per-athlete management (overview + training editor)
  const manageAthlete = (id: string) => { setSelectedId(id); setView('overview'); setLifteriManaging(true); setSection('lifteri') }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  // ── Counts ──
  const activeBlocks = athletes.reduce((s, a) => s + ((a.blocks as Block[])?.filter(b => b.status === 'active').length ?? 0), 0)
  const totalBlocks = athletes.reduce((s, a) => s + ((a.blocks as Block[])?.length ?? 0), 0)
  const coachCount = athletes.filter(a => a.role === 'trener').length

  if (loading) return (
    <div className="lwl-admin-os" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <Loader2 size={20} className="os-spin" /> <span style={{ letterSpacing: '0.2em', fontSize: 13 }}>UČITAVANJE…</span>
      </div>
    </div>
  )
  if (error) return (
    <div className="lwl-admin-os" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <AlertCircle size={30} color="var(--accent)" />
        <div style={{ color: 'var(--accent)', maxWidth: 460, lineHeight: 1.7, fontSize: 14 }}>{error}</div>
        <button className="btn-a" onClick={() => router.push('/')}>← Početna</button>
      </div>
    </div>
  )

  const shellClass = [
    'lwl-admin-os',
    navCollapsed ? 'os-nav-collapsed' : '',
    railHidden ? 'os-rail-hidden' : '',
  ].filter(Boolean).join(' ')

  const sectionTitle: Record<Section, string> = {
    dashboard: selected ? selected.full_name : 'Athlete Dashboard',
    lifteri: 'Upravljanje liferima', tim: 'Statistika tima',
    treneri: 'Treneri & role', natjecanja: 'Natjecanja', obavijesti: 'Obavijesti',
  }

  return (
    <div className={shellClass}>
      <div className="admin-shell">
        {/* ── NAV ── */}
        <aside className={'nav' + (navCollapsed ? ' nav--collapsed' : '') + (navMobileOpen ? ' mobile-open' : '')}>
          <div className="nav-logo">
            <div className="mark">L</div>
            <div className="txt">LWL UP<small>{isTrener ? 'TRENER · OS' : 'ADMIN · OS'}</small></div>
            <button className="nav-collapse" onClick={() => setNavCollapsed(v => !v)} aria-label="Skupi izbornik"><PanelLeft size={18} /></button>
          </div>
          <div className="nav-section">Upravljanje</div>
          <nav className="nav-items">
            {(isTrener ? NAV.filter(n => n.id === 'dashboard' || n.id === 'lifteri' || n.id === 'obavijesti') : NAV).map(n => (
              <button key={n.id} className={'nav-item' + (section === n.id && !settingsOpen ? ' active' : '')} onClick={() => { setSection(n.id); setSettingsOpen(false); setNavMobileOpen(false); if (n.id === 'lifteri') setLifteriManaging(false) }} title={n.label}>
                <span className="ico">{n.icon}</span>
                <span className="nav-label">{n.label}</span>
                {n.id === 'lifteri' && <span className="count">{athletes.length}</span>}
                {n.id === 'treneri' && <span className="count">{coachCount}</span>}
                {n.id === 'natjecanja' && <span className="count">{compCount}</span>}
              </button>
            ))}
          </nav>
          <div className="nav-section">Podešavanje</div>
          <nav className="nav-items">
            <button className={'nav-item' + (settingsOpen ? ' active' : '')} onClick={() => { setSection('dashboard'); setSettingsOpen(v => !v) }} title="Postavke dashboarda">
              <span className="ico"><SlidersHorizontal size={19} /></span>
              <span className="nav-label">Postavke</span>
            </button>
          </nav>
          <div className="nav-foot" ref={profileRef} style={{ position: 'relative' }}>
            <button className="nav-coach" onClick={() => setProfileOpen(v => !v)} title="Izbornik" style={{ width: '100%', cursor: 'pointer' }}>
              <div className="avatar">{initials(adminName)}</div>
              <div className="meta"><div className="n">{adminName}</div><div className="r">{isTrener ? 'Trener' : 'Administrator'}</div></div>
              <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {profileOpen && (
              <div style={{ position: 'fixed', left: navCollapsed ? 12 : 14, bottom: 78, width: 224, maxWidth: 'calc(100vw - 24px)', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.7)', zIndex: 120, overflow: 'hidden', animation: 'os-fadeUp 0.18s ease' }}>
                <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar" style={{ width: 36, height: 36 }}>{initials(adminName)}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)' }}>{adminName}</div>
                    <div style={{ fontSize: 11, color: isTrener ? '#f59e0b' : '#ef4444', fontFamily: 'var(--font-mono)', marginTop: 1 }}>● {isTrener ? 'Trener' : 'Administrator'}</div>
                  </div>
                </div>
                <div style={{ padding: 6 }}>
                  {[
                    { href: '/profile', icon: <User size={15} />, label: 'Moj profil' },
                    { href: '/training', icon: <Activity size={15} />, label: 'Trening' },
                    { href: '/exercises', icon: <Dumbbell size={15} />, label: 'Baza vježbi' },
                  ].map(it => (
                    <Link key={it.href} href={it.href} onClick={() => setProfileOpen(false)} style={{ textDecoration: 'none' }}>
                      <button className="os-menu-item">{it.icon}<span>{it.label}</span></button>
                    </Link>
                  ))}
                </div>
                <div style={{ padding: 6, borderTop: '1px solid var(--border)' }}>
                  <button className="os-menu-item os-menu-logout" onClick={() => { setProfileOpen(false); handleLogout() }}><LogOut size={15} /><span>Odjava</span></button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="main">
          <div className="topbar">
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="ctrl icon mobile-nav-btn" onClick={() => setNavMobileOpen(true)} aria-label="Izbornik"><Menu size={18} /></button>
            <div className="title-block">
              <div className="eyebrow">LWL UP · {section === 'dashboard' ? 'PREGLED' : (section === 'lifteri' && lifteriManaging) ? 'UREĐIVANJE' : 'ADMIN PANEL'}</div>
              <h1>
                {section === 'dashboard' && selected
                  ? <>{selected.full_name} <span className="dim">· {(selected.role ?? 'lifter').toUpperCase()}</span></>
                  : (section === 'lifteri' && lifteriManaging && selected)
                    ? <>{selected.full_name} <span className="dim">· {(selected.role ?? 'lifter').toUpperCase()}</span></>
                    : sectionTitle[section]}
              </h1>
            </div>
           </div>
            <div className="topbar-controls">
              {section === 'dashboard' && selected && (
                <button className={'ctrl icon' + (settingsOpen ? ' on' : '')} onClick={() => setSettingsOpen(v => !v)} aria-label="Postavke" title="Postavke dashboarda"><SlidersHorizontal size={16} /></button>
              )}
              <button className="ctrl icon mobile-rail-btn" onClick={toggleRail} aria-label="Lifteri"><Users size={16} /></button>
              <button className={'ctrl icon' + (railHidden ? '' : ' on')} onClick={toggleRail} aria-label="Panel liftera" title="Panel liftera"><Users size={16} /></button>
            </div>
          </div>

          <div className="os-section" key={`${section}-${lifteriManaging}-${view}-${selectedId ?? 'none'}`}>
            {section === 'dashboard' && (
              selected
                ? <AthleteDashboard athleteId={selected.id} athleteName={selected.full_name} cards={cards} setCard={setCard} />
                : <DashboardSummary athletes={athletes} totalAthletes={athletes.length} activeBlocks={activeBlocks} totalBlocks={totalBlocks} onPick={pickAthlete} />
            )}
            {section === 'lifteri' && (
              (lifteriManaging && selected)
                ? (view === 'training'
                    ? <AthletePanel athlete={selected} exercises={exercises} allAthletes={athletes} onBack={() => setView('overview')} onRefresh={loadAthletes} />
                    : (
                      <>
                        <button className="btn-a" style={{ marginBottom: 16 }} onClick={() => setLifteriManaging(false)}><ChevronLeft size={14} /> Natrag na lifere</button>
                        <AthleteOverview athlete={selected} onBack={() => setLifteriManaging(false)} onGoTraining={() => setView('training')} />
                      </>
                    ))
                : <LifteriSection athletes={athletes} search={search} setSearch={setSearch} onPick={manageAthlete} onAdded={loadAthletes} onDelete={deleteUser} adminId={adminId} />
            )}
            {section === 'tim' && <TimSection athletes={athletes} onSaved={loadAthletes} />}
            {section === 'treneri' && <TreneriSection athletes={athletes} coaches={coaches} assignments={assignments} setAssignments={setAssignments} onRoleChange={loadAthletes} />}
            {section === 'natjecanja' && <CompetitionsManager />}
            {section === 'obavijesti' && <ObavijestiSection athletes={athletes} adminId={adminId} />}
          </div>
        </main>

        {/* ── RAIL ── */}
        <aside className={'rail' + (railOpen ? ' open' : '') + (railHidden ? ' is-hidden' : '')}>
          <div className="rail-head">
            <div className="rail-head-top">
              <div className="t">Lifteri · odaberi</div>
              <button className="rail-hide" onClick={() => { if (window.innerWidth > 1180) setRailHidden(true); else setRailOpen(false) }} aria-label="sakrij"><PanelRight size={16} /></button>
            </div>
            <div className="rail-search">
              <span className="ico"><Search size={16} /></span>
              <input placeholder="Pretraži…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="rail-list">
            {athletes.filter(a => a.full_name?.toLowerCase().includes(search.toLowerCase())).map(a => {
              const active = (a.blocks as Block[])?.find(b => b.status === 'active')
              return (
                <button key={a.id} className={'rail-athlete' + (selectedId === a.id ? ' active' : '')} onClick={() => pickAthlete(a.id)}>
                  <div className="a-avatar">{initials(a.full_name)}<span className={'sdot ' + (active ? 'on-track' : 'monitor')} /></div>
                  <div className="info">
                    <div className="n">{a.full_name}</div>
                    <div className="m">{(a.role ?? 'lifter')}{active ? ` · ${active.name}` : ''}</div>
                  </div>
                  <span className="chev"><ChevronRight size={16} /></span>
                </button>
              )
            })}
            {athletes.length === 0 && <div className="os-empty">Nema liftera.</div>}
          </div>
        </aside>
      </div>
      {railOpen && <div className="rail-scrim" onClick={() => setRailOpen(false)} />}
      {navMobileOpen && <div className="nav-mobile-scrim" onClick={() => setNavMobileOpen(false)} />}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} cards={cards} setCard={setCard} onReset={() => setCards(defaultCards())} />
    </div>
  )
}

// ── Dashboard summary (team-level, real counts) ──
function DashboardSummary({ athletes, totalAthletes, activeBlocks, totalBlocks, onPick }: {
  athletes: AthleteProfile[]; totalAthletes: number; activeBlocks: number; totalBlocks: number; onPick: (id: string) => void
}) {
  return (
    <div>
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Lifera', num: totalAthletes },
          { label: 'Aktivnih blokova', num: activeBlocks },
          { label: 'Ukupno blokova', num: totalBlocks },
        ].map(k => (
          <div className="kpi" key={k.label}>
            <div className="top"><span className="label">{k.label}</span></div>
            <div className="num">{k.num}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div className="atc-head"><span className="t">Odaberi liftera za detalje</span></div>
        <div className="lifter-grid" style={{ padding: '0 22px 22px' }}>
          {athletes.map(a => {
            const active = (a.blocks as Block[])?.find(b => b.status === 'active')
            return (
              <button className="lifter-cell" key={a.id} onClick={() => onPick(a.id)}>
                <div className="circle">{initials(a.full_name)}<span className={'sdot ' + (active ? 'on-track' : 'monitor')} /></div>
                <div className="n">{a.full_name}</div>
                <div className="c">{(a.role ?? 'lifter')}</div>
                <div className="tot">{active ? active.name : 'Nema aktivnog bloka'}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Lifteri ──
function LifteriSection({ athletes, search, setSearch, onPick, onAdded, onDelete, adminId }: {
  athletes: AthleteProfile[]; search: string; setSearch: (v: string) => void; onPick: (id: string) => void
  onAdded: () => void; onDelete: (id: string) => void; adminId: string
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [manage, setManage] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const list = athletes.filter(a => a.full_name?.toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <span className="ico"><Search size={16} /></span>
          <input placeholder="Pretraži lifere…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={'btn-a' + (manage ? ' accent' : '')} onClick={() => setManage(m => !m)}>
          <Settings size={14} /> {manage ? 'Gotovo' : 'Upravljaj'}
        </button>
        <button className="btn-a accent" onClick={() => setShowAdd(true)}><Plus size={14} /> Dodaj liftera</button>
      </div>
      <div className="lifter-grid os-stagger">
        {list.map(a => {
          const active = (a.blocks as Block[])?.find(b => b.status === 'active')
          return (
            <div className="lifter-cell" key={a.id} onClick={() => !manage && onPick(a.id)} style={{ position: 'relative', cursor: manage ? 'default' : 'pointer' }}>
              {manage && a.role !== 'admin' && (
                <button className="icon-sm danger" onClick={e => { e.stopPropagation(); setConfirmId(a.id) }}
                  style={{ position: 'absolute', top: 10, right: 10 }} title="Obriši korisnika"><Trash2 size={14} /></button>
              )}
              <div className="circle">{initials(a.full_name)}<span className={'sdot ' + (active ? 'on-track' : 'monitor')} /></div>
              <div className="n">{a.full_name}</div>
              <div className="c">{(a.role ?? 'lifter')}</div>
              <div className="tot">{active ? active.name : 'Nema aktivnog bloka'}</div>
            </div>
          )
        })}
        {list.length === 0 && <div className="os-empty">Nema rezultata.</div>}
      </div>
      {showAdd && <AddLifterModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); onAdded() }} adminId={adminId} />}
      {confirmId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.8)', display: 'grid', placeItems: 'center', padding: 24 }} onClick={() => setConfirmId(null)}>
          <div className="card" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="card-head"><span className="t">Obriši korisnika</span></div>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6, margin: '0 0 18px' }}>
              Obrisat će se profil i svi podaci korisnika <b style={{ color: 'var(--text)' }}>{athletes.find(a => a.id === confirmId)?.full_name}</b>. Nepovratno.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-a" onClick={() => setConfirmId(null)}>Odustani</button>
              <button className="btn-a accent" onClick={() => { onDelete(confirmId); setConfirmId(null) }}>Obriši</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddLifterModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void; adminId: string }) {
  const [email, setEmail] = useState(''), [name, setName] = useState(''), [cat, setCat] = useState('')
  const [sq, setSq] = useState(''), [bp, setBp] = useState(''), [dl, setDl] = useState('')
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState('')
  const submit = async () => {
    setErr(''); setOk('')
    if (!email || !name) { setErr('Email i ime su obavezni.'); return }
    setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/create-lifter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email, fullName: name, category: cat || undefined, squat: sq || undefined, bench: bp || undefined, deadlift: dl || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setErr(json.error ?? 'Greška.'); return }
      setOk(`${name} dodan!`); setTimeout(onAdded, 700)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.8)', display: 'grid', placeItems: 'center', padding: 24 }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="card-head"><span className="t">Novi lifter</span></div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field"><label>Ime i prezime</label><input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field-row">
            <div className="field"><label>Kategorija</label><input value={cat} onChange={e => setCat(e.target.value)} placeholder="-83" /></div>
            <div className="field"><label>Squat</label><input value={sq} onChange={e => setSq(e.target.value)} /></div>
            <div className="field"><label>Bench</label><input value={bp} onChange={e => setBp(e.target.value)} /></div>
          </div>
          <div className="field" style={{ maxWidth: 140 }}><label>Deadlift</label><input value={dl} onChange={e => setDl(e.target.value)} /></div>
          {err && <div style={{ color: 'var(--accent)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{err}</div>}
          {ok && <div style={{ color: '#6fcf7e', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{ok}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn-a" onClick={onClose}>Odustani</button>
            <button className="btn-a accent" onClick={submit} disabled={busy}>{busy ? 'Dodajem…' : 'Dodaj'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tim (1RM stats, real, profiles) ──
function TimSection({ athletes, onSaved }: { athletes: AthleteProfile[]; onSaved: () => void }) {
  const [stats, setStats] = useState<Record<string, { sq: string; bp: string; dl: string; bw: string; wc: string; sex: string }>>({})
  const [savedId, setSavedId] = useState<string | null>(null)
  const ids = athletes.map(a => a.id).join(',')

  useEffect(() => {
    if (!athletes.length) return
    supabase.from('lifters')
      .select('id, current_squat_1rm, current_bench_1rm, current_deadlift_1rm, body_weight, weight_class, sex')
      .in('id', athletes.map(a => a.id))
      .then(({ data }) => {
        const m: Record<string, { sq: string; bp: string; dl: string; bw: string; wc: string; sex: string }> = {}
        for (const p of (data ?? [])) m[p.id] = {
          sq: String(p.current_squat_1rm ?? ''), bp: String(p.current_bench_1rm ?? ''), dl: String(p.current_deadlift_1rm ?? ''),
          bw: String(p.body_weight ?? ''), wc: p.weight_class ?? '', sex: p.sex ?? 'male',
        }
        setStats(m)
      })
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps

  const dbField: Record<string, string> = { sq: 'current_squat_1rm', bp: 'current_bench_1rm', dl: 'current_deadlift_1rm', bw: 'body_weight', wc: 'weight_class', sex: 'sex' }
  const save = async (id: string, field: string, val: string) => {
    const isNum = ['sq', 'bp', 'dl', 'bw'].includes(field)
    await supabase.from('lifters').update({ [dbField[field]]: val === '' ? null : (isNum ? parseFloat(val) : val) }).eq('id', id)
    setSavedId(id); setTimeout(() => setSavedId(s => s === id ? null : s), 1400)
    onSaved()
  }
  const set = (id: string, field: string, val: string) => setStats(p => ({ ...p, [id]: { ...(p[id] ?? { sq: '', bp: '', dl: '', bw: '', wc: '', sex: 'male' }), [field]: val } }))

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 20 }}>Statistike tima — uredi 1RM, kategoriju i tjelesnu težinu</div>
      <div className="edit-grid">
        {athletes.map(a => {
          const s = stats[a.id] ?? { sq: '', bp: '', dl: '', bw: '', wc: '', sex: 'male' }
          return (
            <div className="edit-card" key={a.id}>
              <div className="ec-head">
                <div className="a-avatar">{initials(a.full_name)}</div>
                <div><div className="nm">{a.full_name}</div><div className="sub">{(a.role ?? 'lifter').toUpperCase()}</div></div>
                <span className={'saved-flash' + (savedId === a.id ? ' show' : '')} style={{ marginLeft: 'auto' }}><Check size={11} /> Spremljeno</span>
              </div>
              <div className="field-row" style={{ marginBottom: 10 }}>
                <div className="field"><label>Spol</label>
                  <select value={s.sex} onChange={e => { set(a.id, 'sex', e.target.value); save(a.id, 'sex', e.target.value) }}>
                    <option value="male">M</option><option value="female">Ž</option>
                  </select>
                </div>
                <div className="field"><label>Kategorija</label><input value={s.wc} onChange={e => set(a.id, 'wc', e.target.value)} onBlur={e => save(a.id, 'wc', e.target.value)} placeholder="-83" /></div>
                <div className="field"><label>Tjel. težina</label><input value={s.bw} onChange={e => set(a.id, 'bw', e.target.value)} onBlur={e => save(a.id, 'bw', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Squat 1RM</label><input value={s.sq} onChange={e => set(a.id, 'sq', e.target.value)} onBlur={e => save(a.id, 'sq', e.target.value)} /></div>
                <div className="field"><label>Bench 1RM</label><input value={s.bp} onChange={e => set(a.id, 'bp', e.target.value)} onBlur={e => save(a.id, 'bp', e.target.value)} /></div>
                <div className="field"><label>Deadlift 1RM</label><input value={s.dl} onChange={e => set(a.id, 'dl', e.target.value)} onBlur={e => save(a.id, 'dl', e.target.value)} /></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Treneri ──
function TreneriSection({ athletes, coaches, assignments, setAssignments, onRoleChange }: {
  athletes: AthleteProfile[]; coaches: Coach[]; assignments: Record<string, string>
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, string>>>; onRoleChange: () => void
}) {
  const assign = async (lifterId: string, coachId: string) => {
    if (!coachId) {
      await supabase.from('coach_assignments').delete().eq('lifter_id', lifterId)
      setAssignments(prev => { const n = { ...prev }; delete n[lifterId]; return n })
    } else {
      await supabase.from('coach_assignments').upsert({ coach_id: coachId, lifter_id: lifterId }, { onConflict: 'lifter_id' })
      setAssignments(prev => ({ ...prev, [lifterId]: coachId }))
    }
  }
  const setRole = async (id: string, role: string) => { await supabase.from('lifters').update({ role }).eq('id', id); onRoleChange() }
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 18 }}>Dodijeli liftera treneru ili promijeni rolu korisnika</div>
      <div className="grid c2">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="atc-head"><span className="t">Dodjela liftera treneru</span></div>
          {athletes.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderTop: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{a.full_name}</span>
              <div className="os-select">
                <select value={assignments[a.id] ?? ''} onChange={e => assign(a.id, e.target.value)}>
                  <option value="">— Bez trenera —</option>
                  {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
                <span className="cr"><ChevronDown size={14} /></span>
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="atc-head"><span className="t">Role korisnika</span></div>
          {athletes.filter(a => a.role !== 'admin').map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderTop: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{a.full_name}</span>
              <div className="os-select">
                <select value={a.role} onChange={e => setRole(a.id, e.target.value)}>
                  <option value="lifter">Lifter</option><option value="trener">Trener</option>
                </select>
                <span className="cr"><ChevronDown size={14} /></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Obavijesti ──
function ObavijestiSection({ athletes, adminId }: { athletes: AthleteProfile[]; adminId: string }) {
  const [msg, setMsg] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const allOn = sel.size === athletes.length && athletes.length > 0
  const toggle = (id: string) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const send = async () => {
    if (!msg.trim() || sel.size === 0) return
    setSending(true)
    await supabase.from('notifications').insert([...sel].map(rid => ({ recipient_id: rid, sender_id: adminId, message: msg.trim(), read: false })))
    setMsg(''); setSel(new Set()); setSending(false)
  }
  return (
    <div className="notif-layout">
      <div className="card compose">
        <div className="card-head"><span className="t">Nova obavijest</span></div>
        <textarea placeholder="Napiši poruku liferima…" value={msg} onChange={e => setMsg(e.target.value)} />
        <div className="compose-foot">
          <span className="eyebrow">{sel.size} odabrano</span>
          <button className="btn-a accent" disabled={!msg.trim() || sel.size === 0 || sending} onClick={send}><Send size={14} /> {sending ? 'Šaljem…' : 'Pošalji'}</button>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="t">Primatelji</span></div>
        <div className="recipients">
          <button className="recipient all" onClick={() => setSel(allOn ? new Set() : new Set(athletes.map(a => a.id)))}>
            <span className={'checkbox' + (allOn ? ' on' : '')}><Check size={12} /></span>
            <span className="nm">Svi korisnici</span>
          </button>
          {athletes.map(a => (
            <button className={'recipient' + (sel.has(a.id) ? ' on' : '')} key={a.id} onClick={() => toggle(a.id)}>
              <span className={'checkbox' + (sel.has(a.id) ? ' on' : '')}><Check size={12} /></span>
              <span className="a-avatar">{initials(a.full_name)}</span>
              <span className="nm">{a.full_name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
