'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check, Search,
  GripVertical, Loader2, LogOut, Home, FolderOpen,
  User, Shield, X, ChevronLeft, Dumbbell, BarChart2
} from 'lucide-react'
import type { Exercise, WorkoutExercise, Workout, Week, CoachTip, SetLog, Competition } from './types'

const supabase = createClient()

// ─── AVATAR ICONS ─────────────────────────────────────────────────
export const AVATARS: { id: string; label: string; svg: string }[] = [
  { id: 'barbell', label: 'Šipka',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="18" width="36" height="4" rx="2" fill="currentColor"/><rect x="6" y="12" width="4" height="16" rx="1.5" fill="currentColor" opacity=".8"/><rect x="30" y="12" width="4" height="16" rx="1.5" fill="currentColor" opacity=".8"/><rect x="3" y="15" width="4" height="10" rx="1" fill="currentColor"/><rect x="33" y="15" width="4" height="10" rx="1" fill="currentColor"/></svg>` },
  { id: 'squat', label: 'Čučanj',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="6" r="3" fill="currentColor"/><path d="M14 12h12M20 12v10l-5 8M20 22l5 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="4" y="19" width="32" height="3" rx="1.5" fill="currentColor" opacity=".4"/></svg>` },
  { id: 'deadlift', label: 'Mrtvo',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="6" r="3" fill="currentColor"/><path d="M20 9v12M14 28l6-7 6 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="29" width="32" height="4" rx="2" fill="currentColor" opacity=".5"/><rect x="4" y="26" width="6" height="10" rx="1.5" fill="currentColor" opacity=".7"/><rect x="30" y="26" width="6" height="10" rx="1.5" fill="currentColor" opacity=".7"/></svg>` },
  { id: 'bench', label: 'Klupa',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="20" width="28" height="5" rx="2.5" fill="currentColor" opacity=".7"/><rect x="8" y="25" width="4" height="10" rx="2" fill="currentColor" opacity=".6"/><rect x="28" y="25" width="4" height="10" rx="2" fill="currentColor" opacity=".6"/><rect x="4" y="14" width="32" height="4" rx="2" fill="currentColor" opacity=".3"/><circle cx="20" cy="8" r="3" fill="currentColor"/></svg>` },
  { id: 'trophy', label: 'Trofej',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6h16v14a8 8 0 0 1-16 0V6Z" fill="currentColor" opacity=".8"/><path d="M12 10H6a4 4 0 0 0 4 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M28 10h6a4 4 0 0 1-4 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="16" y="28" width="8" height="4" rx="1" fill="currentColor" opacity=".6"/><rect x="12" y="32" width="16" height="3" rx="1.5" fill="currentColor" opacity=".5"/></svg>` },
  { id: 'flame', label: 'Plamen',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4C20 4 28 14 28 22a8 8 0 0 1-16 0c0-4 2-8 4-10-1 4 2 6 2 6s2-8 2-14Z" fill="currentColor" opacity=".9"/><path d="M20 26a3 3 0 0 0 3-3c0-2-3-5-3-5s-3 3-3 5a3 3 0 0 0 3 3Z" fill="white" opacity=".4"/></svg>` },
  { id: 'lightning', label: 'Munja',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 4L10 22h12l-4 14 18-20H24L22 4Z" fill="currentColor" opacity=".9"/></svg>` },
  { id: 'shield', label: 'Štit',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4L6 10v12c0 8 6 13 14 15 8-2 14-7 14-15V10L20 4Z" fill="currentColor" opacity=".8"/><path d="M13 20l5 5 9-9" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/></svg>` },
  { id: 'mountain', label: 'Planina',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 34L14 14l6 8 4-6 12 18H4Z" fill="currentColor" opacity=".8"/><path d="M24 16l-2 3" stroke="white" stroke-width="2" stroke-linecap="round" opacity=".6"/></svg>` },
  { id: 'star', label: 'Zvijezda',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4l4.9 10 11 1.6-8 7.8 1.9 11L20 29.4 10.2 34.4l1.9-11-8-7.8 11-1.6L20 4Z" fill="currentColor" opacity=".9"/></svg>` },
  { id: 'target', label: 'Meta',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="16" stroke="currentColor" stroke-width="2.5" opacity=".4"/><circle cx="20" cy="20" r="10" stroke="currentColor" stroke-width="2.5" opacity=".65"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>` },
  { id: 'crown', label: 'Kruna',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 28h28M6 28L8 14l8 8 4-10 4 10 8-8 2 14" fill="currentColor" opacity=".7"/><path d="M6 28h28M8 14l8 8 4-10 4 10 8-8L30 28H10L8 14Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/><circle cx="8" cy="14" r="2.5" fill="currentColor"/><circle cx="20" cy="10" r="2.5" fill="currentColor"/><circle cx="32" cy="14" r="2.5" fill="currentColor"/><rect x="8" y="28" width="24" height="5" rx="1" fill="currentColor" opacity=".5"/></svg>` },
]

export function AvatarSvg({ iconId, size = 32, color = 'currentColor' }: { iconId: string; size?: number; color?: string }) {
  const icon = AVATARS.find(a => a.id === iconId) ?? AVATARS[0]
  return (
    <div style={{ width: size, height: size, color, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: icon.svg }} />
  )
}

// ─── DATE HELPER ──────────────────────────────────────────────────
function formatWorkoutDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00')
    const days = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub']
    const months = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro']
    return `${days[d.getDay()]}  ·  ${d.getDate()}. ${months[d.getMonth()]}.`
  } catch { return dateStr }
}

// ─── CUSTOM NUMBER STEP INPUT ─────────────────────────────────────
function StepInput({ value, onChange, placeholder, step = 2.5, color = '#6b8cff' }: {
  value: number | null; onChange: (v: string) => void; placeholder?: string; step?: number; color?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: '#0a0a12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', height: '30px' }}>
      <button type="button" tabIndex={-1}
        onClick={() => onChange(value !== null ? String(Math.max(0, value - step)) : '0')}
        style={{ padding: '0 8px', background: 'rgba(255,255,255,0.03)', border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', color: '#555', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s, background 0.15s', fontFamily: 'var(--fm)' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
        −
      </button>
      <input
        type="number" step={step} value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '—'}
        style={{ flex: 1, background: 'transparent', border: 'none', color: '#e0e0e0', padding: '0 4px', fontSize: '0.82rem', outline: 'none', fontFamily: 'var(--fm)', textAlign: 'center', minWidth: 0, width: '100%' }}
        onFocus={e => { (e.target.closest('div') as HTMLElement)!.style.borderColor = color + '66' }}
        onBlur={e => { (e.target.closest('div') as HTMLElement)!.style.borderColor = 'rgba(255,255,255,0.1)' }}
      />
      <button type="button" tabIndex={-1}
        onClick={() => onChange(String((value ?? 0) + step))}
        style={{ padding: '0 8px', background: 'rgba(255,255,255,0.03)', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.08)', color: '#555', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s, background 0.15s', fontFamily: 'var(--fm)' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
        +
      </button>
    </div>
  )
}

// ─── NAVBAR ───────────────────────────────────────────────────────
export function TrainingNav({ athleteName, isAdmin, onLogout, avatarIcon }: {
  athleteName: string; isAdmin: boolean; onLogout: () => void; avatarIcon?: string
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const initials = athleteName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const dropRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    if (profileOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const NAV_ITEMS = [
    { href: '/', label: 'Početna' },
    { href: '/exercises', label: 'Vježbe' },
    { href: '/profile', label: 'Profil' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: '56px',
      display: 'flex', alignItems: 'center',
      padding: '0 clamp(16px,3vw,32px)',
      background: scrolled ? 'rgba(4,4,8,0.92)' : 'rgba(4,4,8,0.75)',
      borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)'}`,
      backdropFilter: 'blur(32px) saturate(180%)',
      WebkitBackdropFilter: 'blur(32px) saturate(180%)',
      transition: 'background 0.4s, border-color 0.4s',
    }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', marginRight: '32px', flexShrink: 0 }}>
        <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '28px', opacity: 0.95 }} />
      </Link>

      {/* Nav links — Apple style, center-left */}
      <div className="tnav-links" style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href} className="tnav-pill"
            style={{ textDecoration: 'none', padding: '6px 14px', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontWeight: 500, fontFamily: 'var(--fm)', letterSpacing: '0.01em', borderRadius: '8px', transition: 'all 0.18s', whiteSpace: 'nowrap' as const }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Right — status pill + avatar */}
      <div className="tnav-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Live status pill */}
        <div className="tnav-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: '20px' }}>
          <div style={{ position: 'relative', width: '6px', height: '6px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 5px #22c55e' }} />
            <div style={{ position: 'absolute', inset: '-3px', background: 'rgba(34,197,94,0.2)', borderRadius: '50%', animation: 'pingPulse 2.4s ease-in-out infinite' }} />
          </div>
          <span style={{ fontSize: '0.62rem', color: '#4ade80', fontWeight: 600, fontFamily: 'var(--fm)', letterSpacing: '0.04em' }}>Aktivan</span>
        </div>

        {/* Avatar / profile button */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button onClick={() => setProfileOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '5px 10px 5px 5px', background: profileOpen ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!profileOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
            onMouseLeave={e => { if (!profileOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
            {/* Avatar */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #2a2a3e 0%, #16161e 100%)', border: '1.5px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: '#d0d0f0', fontFamily: 'var(--fm)', flexShrink: 0 }}>
              {avatarIcon ? <AvatarSvg iconId={avatarIcon} size={18} color="#b0b8ff" /> : initials}
            </div>
            <span className="tnav-name" style={{ fontSize: '0.78rem', fontWeight: 500, color: '#e0e0e8', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' as const }}>{athleteName?.split(' ')[0] || 'Atleta'}</span>
            <ChevronDown size={11} color="rgba(255,255,255,0.4)" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s', flexShrink: 0 }} />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div className="profile-dropdown" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px', background: 'rgba(10,10,16,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)', zIndex: 300, animation: 'dropDown 0.2s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden', backdropFilter: 'blur(40px)' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #2a2a3e 0%, #16161e 100%)', border: '1.5px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#d0d0f0' }}>
                    {avatarIcon ? <AvatarSvg iconId={avatarIcon} size={22} color="#b0b8ff" /> : initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f0f0f8', fontFamily: 'var(--fm)' }}>{athleteName}</div>
                    <div style={{ fontSize: '0.58rem', color: '#4ade80', fontFamily: 'var(--fm)', marginTop: '1px' }}>● Aktivan</div>
                  </div>
                </div>
              </div>
              {/* Menu items */}
              <div style={{ padding: '6px' }}>
                {[
                  { href: '/profile', icon: <User size={14}/>, label: 'Moj profil' },
                  { href: '/training', icon: <BarChart2 size={14}/>, label: 'Trening' },
                  { href: '/exercises', icon: <Dumbbell size={14}/>, label: 'Baza vježbi' },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setProfileOpen(false)} style={{ textDecoration: 'none' }}>
                    <button className="nav-menu-item">{item.icon}<span>{item.label}</span></button>
                  </Link>
                ))}
                {isAdmin && (
                  <Link href="/admin" onClick={() => setProfileOpen(false)} style={{ textDecoration: 'none' }}>
                    <button className="nav-menu-item nav-menu-admin">
                      <Shield size={14} color="#f59e0b"/>
                      <span>Admin panel</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.5rem', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '2px 7px', letterSpacing: '0.1em', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px' }}>ADMIN</span>
                    </button>
                  </Link>
                )}
              </div>
              <div style={{ padding: '6px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button onClick={() => { setProfileOpen(false); onLogout() }} className="nav-menu-item nav-menu-logout">
                  <LogOut size={14}/><span>Odjava</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes dropDown  { from { opacity:0; transform:translateY(-6px) scale(0.98) } to { opacity:1; transform:none } }
        @keyframes pingPulse { 0%,100% { transform:scale(1); opacity:0.5 } 50% { transform:scale(2.4); opacity:0 } }
        .nav-menu-item {
          width:100%; display:flex; align-items:center; gap:10px;
          padding:8px 12px; background:transparent; border:none;
          color:rgba(255,255,255,0.7); font-size:0.82rem; font-family:var(--fm);
          font-weight:450; cursor:pointer; border-radius:9px;
          transition:background 0.15s, color 0.15s; text-align:left; letter-spacing:0.01em;
        }
        .nav-menu-item:hover { background:rgba(255,255,255,0.07); color:#fff; }
        .nav-menu-admin:hover { background:rgba(245,158,11,0.08) !important; }
        .nav-menu-logout { color:rgba(255,80,80,0.7) !important; }
        .nav-menu-logout:hover { background:rgba(255,60,60,0.08) !important; color:#ff6060 !important; }
        .tnav-pill { display:flex; align-items:center; }
        @media (max-width:640px) { .tnav-status { display:none !important; } }
        @media (max-width:520px) { .tnav-name   { display:none !important; } }
        @media (max-width:680px) { .tnav-links a { padding:6px 10px !important; font-size:0.7rem !important; } }
        @media (max-width:480px) { .tnav-links   { display:none !important; } }
      `}</style>
    </nav>
  )
}

// ─── APP NAVBAR (sve app stranice: trening, profil, vježbe, admin) ─
export function AppNav({ athleteName, isAdmin, onLogout, avatarIcon }: {
  athleteName: string; isAdmin: boolean; onLogout: () => void; avatarIcon?: string
}) {
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const initials = athleteName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: '56px', display: 'flex', alignItems: 'center',
      padding: '0 clamp(16px,3vw,32px)',
      background: scrolled ? 'rgba(4,4,8,0.95)' : 'rgba(4,4,8,0.75)',
      borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)'}`,
      backdropFilter: 'blur(32px) saturate(180%)',
      WebkitBackdropFilter: 'blur(32px) saturate(180%)',
      transition: 'background 0.4s, border-color 0.4s',
    }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '28px', opacity: 0.95 }} />
      </Link>

      {/* Push avatar to right */}
      <div style={{ flex: 1 }} />

      {/* Right — status pill + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

        {/* Status pill */}
        <div className="appnav-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: isAdmin ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${isAdmin ? 'rgba(239,68,68,0.22)' : 'rgba(34,197,94,0.18)'}`, borderRadius: '20px' }}>
          <div style={{ position: 'relative', width: '6px', height: '6px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: isAdmin ? '#ef4444' : '#22c55e', borderRadius: '50%', boxShadow: `0 0 5px ${isAdmin ? '#ef4444' : '#22c55e'}` }} />
            <div style={{ position: 'absolute', inset: '-3px', background: isAdmin ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', borderRadius: '50%', animation: 'appnavPing 2.4s ease-in-out infinite' }} />
          </div>
          <span style={{ fontSize: '0.62rem', color: isAdmin ? '#f87171' : '#4ade80', fontWeight: 600, fontFamily: 'var(--fm)', letterSpacing: '0.04em' }}>{isAdmin ? 'Admin' : 'Aktivan'}</span>
        </div>

        {/* Avatar / dropdown */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button onClick={() => setOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '5px 10px 5px 5px', background: open ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
            onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #2a2a3e 0%, #16161e 100%)', border: '1.5px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: '#d0d0f0', fontFamily: 'var(--fm)', flexShrink: 0 }}>
              {avatarIcon ? <AvatarSvg iconId={avatarIcon} size={18} color="#b0b8ff" /> : initials}
            </div>
            <span className="appnav-name" style={{ fontSize: '0.78rem', fontWeight: 500, color: '#e0e0e8', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' as const }}>{athleteName?.split(' ')[0] || ''}</span>
            <ChevronDown size={11} color="rgba(255,255,255,0.4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s', flexShrink: 0 }} />
          </button>

          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px', background: 'rgba(10,10,16,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)', zIndex: 300, animation: 'appnavDrop 0.2s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden', backdropFilter: 'blur(40px)' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #2a2a3e 0%, #16161e 100%)', border: '1.5px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarIcon ? <AvatarSvg iconId={avatarIcon} size={22} color="#b0b8ff" /> : <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d0d0f0' }}>{initials}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f0f0f8', fontFamily: 'var(--fm)' }}>{athleteName}</div>
                    <div style={{ fontSize: '0.58rem', color: isAdmin ? '#f87171' : '#4ade80', fontFamily: 'var(--fm)', marginTop: '1px' }}>
                      {isAdmin ? '● Administrator' : '● Aktivan'}
                    </div>
                  </div>
                </div>
              </div>
              {/* Menu items */}
              <div style={{ padding: '6px' }}>
                {[
                  { href: '/profile',   icon: <User size={14}/>,     label: 'Moj profil' },
                  { href: '/training',  icon: <BarChart2 size={14}/>, label: 'Trening'    },
                  { href: '/exercises', icon: <Dumbbell size={14}/>,  label: 'Baza vježbi'},
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                    <button className="appnav-item">{item.icon}<span>{item.label}</span></button>
                  </Link>
                ))}
                {isAdmin && (
                  <Link href="/admin" onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                    <button className="appnav-item appnav-admin">
                      <Shield size={14} color="#f59e0b"/>
                      <span>Admin panel</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.5rem', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '2px 7px', letterSpacing: '0.1em', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px' }}>ADMIN</span>
                    </button>
                  </Link>
                )}
              </div>
              <div style={{ padding: '6px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button onClick={() => { setOpen(false); onLogout() }} className="appnav-item appnav-logout">
                  <LogOut size={14}/><span>Odjava</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes appnavDrop { from { opacity:0; transform:translateY(-6px) scale(0.98) } to { opacity:1; transform:none } }
        @keyframes appnavPing { 0%,100% { transform:scale(1); opacity:0.5 } 50% { transform:scale(2.4); opacity:0 } }
        .appnav-item { width:100%; display:flex; align-items:center; gap:10px; padding:8px 12px; background:transparent; border:none; color:rgba(255,255,255,0.7); font-size:0.82rem; font-family:var(--fm); font-weight:450; cursor:pointer; border-radius:9px; transition:background 0.15s, color 0.15s; text-align:left; letter-spacing:0.01em; }
        .appnav-item:hover { background:rgba(255,255,255,0.07); color:#fff; }
        .appnav-admin:hover { background:rgba(245,158,11,0.08) !important; }
        .appnav-logout { color:rgba(255,80,80,0.7) !important; }
        .appnav-logout:hover { background:rgba(255,60,60,0.08) !important; color:#ff6060 !important; }
        @media (max-width:640px) { .appnav-status { display:none !important; } }
        @media (max-width:520px) { .appnav-name   { display:none !important; } }
      `}</style>
    </nav>
  )
}

// ─── EDITABLE FIELD ───────────────────────────────────────────────
export function EditableField({ value, placeholder, onSave, type = 'text', small = false }: {
  value: string | number | null; placeholder: string; onSave: (v: string) => void; type?: string; small?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setVal(String(value ?? '')) }, [value])
  const commit = () => { setEditing(false); onSave(val) }
  if (editing) return (
    <input ref={inputRef} type={type} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#e0e0e0', padding: small ? '3px 8px' : '5px 10px', fontSize: small ? '0.72rem' : '0.85rem', outline: 'none', width: '100%', fontFamily: 'var(--fm)', borderRadius: '5px', minWidth: '60px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}
    />
  )
  return (
    <span onClick={() => setEditing(true)}
      style={{ cursor: 'text', color: value ? '#e0e0e0' : '#3a3a45', fontSize: small ? '0.72rem' : '0.85rem', fontFamily: 'var(--fm)', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '1px', transition: 'color 0.15s' }}
      title="Klikni za uređivanje">
      {value ?? placeholder}
    </span>
  )
}

// ─── EXERCISE PICKER ──────────────────────────────────────────────
export function ExercisePicker({ exercises, onSelect, onClose }: {
  exercises: Exercise[]; onSelect: (ex: Exercise) => void; onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const cats = Array.from(new Set(exercises.map(e => e.category))).sort()
  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(q.toLowerCase()) && (!cat || e.category === cat)
  )
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.15s ease' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '560px', background: '#09090e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', maxHeight: '78vh', boxShadow: '0 32px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#888', fontFamily: 'var(--fm)' }}>ODABERI VJEŽBU</span>
          <button onClick={onClose} style={{ background: '#1c1c20', border: '1px solid rgba(255,255,255,0.2)', color: '#888', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2a2a35'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1c1c20'; e.currentTarget.style.color = '#888' }}>
            <X size={13} />
          </button>
        </div>
        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.09)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', padding: '9px 14px', borderRadius: '8px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
            <Search size={13} color="#555" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Pretraži vježbe..."
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e0e0e0', fontSize: '0.88rem', width: '100%', fontFamily: 'var(--fm)' }} />
          </div>
        </div>
        {/* Cats */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.09)', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
          <button onClick={() => setCat(null)} className={`cat-btn${!cat ? ' cat-btn-active' : ''}`}>SVE</button>
          {cats.map(c => <button key={c} onClick={() => setCat(c === cat ? null : c)} className={`cat-btn${cat === c ? ' cat-btn-active' : ''}`}>{c}</button>)}
        </div>
        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '0.82rem', fontFamily: 'var(--fm)' }}>Nema rezultata</div>
          ) : filtered.map(ex => (
            <div key={ex.id} onClick={() => { onSelect(ex); onClose() }}
              style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#111113'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div style={{ fontSize: '0.88rem', color: '#e0e0e0', fontWeight: 500, fontFamily: 'var(--fm)' }}>{ex.name}</div>
                <div style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '0.1em', marginTop: '2px' }}>{ex.category}</div>
              </div>
              <Plus size={13} color="#444" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── COMPETITION BANNER ───────────────────────────────────────────
export function CompetitionBanner({ userId }: { userId: string }) {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selected, setSelected]         = useState<Competition | null>(null)
  const [open, setOpen]                 = useState(false)
  const [daysOut, setDaysOut]           = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load upcoming competitions
    supabase.from('competitions')
      .select('id, name, date, location, status')
      .eq('status', 'announced')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .then(({ data }) => setCompetitions((data ?? []) as Competition[]))

    // Load saved selection
    supabase.from('athlete_competition_selection')
      .select('competition_id, competitions(id, name, date, location, status)')
      .eq('athlete_id', userId)
      .single()
      .then(({ data }) => {
        if (data?.competitions) {
          const c = data.competitions as any
          setSelected(c)
          calcDays(c.date)
        }
      })
  }, [userId])

  const calcDays = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    setDaysOut(diff)
  }

  const pick = async (comp: Competition) => {
    setSelected(comp); calcDays(comp.date); setOpen(false)
    await supabase.from('athlete_competition_selection')
      .upsert({ athlete_id: userId, competition_id: comp.id, selected_at: new Date().toISOString() },
               { onConflict: 'athlete_id' })
  }

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  if (competitions.length === 0) return null

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: '20px', animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.025)', boxShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>

        {/* Days out pill */}
        {selected && daysOut !== null && (
          <div style={{ padding: '0 24px', background: daysOut <= 14 ? 'rgba(239,68,68,0.12)' : daysOut <= 30 ? 'rgba(250,204,21,0.08)' : 'rgba(34,197,94,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: '90px' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: daysOut <= 14 ? '#ef4444' : daysOut <= 30 ? '#facc15' : '#22c55e' }}>{daysOut}</div>
            <div style={{ fontSize: '0.46rem', letterSpacing: '0.25em', color: '#666', marginTop: '3px', fontFamily: 'var(--fm)', fontWeight: 700 }}>DAYS OUT</div>
          </div>
        )}

        {/* Picker button */}
        <button onClick={() => setOpen(o => !o)}
          style={{ flex: 1, padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.48rem', letterSpacing: '0.35em', color: '#666', marginBottom: '3px', fontFamily: 'var(--fm)' }}>SLJEDEĆE NATJECANJE</div>
            {selected ? (
              <>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f0f0f0', fontFamily: 'var(--fm)' }}>{selected.name}</div>
                <div style={{ fontSize: '0.58rem', color: '#777', marginTop: '2px' }}>{selected.date}{selected.location ? ` · ${selected.location}` : ''}</div>
              </>
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#555', fontFamily: 'var(--fm)' }}>Odaberi natjecanje...</div>
            )}
          </div>
          <ChevronDown size={13} color="#555" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', overflow: 'hidden', animation: 'dropDown 0.18s ease' }}>
          {competitions.map((comp, i) => (
            <button key={comp.id} onClick={() => pick(comp)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 18px', background: selected?.id === comp.id ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', borderBottom: i < competitions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = selected?.id === comp.id ? 'rgba(255,255,255,0.05)' : 'transparent'}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{comp.name}</div>
                <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '2px' }}>{comp.date}{comp.location ? ` · ${comp.location}` : ''}</div>
              </div>
              {selected?.id === comp.id && <Check size={12} color="#22c55e" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SET LOG ROW — one box per set ─────────────────────────────────
// Admin sees planned data. Lifter gets N input boxes (one per set).
export function SetLogSection({ we, userId, isAdmin, onAggregateUpdate, forceComplete }: {
  we: WorkoutExercise; userId: string; isAdmin: boolean
  onAggregateUpdate: (data: Partial<WorkoutExercise>) => void
  forceComplete?: boolean | null
}) {
  const plannedSets = we.planned_sets ?? 3
  const [logs, setLogs] = useState<SetLog[]>([])
  const [saving, setSaving] = useState(false)

  // Initialise logs array — one entry per planned set
  useEffect(() => {
    if (isAdmin) return
    supabase.from('set_logs')
      .select('set_number, weight_kg, reps, rpe, completed')
      .eq('workout_exercise_id', we.id)
      .eq('athlete_id', userId)
      .order('set_number')
      .then(({ data }) => {
        const existing = (data ?? []) as SetLog[]
        // Fill in missing sets
        const filled: SetLog[] = Array.from({ length: plannedSets }, (_, i) => {
          const found = existing.find(s => s.set_number === i + 1)
          return found ?? { set_number: i + 1, weight_kg: null, reps: null, rpe: null, completed: false }
        })
        setLogs(filled)
      })
  }, [we.id, plannedSets, isAdmin])

  // React to external forceComplete (exercise marked done/undone from row)
  useEffect(() => {
    if (forceComplete === null || forceComplete === undefined || isAdmin || logs.length === 0) return
    const newLogs = logs.map(l => ({ ...l, completed: forceComplete }))
    setLogs(newLogs)
    Promise.all(newLogs.map(log =>
      supabase.from('set_logs').upsert({
        workout_exercise_id: we.id, athlete_id: userId,
        set_number: log.set_number, completed: forceComplete,
      }, { onConflict: 'workout_exercise_id,set_number' })
    ))
  }, [forceComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveSet = async (setNum: number, field: keyof SetLog, raw: string) => {
    const val = (field === 'weight_kg' || field === 'rpe') ? (raw ? Number(raw) : null) : (raw || null)
    setSaving(true)

    const updated = logs.map(s => s.set_number === setNum ? { ...s, [field]: val } : s)
    setLogs(updated)

    await supabase.from('set_logs').upsert({
      workout_exercise_id: we.id,
      athlete_id: userId,
      set_number: setNum,
      [field]: val,
    }, { onConflict: 'workout_exercise_id,set_number' })

    // Update aggregate actual_ on workout_exercises so progress tracking still works
    const completed = updated.filter(s => s.weight_kg || s.reps)
    if (completed.length > 0) {
      const avgKg = completed.reduce((s, x) => s + (x.weight_kg ?? 0), 0) / completed.length
      const lastRpe = completed[completed.length - 1].rpe
      onAggregateUpdate({ actual_weight_kg: avgKg, actual_rpe: lastRpe })
    }
    setSaving(false)
  }

  const markSetDone = async (setNum: number) => {
    const s = logs.find(l => l.set_number === setNum)
    if (!s) return
    const nowDone = !s.completed
    const newLogs = logs.map(l => l.set_number === setNum ? { ...l, completed: nowDone } : l)
    setLogs(newLogs)
    await supabase.from('set_logs').upsert({
      workout_exercise_id: we.id, athlete_id: userId,
      set_number: setNum, completed: nowDone,
    }, { onConflict: 'workout_exercise_id,set_number' })
    // Auto-complete exercise when all sets done (or uncheck if any undone)
    const allDone = newLogs.length > 0 && newLogs.every(l => l.completed)
    onAggregateUpdate({ completed: allDone })
  }

  if (isAdmin) {
    // Admin sees a summary of planned sets
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '8px 0 0' }}>
        {Array.from({ length: plannedSets }, (_, i) => (
          <div key={i} style={{ padding: '4px 10px', background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', fontSize: '0.62rem', color: '#888', fontFamily: 'var(--fm)' }}>
            Set {i + 1} · {we.planned_reps ?? '?'} reps · {we.planned_weight_kg ? `${we.planned_weight_kg}kg` : '—'}
          </div>
        ))}
      </div>
    )
  }

  // Lifter: one input group per set
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 0 4px' }}>
      {saving && <div style={{ fontSize: '0.48rem', color: '#555', letterSpacing: '0.2em', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> SNIMANJE...</div>}
      {logs.map((log, i) => (
        <div key={i} className="set-log-row" style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr 32px', gap: '6px', alignItems: 'center', padding: '8px 10px', background: log.completed ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${log.completed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '7px', transition: 'all 0.2s' }}>
          {/* Set number */}
          <div style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 800, color: log.completed ? '#22c55e' : '#555', fontFamily: 'var(--fd)' }}>S{log.set_number}</div>
          {/* KG */}
          <div>
            <div style={{ fontSize: '0.44rem', color: '#6b8cff', letterSpacing: '0.2em', marginBottom: '3px' }}>KG</div>
            <StepInput
              value={log.weight_kg}
              onChange={v => saveSet(log.set_number, 'weight_kg', v)}
              placeholder={we.planned_weight_kg ? String(we.planned_weight_kg) : '—'}
              step={2.5}
              color="#6b8cff"
            />
          </div>
          {/* Reps */}
          <div>
            <div style={{ fontSize: '0.44rem', color: '#aaa', letterSpacing: '0.2em', marginBottom: '3px' }}>PONOV</div>
            <input
              type="text" value={log.reps ?? ''}
              onChange={e => saveSet(log.set_number, 'reps', e.target.value)}
              placeholder={we.planned_reps ?? '—'}
              style={{ width: '100%', background: '#0a0a12', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e0e0', padding: '5px 8px', fontSize: '0.82rem', outline: 'none', borderRadius: '5px', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          {/* RPE */}
          <div className="set-log-rpe">
            <div style={{ fontSize: '0.44rem', color: '#facc15', letterSpacing: '0.2em', marginBottom: '3px' }}>
              RPE{(we.target_rpe ?? we.planned_rpe) ? ` (cilj: ${we.target_rpe ?? we.planned_rpe})` : ''}
            </div>
            <input
              type="number" step="0.5" min="1" max="10" value={log.rpe ?? ''}
              onChange={e => saveSet(log.set_number, 'rpe', e.target.value)}
              placeholder="—"
              style={{ width: '100%', background: '#0a0a12', border: '1px solid rgba(255,255,255,0.1)', color: log.rpe && (we.target_rpe ?? we.planned_rpe) ? (Number(log.rpe) - Number(we.target_rpe ?? we.planned_rpe) > 1 ? '#f87171' : Number(log.rpe) - Number(we.target_rpe ?? we.planned_rpe) > 0 ? '#facc15' : '#4ade80') : '#e0e0e0', padding: '5px 8px', fontSize: '0.82rem', outline: 'none', borderRadius: '5px', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(250,204,21,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          {/* Done toggle */}
          <button onClick={() => markSetDone(log.set_number)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: log.completed ? '#22c55e' : '#444', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
            title={log.completed ? 'Poništi' : 'Označi kao odrađeno'}>
            <Check size={14} strokeWidth={log.completed ? 3 : 1.5} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── EXERCISE ROW ─────────────────────────────────────────────────
// isAdmin=true  → edits planned_ + target_rpe + coach_note + delete
// isAdmin=false → reads planned_, edits actual_ + actual_note + completed
export function ExerciseRow({ we, isAdmin, userId, onUpdate, onDelete }: {
  we: WorkoutExercise; isAdmin: boolean; userId: string
  onUpdate: (id: string, data: Partial<WorkoutExercise>) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [forceComplete, setForceComplete] = useState<boolean | null>(null)
  const save = (field: keyof WorkoutExercise, val: string, isNum = false) =>
    onUpdate(we.id, { [field]: isNum ? (val ? Number(val) : null) : (val || null) })

  // ── RPE comparison helper ───────────────────────────────────────
  const rpeColor = (actual: number | null, target: number | null) => {
    if (!actual || !target) return '#e0e0e0'
    const diff = actual - target
    if (diff <= 0) return '#4ade80'       // at or below target → green
    if (diff === 1) return '#facc15'      // 1 over → yellow
    return '#f87171'                      // 2+ over → red
  }

  return (
    <div className="ex-row-wrap">
      {/* ── Main row ── */}
      <div className="ex-row-main" style={{ display: 'grid', gridTemplateColumns: '28px 1fr 64px 72px 80px 64px 28px', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Grip (admin only) */}
        <div className="ex-col-grip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '0 4px' }}>
          {isAdmin
            ? <GripVertical size={12} color="#555" style={{ cursor: 'grab' }} />
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={we.completed ? '#4ade80' : '#555'} strokeWidth="2.5">
                {we.completed
                  ? <><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></>
                  : <circle cx="12" cy="12" r="8"/>}
              </svg>
          }
        </div>

        {/* Exercise name */}
        <div style={{ padding: '13px 14px', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f0f0f0', fontFamily: 'var(--fm)' }}>{we.exercise?.name ?? '—'}</span>
          </div>
          {/* Coach note — always visible to lifter as instruction */}
          {we.coach_note && (
            <div style={{ fontSize: '0.62rem', color: '#f59e0b', letterSpacing: '0.04em', paddingLeft: '18px', lineHeight: 1.4 }}>
              ↳ {we.coach_note}
            </div>
          )}
        </div>

        {/* SETS */}
        <div className="ex-col-sets" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ padding: '5px 8px 3px', fontSize: '0.44rem', color: '#666', letterSpacing: '0.2em', textAlign: 'center' }}>SERI</div>
          <div style={{ padding: '4px 8px 10px', textAlign: 'center' }}>
            {isAdmin
              ? <EditableField value={we.planned_sets} placeholder="3" type="number" small onSave={v => save('planned_sets', v, true)} />
              : <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{we.planned_sets ?? '—'}</span>
            }
          </div>
        </div>

        {/* REPS */}
        <div className="ex-col-reps" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ padding: '5px 8px 3px', fontSize: '0.44rem', color: '#666', letterSpacing: '0.2em', textAlign: 'center' }}>PONOV</div>
          <div style={{ padding: '4px 8px 10px', textAlign: 'center' }}>
            {isAdmin
              ? <EditableField value={we.planned_reps} placeholder="5" small onSave={v => save('planned_reps', v)} />
              : <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{we.planned_reps ?? '—'}</span>
            }
          </div>
        </div>

        {/* KG — lifter fills actual, admin fills planned */}
        <div className="ex-col-kg" style={{ borderRight: '1px solid rgba(255,255,255,0.08)', background: isAdmin ? 'transparent' : 'rgba(56,100,255,0.04)' }}>
          <div style={{ padding: '5px 8px 3px', fontSize: '0.44rem', color: isAdmin ? '#666' : '#6b8cff', letterSpacing: '0.2em', textAlign: 'center' }}>
            {isAdmin ? 'KG PLAN' : 'KG ODIG'}
          </div>
          <div style={{ padding: '4px 8px 10px', textAlign: 'center' }}>
            {isAdmin
              ? <EditableField value={we.planned_weight_kg} placeholder="—" type="number" small onSave={v => save('planned_weight_kg', v, true)} />
              : <>
                  {we.planned_weight_kg && (
                    <div style={{ fontSize: '0.52rem', color: '#555', marginBottom: '3px' }}>{we.planned_weight_kg}kg plan</div>
                  )}
                  <EditableField value={we.actual_weight_kg} placeholder="upiši" type="number" small onSave={v => save('actual_weight_kg', v, true)} />
                </>
            }
          </div>
        </div>

        {/* RPE — admin sets target, lifter fills actual */}
        <div className="ex-col-rpe" style={{ borderRight: '1px solid rgba(255,255,255,0.08)', background: isAdmin ? 'transparent' : 'rgba(250,204,21,0.04)' }}>
          <div style={{ padding: '5px 8px 3px', fontSize: '0.44rem', color: isAdmin ? '#666' : '#facc15', letterSpacing: '0.2em', textAlign: 'center' }}>
            {isAdmin ? 'RPE CILJ' : 'RPE ODIJ'}
          </div>
          <div style={{ padding: '4px 8px 10px', textAlign: 'center' }}>
            {isAdmin
              ? <EditableField value={we.target_rpe ?? we.planned_rpe} placeholder="—" type="number" small onSave={v => save('target_rpe', v, true)} />
              : <>
                  {we.target_rpe && (
                    <div style={{ fontSize: '0.52rem', color: '#888', marginBottom: '3px' }}>cilj: {we.target_rpe}</div>
                  )}
                  <div style={{ color: rpeColor(we.actual_rpe, we.target_rpe ?? we.planned_rpe) }}>
                    <EditableField value={we.actual_rpe} placeholder="upiši" type="number" small onSave={v => save('actual_rpe', v, true)} />
                  </div>
                </>
            }
          </div>
        </div>

        {/* Delete (admin) or complete toggle (lifter) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isAdmin
            ? <button onClick={() => onDelete(we.id)} className="icon-btn-danger"><Trash2 size={11} /></button>
            : <button
                onClick={() => { const nd = !we.completed; onUpdate(we.id, { completed: nd }); setForceComplete(nd) }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: we.completed ? '#4ade80' : '#444', padding: '4px', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={we.completed ? 'Označi kao neodrađeno' : 'Označi kao odrađeno'}
              >
                <Check size={13} />
              </button>
          }
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div style={{ background: '#080810', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {isAdmin ? (
            /* Admin: tempo, odmor, coach_note */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0' }}>
              {[
                { label: 'TEMPO', key: 'planned_tempo' as keyof WorkoutExercise, ph: '3010' },
                { label: 'ODMOR (sek)', key: 'planned_rest_seconds' as keyof WorkoutExercise, ph: '90', type: 'number' },
                { label: 'BILJEŠKA TRENERA', key: 'coach_note' as keyof WorkoutExercise, ph: 'Uputa za lifera...' },
              ].map((f, fi) => (
                <div key={String(f.key)} style={{ padding: '10px 14px', borderRight: fi < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <div style={{ fontSize: '0.46rem', color: '#666', letterSpacing: '0.2em', marginBottom: '5px' }}>{f.label}</div>
                  <EditableField value={we[f.key] as string | number | null} placeholder={f.ph} type={f.type}
                    onSave={v => save(f.key, v)} />
                </div>
              ))}
            </div>
          ) : (
            /* Lifter: planned info (read-only) + actual_note */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0' }}>
              <div style={{ padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.46rem', color: '#666', letterSpacing: '0.2em', marginBottom: '5px' }}>TEMPO / ODMOR</div>
                <div style={{ fontSize: '0.78rem', color: '#aaa' }}>
                  {we.planned_tempo || '—'} · {we.planned_rest_seconds ? `${we.planned_rest_seconds}s` : '—'}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.46rem', color: '#facc15', letterSpacing: '0.2em', marginBottom: '5px' }}>BILJEŠKA TRENERA</div>
                <div style={{ fontSize: '0.78rem', color: '#facc15', lineHeight: 1.5 }}>
                  {we.coach_note || <span style={{ color: '#444' }}>—</span>}
                </div>
              </div>
              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: '0.46rem', color: '#6b8cff', letterSpacing: '0.2em', marginBottom: '5px' }}>MOJA BILJEŠKA</div>
                <EditableField value={we.actual_note} placeholder="Upiši dojam..." onSave={v => save('actual_note', v)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Set log section — shown always (below main row) */}
      <div style={{ padding: '0 16px 0 44px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <SetLogSection
          we={we} userId={userId} isAdmin={isAdmin}
          onAggregateUpdate={data => onUpdate(we.id, data)}
          forceComplete={forceComplete}
        />
      </div>

      {/* Expand toggle */}
      <button onClick={() => setExpanded(!expanded)}
        style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '4px 44px', cursor: 'pointer', color: '#555', fontSize: '0.48rem', letterSpacing: '0.18em', fontFamily: 'var(--fm)', textAlign: 'left', transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#888'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}>
        {expanded ? '▲ SAKRIJ' : '▼ DETALJI'}
      </button>
    </div>
  )
}

// ─── WORKOUT CARD — editorial style ──────────────────────────────
export function WorkoutCard({ workout, exercises, isAdmin, userId, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }: {
  workout: Workout; exercises: Exercise[]; isAdmin: boolean; userId: string
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void
  onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void
  onDeleteExercise: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const exCount = workout.workout_exercises?.length ?? 0

  const handleUpdateExercise = (id: string, data: Partial<WorkoutExercise>) => {
    onUpdateExercise(id, data)
    if ('completed' in data) {
      const updatedExercises = (workout.workout_exercises ?? []).map(we =>
        we.id === id ? { ...we, ...data } : we
      )
      const allDone = updatedExercises.length > 0 && updatedExercises.every(we => we.completed)
      if (allDone && !workout.completed) {
        onUpdateWorkout(workout.id, { completed: true })
      } else if (!allDone && workout.completed) {
        onUpdateWorkout(workout.id, { completed: false })
      }
    }
  }

  return (
    <>
      {/* Outer card: sharp border, white/dark editorial split */}
      <div className="workout-card" style={{ border: '1px solid rgba(255,255,255,0.15)', marginBottom: '10px', overflow: 'hidden', borderRadius: '10px', boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)' }}>

        {/* ── Day header — light editorial strip ── */}
        <div
          style={{ background: workout.completed ? '#0c1a10' : 'rgba(255,255,255,0.07)', borderBottom: open ? '1px solid rgba(255,255,255,0.12)' : 'none', cursor: 'pointer', padding: '0' }}
          onClick={() => setOpen(!open)}>
          {/* Top accent line */}
          <div style={{ height: '3px', background: workout.completed ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #2a2a3a, #1a1a28)', boxShadow: workout.completed ? '0 0 10px rgba(34,197,94,0.3)' : 'none', transition: 'all 0.3s' }} />

          <div className='workout-header-inner' style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Day label pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={workout.completed ? '#22c55e' : '#4a4a6a'} strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: workout.completed ? '#4ade80' : '#9090b0', fontFamily: 'var(--fm)', letterSpacing: '0.02em' }}>
                {formatWorkoutDate(workout.workout_date)}
              </div>
            </div>

            {/* Workout name — large */}
            <div style={{ flex: 1 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f0f0f0', fontFamily: 'var(--fd)', letterSpacing: '0.01em', textTransform: 'uppercase' }}>
                <EditableField value={workout.day_name} placeholder="DAN TRENINGA" onSave={v => onUpdateWorkout(workout.id, { day_name: v })} />
              </div>
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              {/* Ex count badge */}
              {exCount > 0 && (
                <div style={{ fontSize: '0.58rem', color: '#bbb', background: '#0e0e16', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.1em' }}>
                  {exCount} vj.
                </div>
              )}
              {/* Completed toggle */}
              <div onClick={e => {
                e.stopPropagation()
                const newDone = !workout.completed
                onUpdateWorkout(workout.id, { completed: newDone })
                if (newDone) {
                  workout.workout_exercises?.forEach(we => onUpdateExercise(we.id, { completed: true }))
                }
              }}
                className={`done-badge${workout.completed ? ' done-badge-active' : ''}`}>
                {workout.completed ? <Check size={10} color="#22c55e" /> : <div style={{ width: '9px', height: '9px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '2px' }} />}
                <span>{workout.completed ? 'GOTOVO' : 'ODRADITI'}</span>
              </div>
              {/* Delete */}
              <button onClick={e => { e.stopPropagation(); onDeleteWorkout(workout.id) }} className="icon-btn-danger">
                <Trash2 size={11} />
              </button>
              {/* Expand arrow */}
              <div style={{ color: '#444', transition: 'transform 0.25s', transform: open ? 'rotate(90deg)' : 'none' }}>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Exercise table — dark with clean grid ── */}
        {open && (
          <div style={{ background: '#09090e', animation: 'fadeUp 0.2s ease' }}>
            {/* Table header row */}
            {exCount > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 80px 80px 64px 28px', borderBottom: '2px solid rgba(255,255,255,0.1)', background: '#0d0d14' }}>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }} />
                {['VJEŽBA', 'SERI', 'PONOV', isAdmin ? 'KG PLAN' : 'KG', isAdmin ? 'RPE CILJ' : 'RPE', ''].map((h, i) => (
                  <div key={i} style={{ padding: '8px 16px', fontSize: '0.48rem', color: i === 3 && !isAdmin ? '#6b8cff' : i === 4 && !isAdmin ? '#facc15' : '#666', letterSpacing: '0.25em', fontWeight: 700, fontFamily: 'var(--fm)', textAlign: i > 0 ? 'center' : 'left', borderRight: i < 5 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>{h}</div>
                ))}
              </div>
            )}

            {/* Exercises */}
            {workout.workout_exercises?.map(we => (
              <ExerciseRow key={we.id} we={we} isAdmin={isAdmin} userId={userId} onUpdate={handleUpdateExercise} onDelete={onDeleteExercise} />
            ))}

            {/* Add vježbu + bilješka footer */}
            <div className="ex-table-footer" style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              {isAdmin && (
                <button onClick={() => setShowPicker(true)} className="add-btn" style={{ flex: 'none' }}>
                  <Plus size={11} /> DODAJ VJEŽBU
                </button>
              )}
              <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
                <div style={{ fontSize: '0.48rem', color: '#444', letterSpacing: '0.22em', marginBottom: '4px' }}>BILJEŠKA DANA</div>
                <EditableField value={workout.notes} placeholder="Dodaj bilješku..." onSave={v => onUpdateWorkout(workout.id, { notes: v || null })} />
              </div>
            </div>
          </div>
        )}
      </div>
      {showPicker && <ExercisePicker exercises={exercises} onSelect={ex => onAddExercise(workout.id, ex)} onClose={() => setShowPicker(false)} />}
    </>
  )
}

// ─── WEEK PANEL ───────────────────────────────────────────────────
export function WeekPanel({ week, exercises, isAdmin, userId, onDeleteWeek, onUpdateWeek, onAddWorkout, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }: {
  week: Week; exercises: Exercise[]; isAdmin: boolean; userId: string
  onDeleteWeek: (id: string) => void; onUpdateWeek: (id: string, data: Partial<Week>) => void
  onAddWorkout: (weekId: string) => void
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void; onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void; onDeleteExercise: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const done = week.workouts?.filter(w => w.completed).length ?? 0
  const total = week.workouts?.length ?? 0
  const pct = total > 0 ? (done / total) * 100 : 0

  return (
    <div style={{ marginBottom: '20px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)' }}>

      {/* ── Week header — editorial black band ── */}
      <div style={{ background: 'linear-gradient(160deg, #0f0f18 0%, #0a0a12 100%)', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
        onClick={() => setOpen(!open)}>

        {/* Top: large week label row */}
        <div style={{ padding: 'clamp(14px,3vw,20px) clamp(16px,4vw,24px) 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            {/* Giant W number */}
            <span style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem,4vw,3.2rem)', fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.04em' }}>
              W{week.week_number}
            </span>
            <div>
              <div style={{ fontSize: '0.88rem', color: '#aaa', fontWeight: 500, fontFamily: 'var(--fm)', letterSpacing: '0.05em' }}>
                TJEDAN {week.week_number}
              </div>
              <div style={{ fontSize: '0.58rem', color: '#777', letterSpacing: '0.1em', marginTop: '1px' }}>
                {week.start_date} — {week.end_date}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '4px' }}>
            {/* Progress pill */}
            {total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f0f18', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: '20px' }}>
                <div style={{ width: '48px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)', transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: '0.56rem', color: '#aaa', fontFamily: 'var(--fm)', fontWeight: 700 }}>{done}/{total}</span>
              </div>
            )}
            <div style={{ color: '#888', transition: 'transform 0.25s, color 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
              <ChevronRight size={14} />
            </div>
            {isAdmin && (
              <button onClick={e => { e.stopPropagation(); onDeleteWeek(week.id) }} className="icon-btn-danger">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Day grid overview — like the reference screenshot */}
        {total > 0 && (
          <div className="day-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(total, 7)}, 1fr)`, margin: '16px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {week.workouts?.map((w, i) => (
              <div key={w.id} style={{ padding: '10px 14px', borderRight: i < total - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none', background: w.completed ? '#0b1a10' : '#0c0c12', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.5rem', letterSpacing: '0.2em', color: '#888', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                    DAN {i + 1}
                  </span>
                  {w.completed && (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={8} color="#22c55e" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: w.completed ? '#4ade80' : '#e0e0e0', fontFamily: 'var(--fm)', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                  {w.day_name}
                </div>
                {/* Bottom accent */}
                <div style={{ height: '2px', marginTop: '8px', background: w.completed ? '#22c55e' : 'rgba(255,255,255,0.1)', borderRadius: '1px', boxShadow: w.completed ? '0 0 6px rgba(34,197,94,0.4)' : 'none' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Workout cards ── */}
      {open && (
        <div style={{ padding: '16px', background: '#0b0b12' }}>
          {week.workouts?.map(w => (
            <WorkoutCard key={w.id} workout={w} exercises={exercises} isAdmin={isAdmin} userId={userId}
              onUpdateWorkout={onUpdateWorkout} onDeleteWorkout={onDeleteWorkout}
              onAddExercise={onAddExercise} onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise} />
          ))}
          {isAdmin && (
            <button onClick={() => onAddWorkout(week.id)} className="add-btn">
              <Plus size={11} /> DODAJ DAN TRENINGA
            </button>
          )}
        </div>
      )}
    </div>
  )
}