'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check, Search,
  GripVertical, Loader2, LogOut, Lock, TrendingDown,
  User, Shield, X, Dumbbell, BarChart2, MessageSquare, Copy, CalendarDays, ArrowUp, ArrowDown,
  Flame, Zap, Rocket, Gauge, Activity, Trophy, Medal, Crown, Star, Award, Gem,
  Target, Crosshair, Sword, Compass, Mountain, Anchor, Skull, Sparkles, Brain,
  Timer, Ghost, Forklift, Drama, Cat, Bird, PawPrint, Clover, Spade,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Exercise, WorkoutExercise, Workout, Week, SetLog, Competition, SetPlanRow, SetMode } from './types'
import { computeWeights, defaultRow } from './training-setplan'

const supabase = createClient()

// ─── CONFIRM DIALOG ───────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}>
      <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '28px 32px', maxWidth: '340px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>
        <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', lineHeight: 1.5, textAlign: 'center', fontFamily: 'var(--fm)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '9px 0', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--fm)', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}>
            Odustani
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '9px 0', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.9)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--fm)', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.9)' }}>
            Obriši
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AVATAR ICONS ─────────────────────────────────────────────────
export const AVATARS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'dumbbell',  label: 'Teg',       icon: Dumbbell  },
  { id: 'flame',     label: 'Plamen',    icon: Flame     },
  { id: 'zap',       label: 'Munja',     icon: Zap       },
  { id: 'rocket',    label: 'Raketa',    icon: Rocket    },
  { id: 'gauge',     label: 'Mjerač',    icon: Gauge     },
  { id: 'activity',  label: 'Puls',      icon: Activity  },
  { id: 'trophy',    label: 'Trofej',    icon: Trophy    },
  { id: 'medal',     label: 'Medalja',   icon: Medal     },
  { id: 'crown',     label: 'Kruna',     icon: Crown     },
  { id: 'star',      label: 'Zvijezda',  icon: Star      },
  { id: 'award',     label: 'Nagrada',   icon: Award     },
  { id: 'gem',       label: 'Dijamant',  icon: Gem       },
  { id: 'target',    label: 'Meta',      icon: Target    },
  { id: 'crosshair', label: 'Nišan',     icon: Crosshair },
  { id: 'shield',    label: 'Štit',      icon: Shield    },
  { id: 'sword',     label: 'Mač',       icon: Sword     },
  { id: 'compass',   label: 'Kompas',    icon: Compass   },
  { id: 'mountain',  label: 'Planina',   icon: Mountain  },
  { id: 'anchor',    label: 'Sidro',     icon: Anchor    },
  { id: 'skull',     label: 'Lubanja',   icon: Skull     },
  { id: 'ghost',     label: 'Duh',       icon: Ghost     },
  { id: 'forklift',  label: 'Viličar',   icon: Forklift  },
  { id: 'drama',     label: 'Joker',     icon: Drama     },
  { id: 'cat',       label: 'Mačka',     icon: Cat       },
  { id: 'bird',      label: 'Orao',      icon: Bird      },
  { id: 'paw',       label: 'Lav',       icon: PawPrint  },
  { id: 'brain',     label: 'Mozak',     icon: Brain     },
  { id: 'sparkles',  label: 'Iskrice',   icon: Sparkles  },
  { id: 'clover',    label: 'Djetelina', icon: Clover    },
  { id: 'spade',     label: 'Pik',       icon: Spade     },
  { id: 'timer',     label: 'Tajmer',    icon: Timer     },
]

export function AvatarSvg({ iconId, size = 32, color = 'currentColor' }: { iconId: string; size?: number; color?: string }) {
  const avatar = AVATARS.find(a => a.id === iconId) ?? AVATARS[0]
  const Icon = avatar.icon
  return <Icon size={size} color={color} strokeWidth={1.5} style={{ flexShrink: 0 }} />
}


// ─── LEGACY NAV (unused — kept for TS to not error if imported elsewhere) ───
// @ts-ignore
function _TrainingNavDeprecated({ athleteName, isAdmin, onLogout, avatarIcon }: {
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
        <div className="nav-logo" style={{ height: '36px', opacity: 0.95, transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.25s ease' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.filter = 'drop-shadow(0 0 12px rgba(255,255,255,0.7)) drop-shadow(0 0 28px rgba(255,255,255,0.35))' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none' }}>
          <Image src="/slike/logopng.png" alt="LWL UP" width={49} height={36} style={{ height: '36px', width: 'auto' }} />
        </div>
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
                      <Shield size={14} color="#ef4444"/>
                      <span>Admin panel</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.5rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '2px 7px', letterSpacing: '0.1em', border: '1px solid rgba(239,68,68,0.28)', borderRadius: '4px' }}>ADMIN</span>
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
export function AppNav({ athleteName, isAdmin, role, onLogout, avatarIcon, userId }: {
  athleteName: string; isAdmin: boolean; role?: 'admin' | 'trener'; onLogout: () => void; avatarIcon?: string; userId?: string
}) {
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [notifs, setNotifs]   = useState<{id:string;message:string;sender_id:string;read:boolean;created_at:string}[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const unread = notifs.filter(n => !n.read).length

  useEffect(() => {
    if (!userId) return
    // Initial load
    supabase.from('notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setNotifs(data ?? []))
    // Realtime subscription
    const channel = supabase.channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        payload => setNotifs(prev => [payload.new as any, ...prev]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAllRead = async () => {
    const ids = notifs.filter(n => !n.read).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ read: true }).in('id', ids)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const deleteAllNotifs = async () => {
    const ids = notifs.map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').delete().in('id', ids)
    setNotifs([])
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    if (showNotifs) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])
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
        <div className="nav-logo" style={{ height: '36px', opacity: 0.95, transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.25s ease' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.filter = 'drop-shadow(0 0 12px rgba(255,255,255,0.7)) drop-shadow(0 0 28px rgba(255,255,255,0.35))' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none' }}>
          <Image src="/slike/logopng.png" alt="LWL UP" width={49} height={36} style={{ height: '36px', width: 'auto' }} />
        </div>
      </Link>

      {/* Push avatar to right */}
      <div style={{ flex: 1 }} />

      {/* Right — status pill + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

        {/* Status pill */}
        <div className="appnav-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: role === 'trener' ? 'rgba(245,158,11,0.08)' : isAdmin ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${role === 'trener' ? 'rgba(245,158,11,0.22)' : isAdmin ? 'rgba(239,68,68,0.22)' : 'rgba(34,197,94,0.18)'}`, borderRadius: '20px' }}>
          <div style={{ position: 'relative', width: '6px', height: '6px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: role === 'trener' ? '#f59e0b' : isAdmin ? '#ef4444' : '#22c55e', borderRadius: '50%', boxShadow: `0 0 5px ${role === 'trener' ? '#f59e0b' : isAdmin ? '#ef4444' : '#22c55e'}` }} />
            <div style={{ position: 'absolute', inset: '-3px', background: role === 'trener' ? 'rgba(245,158,11,0.2)' : isAdmin ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', borderRadius: '50%', animation: 'appnavPing 2.4s ease-in-out infinite' }} />
          </div>
          <span style={{ fontSize: '0.62rem', color: role === 'trener' ? '#fbbf24' : isAdmin ? '#f87171' : '#4ade80', fontWeight: 600, fontFamily: 'var(--fm)', letterSpacing: '0.04em' }}>{role === 'trener' ? 'Trener' : isAdmin ? 'Admin' : 'Aktivan'}</span>
        </div>

        {/* Notification bell */}
        {!!userId && (
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifs(o => !o); if (!showNotifs) markAllRead() }}
              style={{ position: 'relative', background: unread > 0 ? 'rgba(251,191,36,0.1)' : 'transparent', border: `1px solid ${unread > 0 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '7px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: unread > 0 ? '#fbbf24' : 'rgba(255,255,255,0.45)', transition: 'all 0.2s' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unread > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#fbbf24', color: '#000', fontSize: '0.45rem', fontWeight: 800, fontFamily: 'var(--fm)', borderRadius: '10px', padding: '1px 5px', minWidth: '16px', textAlign: 'center' }}>{unread}</span>
              )}
            </button>
            {showNotifs && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '300px', background: '#111111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.9)', zIndex: 300, overflow: 'hidden', animation: 'appnavDrop 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#fbbf24', fontFamily: 'var(--fm)', fontWeight: 700 }}>{isAdmin ? 'OBAVIJESTI' : 'OD TRENERA'}</span>
                  {notifs.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {notifs.some(n => !n.read) && <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.52rem', fontFamily: 'var(--fm)', cursor: 'pointer', letterSpacing: '0.08em', padding: 0 }}>označi sve</button>}
                      <button onClick={deleteAllNotifs} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', fontSize: '0.52rem', fontFamily: 'var(--fm)', cursor: 'pointer', letterSpacing: '0.08em', padding: 0 }}>briši sve</button>
                    </div>
                  )}
                </div>
                <div style={{ maxHeight: '320px', overflowY: 'auto' as const }}>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', fontFamily: 'var(--fm)' }}>Nema novih obavijesti</div>
                  ) : notifs.map(n => (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.read ? 'transparent' : 'rgba(251,191,36,0.04)', transition: 'background 0.2s' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', color: n.read ? 'rgba(255,255,255,0.5)' : '#f0f0f5', fontFamily: 'var(--fm)', lineHeight: 1.5 }}>{n.message}</div>
                        <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)', marginTop: '4px' }}>{new Date(n.created_at).toLocaleString('hr-HR')}</div>
                      </div>
                      <button onClick={() => deleteNotif(n.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', cursor: 'pointer', padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.18)' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Avatar / dropdown */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button onClick={() => setOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '5px 10px 5px 5px', background: open ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
            onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: '#f0f0f0', fontFamily: 'var(--fm)', flexShrink: 0 }}>
              {avatarIcon ? <AvatarSvg iconId={avatarIcon} size={18} color="rgba(255,255,255,0.85)" /> : initials}
            </div>
            <span className="appnav-name" style={{ fontSize: '0.78rem', fontWeight: 500, color: '#f0f0f0', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' as const }}>{athleteName?.split(' ')[0] || ''}</span>
            <ChevronDown size={11} color="rgba(255,255,255,0.4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s', flexShrink: 0 }} />
          </button>

          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px', background: '#111111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)', zIndex: 300, animation: 'appnavDrop 0.2s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarIcon ? <AvatarSvg iconId={avatarIcon} size={22} color="rgba(255,255,255,0.85)" /> : <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f0f0f0' }}>{initials}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f0f0f8', fontFamily: 'var(--fm)' }}>{athleteName}</div>
                    <div style={{ fontSize: '0.58rem', color: role === 'trener' ? '#fbbf24' : isAdmin ? '#f87171' : '#4ade80', fontFamily: 'var(--fm)', marginTop: '1px' }}>
                      {role === 'trener' ? '● Trener' : isAdmin ? '● Administrator' : '● Aktivan'}
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
                  <Link href={role === 'trener' ? '/trainer' : '/admin'} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                    <button className="appnav-item appnav-admin">
                      <Shield size={14} color={role === 'trener' ? '#f59e0b' : '#ef4444'}/>
                      <span>{role === 'trener' ? 'Trener panel' : 'Admin panel'}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.5rem', background: role === 'trener' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: role === 'trener' ? '#f59e0b' : '#ef4444', padding: '2px 7px', letterSpacing: '0.1em', border: `1px solid ${role === 'trener' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.28)'}`, borderRadius: '4px' }}>{role === 'trener' ? 'TRENER' : 'ADMIN'}</span>
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
  const [, setDaysOut]                  = useState<number | null>(null)
  const [countdown, setCountdown]       = useState({ d: 0, h: 0, m: 0, s: 0 })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selected) return
    const update = () => {
      const diff = new Date(selected.date).getTime() - Date.now()
      if (diff <= 0) { setCountdown({ d: 0, h: 0, m: 0, s: 0 }); return }
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [selected])

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '3px solid #ef3535', borderRadius: '20px', overflow: 'hidden', background: '#111111', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', padding: '20px 24px', flexWrap: 'wrap', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '-30px', top: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,53,53,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Left: label + name + date + picker */}
        <button onClick={() => setOpen(o => !o)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '160px', padding: 0, position: 'relative' }}>
          <div style={{ fontSize: '0.48rem', letterSpacing: '0.38em', color: 'rgba(239,53,53,0.7)', fontFamily: 'var(--fm)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '1.5px', background: '#ef3535' }} />
            SLJEDEĆE NATJECANJE
          </div>
          {selected ? (
            <>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f0f0', fontFamily: 'var(--font-bg, var(--fm))', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
                {selected.name}
                <ChevronDown size={12} color="rgba(255,255,255,0.25)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', letterSpacing: '0.06em' }}>
                {new Date(selected.date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })}{selected.location ? ` · ${selected.location}` : ''}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Odaberi natjecanje... <ChevronDown size={12} />
            </div>
          )}
        </button>

        {/* Right: countdown chips */}
        {selected && (
          <div className="comp-chips" style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' as const }}>
            {([
              { val: countdown.d, label: 'DANA' },
              { val: countdown.h, label: 'SATI' },
              { val: countdown.m, label: 'MIN'  },
              { val: countdown.s, label: 'SEK'  },
            ] as {val:number;label:string}[]).map(({ val, label }) => (
              <div key={label} className="comp-chip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 14px', minWidth: '52px' }}>
                <div style={{ fontFamily: 'var(--font-bg, var(--fd))', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em', color: '#f0f0f0', fontVariantNumeric: 'tabular-nums' }}>{String(val).padStart(2,'0')}</div>
                <div style={{ fontSize: '0.38rem', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontWeight: 700, marginTop: '5px' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
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
export function SetLogSection({ we, userId, isAdmin, onAggregateUpdate }: {
  we: WorkoutExercise; userId: string; isAdmin: boolean
  onAggregateUpdate: (data: Partial<WorkoutExercise>) => void
}) {
  const plannedSets = we.planned_sets ?? 3
  const [logs, setLogs] = useState<SetLog[]>([])
  const [planRows, setPlanRows] = useState<SetPlanRow[]>(() =>
    Array.from({ length: plannedSets }, (_, i) => we.set_plan?.rows?.[i] ?? defaultRow(i))
  )
  const [saving, setSaving] = useState(false)
  const [localVals, setLocalVals] = useState<Record<string, string>>({})
  const focusedKey = useRef<string | null>(null)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    return () => { Object.values(debounceTimers.current).forEach(clearTimeout) }
  }, [])

  const scheduleSet = (setNum: number, field: keyof SetLog, raw: string) => {
    const key = `${setNum}_${String(field)}`
    clearTimeout(debounceTimers.current[key])
    debounceTimers.current[key] = setTimeout(() => saveSet(setNum, field, raw), 600)
  }

  const flushSet = (setNum: number, field: keyof SetLog, raw: string) => {
    const key = `${setNum}_${String(field)}`
    clearTimeout(debounceTimers.current[key])
    saveSet(setNum, field, raw)
  }

  // Propagate set counts up for progress tracking
  const propagateCounts = (updatedLogs: SetLog[]) => {
    if (isAdmin) return
    const completedSets = updatedLogs.filter(l => l.completed).length
    onAggregateUpdate({ _completedSets: completedSets, _totalSets: updatedLogs.length })
  }

  // Initialise logs array — one entry per planned set
  useEffect(() => {
    supabase.from('set_logs')
      .select('set_number, weight_kg, reps, rpe, completed, is_top_set')
      .eq('workout_exercise_id', we.id)
      .eq('athlete_id', userId)
      .order('set_number')
      .then(({ data }) => {
        const existing = (data ?? []) as SetLog[]
        const filled: SetLog[] = Array.from({ length: plannedSets }, (_, i) => {
          const found = existing.find(s => s.set_number === i + 1)
          return found ?? { set_number: i + 1, weight_kg: null, reps: null, rpe: null, completed: false, is_top_set: false }
        })
        setLogs(filled)
        propagateCounts(filled)
      })
  }, [we.id, plannedSets, isAdmin])

  // Keep localVals in sync with logs — skip the focused set entirely
  useEffect(() => {
    setLocalVals(prev => {
      const next = { ...prev }
      // Extract set number from focused key (e.g. "2_weight_kg" → "2")
      const focusedSet = focusedKey.current ? focusedKey.current.split('_')[0] : null
      logs.forEach(s => {
        if (String(s.set_number) === focusedSet) return // skip entire set being edited
        next[`${s.set_number}_weight_kg`] = s.weight_kg != null ? String(s.weight_kg) : ''
        next[`${s.set_number}_reps`] = s.reps != null ? String(s.reps) : ''
        next[`${s.set_number}_rpe`] = s.rpe != null ? String(s.rpe) : ''
      })
      return next
    })
  }, [logs, isAdmin])


  const upsertViaApi = async (setNum: number, field: string, value: unknown) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/admin/upsert-set-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ workoutExerciseId: we.id, athleteId: userId, setNumber: setNum, field, value }),
    })
  }

  const upsertDirect = async (setNum: number, field: string, value: unknown) => {
    // Atomic upsert — eliminates SELECT+INSERT race condition that caused
    // silent unique constraint failures when multiple saves fired simultaneously.
    // Unique constraint: (workout_exercise_id, set_number)
    await supabase.from('set_logs').upsert({
      workout_exercise_id: we.id,
      athlete_id: userId,
      set_number: setNum,
      [field]: value,
    }, { onConflict: 'workout_exercise_id,set_number' })
  }

  const saveSet = async (setNum: number, field: keyof SetLog, raw: string) => {
    const val = (field === 'weight_kg' || field === 'rpe') ? (raw ? Number(raw) : null) : (raw || null)
    setSaving(true)

    const updated = logs.map(s => s.set_number === setNum ? { ...s, [field]: val } : s)
    setLogs(updated)

    if (isAdmin) {
      await upsertViaApi(setNum, field, val)
    } else {
      await upsertDirect(setNum, field, val)
    }

    // A manual weight change cascades to any backoff sets referencing it
    if (field === 'weight_kg') await persistBackoffWeights(planRows, updated)

    const filled = updated.filter(s => s.weight_kg || s.reps)
    if (filled.length > 0) {
      const avgKg = Math.round((filled.reduce((s, x) => s + (x.weight_kg ?? 0), 0) / filled.length) * 100) / 100
      const lastRpe = filled[filled.length - 1].rpe
      onAggregateUpdate({ actual_weight_kg: avgKg, actual_rpe: lastRpe })
    }
    propagateCounts(updated)
    setSaving(false)
  }

  const markSetDone = async (setNum: number) => {
    const s = logs.find(l => l.set_number === setNum)
    if (!s) return
    if (!s.completed && (!s.weight_kg || !s.reps)) return
    const nowDone = !s.completed
    const newLogs = logs.map(l => l.set_number === setNum ? { ...l, completed: nowDone } : l)
    setLogs(newLogs)

    if (isAdmin) {
      await upsertViaApi(setNum, 'completed', nowDone)
    } else {
      await upsertDirect(setNum, 'completed', nowDone)
    }

    const allDone = newLogs.length > 0 && newLogs.every(l => l.completed)
    onAggregateUpdate({ completed: allDone })
    propagateCounts(newLogs)
  }

  const toggleTopSet = async (setNum: number) => {
    const s = logs.find(l => l.set_number === setNum)
    if (!s) return
    const isTop = !s.is_top_set
    // Only one top set per exercise — clear others first
    const newLogs = logs.map(l => ({ ...l, is_top_set: l.set_number === setNum ? isTop : false }))
    setLogs(newLogs)
    // Save all logs: clear others, set this one
    for (const l of newLogs) {
      await upsertDirect(l.set_number, 'is_top_set', l.is_top_set)
    }
    // A top set can't also be a backoff set — clear backoff on it
    if (isTop) {
      const i = setNum - 1
      if (planRows[i]?.mode === 'backoff') {
        const rows = planRows.map((r, idx) => idx === i
          ? { ...(r ?? defaultRow(idx)), mode: 'manual' as SetMode }
          : (r ?? defaultRow(idx)))
        setPlanRows(rows)
        savePlan(rows)
      }
    }
  }

  // ── BACKOFF (per-set plan) ──────────────────────────────────────
  // Keep plan rows in sync when the planned set count changes
  useEffect(() => {
    setPlanRows(prev => {
      if (prev.length === plannedSets) return prev
      return Array.from({ length: plannedSets }, (_, i) => prev[i] ?? we.set_plan?.rows?.[i] ?? defaultRow(i))
    })
  }, [plannedSets]) // eslint-disable-line react-hooks/exhaustive-deps

  const computed = computeWeights(logs.map(l => l.weight_kg), planRows)

  const savePlan = (rows: SetPlanRow[]) => onAggregateUpdate({ set_plan: { rows } })

  // Recompute every backoff set's weight from the manual sets it references and
  // persist the changed weights into set_logs (so it becomes the planned weight).
  const persistBackoffWeights = async (rows: SetPlanRow[], baseLogs: SetLog[]) => {
    const comp = computeWeights(baseLogs.map(l => l.weight_kg), rows)
    const changed: { setNum: number; val: number | null }[] = []
    baseLogs.forEach((l, i) => {
      if (rows[i]?.mode === 'backoff' && comp[i] !== l.weight_kg) {
        changed.push({ setNum: l.set_number, val: comp[i] })
      }
    })
    if (changed.length === 0) return
    const newLogs = baseLogs.map(l => {
      const u = changed.find(c => c.setNum === l.set_number)
      return u ? { ...l, weight_kg: u.val } : l
    })
    setLogs(newLogs)
    setLocalVals(prev => {
      const next = { ...prev }
      changed.forEach(c => { next[`${c.setNum}_weight_kg`] = c.val != null ? String(c.val) : '' })
      return next
    })
    for (const c of changed) {
      if (isAdmin) await upsertViaApi(c.setNum, 'weight_kg', c.val)
      else await upsertDirect(c.setNum, 'weight_kg', c.val)
    }
  }

  const toggleBackoff = (setNum: number) => {
    const i = setNum - 1
    if (i === 0) return // first set has nothing earlier to reference
    const cur = planRows[i] ?? defaultRow(i)
    const nextMode: SetMode = cur.mode === 'backoff' ? 'manual' : 'backoff'
    const ref = cur.ref >= i ? Math.max(0, i - 1) : cur.ref
    const rows = planRows.map((r, idx) => idx === i
      ? { ...(r ?? defaultRow(idx)), mode: nextMode, ref }
      : (r ?? defaultRow(idx)))
    setPlanRows(rows)
    savePlan(rows)
    if (nextMode === 'backoff') {
      // A backoff set can't also be the top set — clear top on it
      const s = logs.find(l => l.set_number === setNum)
      if (s?.is_top_set) {
        const newLogs = logs.map(l => l.set_number === setNum ? { ...l, is_top_set: false } : l)
        setLogs(newLogs)
        upsertDirect(setNum, 'is_top_set', false)
        persistBackoffWeights(rows, newLogs)
      } else {
        persistBackoffWeights(rows, logs)
      }
    }
  }

  const updatePlanRow = (i: number, field: 'pct' | 'ref', val: number) => {
    const rows = planRows.map((r, idx) => idx === i
      ? { ...(r ?? defaultRow(idx)), [field]: val }
      : (r ?? defaultRow(idx)))
    setPlanRows(rows)
    savePlan(rows)
    persistBackoffWeights(rows, logs)
  }

  // Both admin and lifter use the same table layout.
  // Admin routes saves through service-role API; lifter writes directly via anon client.
  const targetRpe = we.target_rpe ?? we.planned_rpe
  // Admin gets an extra "B" (backoff) column after TOP
  const SLR_GRID = isAdmin ? '48px 1fr 1fr 62px 34px 34px' : '52px 1fr 1fr 80px 44px'
  const BLUE = '#6b8cff'
  const cellStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.07)' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#f0f0f0', padding: '5px 6px', fontSize: '1rem', outline: 'none', fontFamily: 'var(--fm)', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }

  return (
    <div>
      {saving && (
        <div style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.2em', padding: '3px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> SNIMANJE...
        </div>
      )}

      {/* Single header row */}
      <div className="set-log-header" style={{ display: 'grid', gridTemplateColumns: SLR_GRID, background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ ...cellStyle, justifyContent: 'flex-start', padding: '6px 14px' }}>
          <span style={{ fontSize: '0.4rem', color: '#444', letterSpacing: '0.25em', fontWeight: 700, fontFamily: 'var(--fm)' }}>SET</span>
        </div>
        <div style={{ ...cellStyle, padding: '6px 0' }}>
          <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'var(--fm)' }}>
            KG{we.planned_weight_kg ? ` · ${we.planned_weight_kg}` : ''}
          </span>
          {we.planned_weight_kg && (
            <span style={{ fontSize: '0.36rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', letterSpacing: '0.08em', marginLeft: '3px', fontStyle: 'italic' }}>avg.</span>
          )}
        </div>
        <div style={{ ...cellStyle, padding: '6px 0' }}>
          <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'var(--fm)' }}>
            REPS{we.planned_reps ? ` · ${we.planned_reps}` : ''}
          </span>
        </div>
        <div className="slr-rpe" style={{ ...cellStyle, padding: '6px 0' }}>
          <span style={{ fontSize: '0.4rem', color: '#facc15', letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'var(--fm)' }}>
            RPE{targetRpe ? ` · ${targetRpe}` : ''}
          </span>
        </div>
        <div style={{ ...cellStyle, padding: '6px 0', borderRight: isAdmin ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
          <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.18em', fontWeight: 700, fontFamily: 'var(--fm)' }}>{isAdmin ? 'TOP' : '○'}</span>
        </div>
        {isAdmin && (
          <div style={{ ...cellStyle, padding: '6px 0', borderRight: 'none' }} title="Backoff">
            <TrendingDown size={9} color={BLUE} strokeWidth={2.5} />
          </div>
        )}
      </div>


      {logs.map((log, i) => {
        const prevLog = logs[i - 1]
        const prevComplete = prevLog?.completed && prevLog?.weight_kg && prevLog?.reps
        const isLocked = !isAdmin && i > 0 && !log.is_top_set && !prevComplete
        const canComplete = !isAdmin && !log.completed && (!log.weight_kg || !log.reps)
        const row = planRows[i] ?? defaultRow(i)
        const isBackoff = isAdmin && row.mode === 'backoff'
        const compVal = computed[i]
        return (
          <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Row content — blurred when locked */}
            <div className="set-log-row" style={{ display: 'grid', gridTemplateColumns: SLR_GRID, alignItems: 'stretch', background: log.completed ? 'rgba(34,197,94,0.07)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.013)', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s, filter 0.35s', minHeight: '52px', filter: isLocked ? 'blur(5px)' : 'none', pointerEvents: isLocked ? 'none' : 'auto', userSelect: isLocked ? 'none' : 'auto' }}>

              {/* Set label */}
              <div style={{ ...cellStyle, justifyContent: 'center', padding: '12px 8px', gap: '6px', flexDirection: 'column' as const }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: log.completed ? '#22c55e' : 'rgba(255,255,255,0.15)', boxShadow: log.completed ? '0 0 5px rgba(34,197,94,0.5)' : 'none', transition: 'all 0.2s' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: log.completed ? '#22c55e' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--fd)', letterSpacing: '0.06em' }}>S{log.set_number}</span>
                {!isAdmin && log.is_top_set && (
                  <span style={{ fontSize: '0.5rem', color: '#facc15', fontFamily: 'var(--fm)', lineHeight: 1 }} title="Top set">★</span>
                )}
              </div>

              {/* KG — backoff sets show a computed (read-only) weight */}
              <div style={{ ...cellStyle, padding: '10px 12px', background: isBackoff ? 'rgba(107,140,255,0.06)' : 'rgba(255,255,255,0.015)' }}>
                {isBackoff ? (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '2px', width: '100%' }} title={`${row.pct}% od seta ${row.ref + 1}`}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 800, color: compVal != null ? BLUE : '#555', fontFamily: 'var(--fd)', lineHeight: 1.05 }}>
                      {compVal != null ? compVal : '—'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.4rem', color: 'rgba(107,140,255,0.85)', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.04em', background: 'rgba(107,140,255,0.12)', borderRadius: '3px', padding: '1px 4px' }}>
                      <TrendingDown size={7} strokeWidth={2.5} />{row.pct}%
                    </span>
                  </div>
                ) : (
                  <input
                    type="number" step="2.5"
                    value={localVals[`${log.set_number}_weight_kg`] ?? ''}
                    onChange={e => { setLocalVals(v => ({ ...v, [`${log.set_number}_weight_kg`]: e.target.value })); scheduleSet(log.set_number, 'weight_kg', e.target.value) }}
                    onFocus={e => { focusedKey.current = `${log.set_number}_weight_kg`; e.target.style.borderBottomColor = 'rgba(255,255,255,0.5)' }}
                    onBlur={e => { focusedKey.current = null; e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)'; flushSet(log.set_number, 'weight_kg', e.target.value) }}
                    placeholder={we.planned_weight_kg ? String(we.planned_weight_kg) : 'upiši'}
                    style={{ ...inputStyle, color: 'rgba(255,255,255,0.85)' }}
                  />
                )}
              </div>

              {/* REPS input */}
              <div style={{ ...cellStyle, padding: '10px 12px' }}>
                <input
                  type="text"
                  value={localVals[`${log.set_number}_reps`] ?? ''}
                  onChange={e => { setLocalVals(v => ({ ...v, [`${log.set_number}_reps`]: e.target.value })); scheduleSet(log.set_number, 'reps', e.target.value) }}
                  onFocus={e => { focusedKey.current = `${log.set_number}_reps`; e.target.style.borderBottomColor = 'rgba(255,255,255,0.6)' }}
                  onBlur={e => { focusedKey.current = null; e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)'; flushSet(log.set_number, 'reps', e.target.value) }}
                  placeholder={we.planned_reps != null ? String(we.planned_reps) : 'upiši'}
                  style={inputStyle}
                />
              </div>

              {/* RPE input */}
              <div className="slr-rpe" style={{ ...cellStyle, padding: '6px 10px', flexDirection: 'column', gap: '2px', alignItems: 'stretch', justifyContent: 'center' }}>
                {targetRpe && (
                  <div style={{ fontSize: '0.44rem', color: 'rgba(250,204,21,0.5)', fontFamily: 'var(--fm)', fontWeight: 800, letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1 }}>
                    @{targetRpe}
                  </div>
                )}
                <input
                  type="number" step="0.5" min="1" max="10"
                  value={localVals[`${log.set_number}_rpe`] ?? ''}
                  onChange={e => { setLocalVals(v => ({ ...v, [`${log.set_number}_rpe`]: e.target.value })); scheduleSet(log.set_number, 'rpe', e.target.value) }}
                  onFocus={e => { focusedKey.current = `${log.set_number}_rpe`; e.target.style.borderBottomColor = 'rgba(250,204,21,0.7)' }}
                  onBlur={e => { focusedKey.current = null; e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)'; flushSet(log.set_number, 'rpe', e.target.value) }}
                  placeholder={targetRpe ? String(targetRpe) : 'upiši'}
                  style={{ ...inputStyle, color: log.rpe && targetRpe ? (Number(log.rpe) - Number(targetRpe) > 1 ? '#f87171' : Number(log.rpe) - Number(targetRpe) > 0 ? '#facc15' : '#4ade80') : '#e0e0e0' }}
                />
              </div>

              {/* Admin: top set toggle ★ | Lifter: done toggle ✓ */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isAdmin ? (
                  <button onClick={() => toggleTopSet(log.set_number)}
                    disabled={isBackoff}
                    title={isBackoff ? 'Backoff set ne može biti top set' : (log.is_top_set ? 'Makni top set' : 'Označi kao top set')}
                    style={{ background: log.is_top_set ? 'rgba(250,204,21,0.12)' : 'transparent', border: `1px solid ${log.is_top_set ? 'rgba(250,204,21,0.4)' : 'transparent'}`, borderRadius: '6px', cursor: isBackoff ? 'not-allowed' : 'pointer', color: log.is_top_set ? '#facc15' : '#3a3a3a', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontSize: '0.92rem', opacity: isBackoff ? 0.2 : 1 }}>
                    {log.is_top_set ? '★' : '☆'}
                  </button>
                ) : (
                  <button onClick={() => markSetDone(log.set_number)}
                    disabled={canComplete}
                    style={{ background: 'transparent', border: 'none', cursor: canComplete ? 'not-allowed' : 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    title={log.completed ? 'Poništi' : canComplete ? 'Unesi kg i reps' : 'Odrađeno'}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: log.completed ? 'none' : `1.5px solid ${canComplete ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`, background: log.completed ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)', boxShadow: log.completed ? '0 0 10px rgba(34,197,94,0.4)' : 'none', opacity: canComplete ? 0.3 : 1 }}>
                      {log.completed && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                  </button>
                )}
              </div>

              {/* Admin: backoff toggle */}
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i === 0 ? (
                    <span style={{ color: '#2a2a2a', fontSize: '0.7rem' }}>–</span>
                  ) : (
                    <button onClick={() => toggleBackoff(log.set_number)}
                      disabled={!!log.is_top_set}
                      title={log.is_top_set ? 'Top set ne može biti backoff' : (isBackoff ? 'Makni backoff' : 'Backoff od ranijeg seta')}
                      style={{ background: isBackoff ? 'rgba(107,140,255,0.18)' : 'transparent', border: `1px solid ${isBackoff ? 'rgba(107,140,255,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', cursor: log.is_top_set ? 'not-allowed' : 'pointer', color: isBackoff ? BLUE : '#3a3a3a', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: log.is_top_set ? 0.2 : 1 }}>
                      <TrendingDown size={13} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Admin: inline backoff config under a backoff set */}
            {isBackoff && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px 10px 50px', background: 'linear-gradient(90deg, rgba(107,140,255,0.08), rgba(107,140,255,0.015))', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '2px solid rgba(107,140,255,0.55)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.42rem', color: BLUE, letterSpacing: '0.18em', fontWeight: 800, fontFamily: 'var(--fm)', flexShrink: 0 }}>
                  <TrendingDown size={9} strokeWidth={2.5} /> BACKOFF
                </span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(107,140,255,0.35)', borderRadius: '6px', padding: '2px 6px 2px 8px' }}>
                  <input type="number" min={1} max={200} step={0.5} value={row.pct || ''}
                    onChange={e => updatePlanRow(i, 'pct', Number(e.target.value) || 0)}
                    style={{ width: '32px', background: 'transparent', border: 'none', color: BLUE, fontFamily: 'var(--fd)', fontSize: '0.85rem', fontWeight: 800, padding: 0, outline: 'none', textAlign: 'right' as const }} />
                  <span style={{ fontSize: '0.6rem', color: 'rgba(107,140,255,0.7)', fontFamily: 'var(--fm)', fontWeight: 700, paddingLeft: '3px' }}>%</span>
                </div>
                <span style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', letterSpacing: '0.12em', fontWeight: 700 }}>OD</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <select value={row.ref}
                    onChange={e => updatePlanRow(i, 'ref', Number(e.target.value))}
                    style={{ appearance: 'none' as const, WebkitAppearance: 'none' as const, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--fm)', fontSize: '0.58rem', fontWeight: 700, padding: '5px 20px 5px 9px', outline: 'none', cursor: 'pointer' }}>
                    {Array.from({ length: i }, (_, ri) => (
                      <option key={ri} value={ri} style={{ background: '#0d0d0d' }}>Set {ri + 1}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '6px', pointerEvents: 'none' }} />
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <ChevronRight size={11} color="rgba(255,255,255,0.2)" style={{ alignSelf: 'center' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: compVal != null ? '#f0f0f0' : '#555', fontFamily: 'var(--fd)' }}>
                    {compVal != null ? compVal : '—'}
                  </span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>kg</span>
                </div>
              </div>
            )}

            {/* Lock overlay — shown when previous set not completed */}
            {isLocked && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(9,9,9,0.55)', animation: 'fadeIn 0.2s ease', pointerEvents: 'none' }}>
                <Lock size={12} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.22em', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                  ZAVRŠI PRETHODNI SET
                </span>
              </div>
            )}
          </div>
        )
      })}
      <style>{`.set-log-row input::placeholder { color: rgba(255,255,255,0.22); font-style: italic; font-size: 0.62rem; letter-spacing: 0.05em; }`}</style>
    </div>
  )
}

// ─── ADMIN PLAN CELL ──────────────────────────────────────────────
// Inline editable number/text cell for the admin exercise plan grid
function AdminPlanCell({ value, placeholder, type, color, onSave }: {
  value: string | number | null; placeholder: string; type: string; color: string; onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value ?? ''))
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setVal(String(value ?? '')) }, [value])
  const commit = () => { setEditing(false); onSave(val) }
  if (editing) return (
    <input ref={ref} type={type} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      style={{ width: '52px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${color}66`, borderRadius: '5px', color, padding: '3px 6px', fontSize: '1rem', fontWeight: 800, outline: 'none', fontFamily: 'var(--fm)', textAlign: 'center', boxSizing: 'border-box' }}
    />
  )
  return (
    <span onClick={() => setEditing(true)}
      style={{ cursor: 'text', color: value != null && value !== '' ? color : 'rgba(255,255,255,0.15)', borderBottom: `1px dashed ${color}44`, paddingBottom: '1px' }}>
      {value != null && value !== '' ? value : placeholder}
    </span>
  )
}

// ─── EXERCISE ROW ─────────────────────────────────────────────────
// isAdmin=true  → edits planned_ + target_rpe + coach_note + delete
// isAdmin=false → reads planned_, edits actual_ + actual_note + completed
export function ExerciseRow({ we, isAdmin, userId, weekNumber, onUpdate, onDelete }: {
  we: WorkoutExercise; isAdmin: boolean; userId: string; weekNumber?: number
  onUpdate: (id: string, data: Partial<WorkoutExercise>) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded]     = useState(false)
  const [setsOpen, setSetsOpen]     = useState(false)
  const [showHistory, setShowHistory]   = useState(false)
  const [historyLogs, setHistoryLogs]   = useState<{ dayName: string; logs: any[] }[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const save = (field: keyof WorkoutExercise, val: string, isNum = false) =>
    onUpdate(we.id, { [field]: isNum ? (val ? Number(val) : null) : (val || null) })

  const loadHistory = async () => {
    if (historyLoading) return
    setHistoryLoading(true)
    try {
      const targetWeek = weekNumber ? weekNumber - 1 : null
      if (!targetWeek || targetWeek < 1) {
        setHistoryLogs([])
        setHistoryLoading(false)
        return
      }

      const { data: weData } = await supabase
        .from('workout_exercises')
        .select('id, workouts!inner(day_name, weeks!inner(week_number))')
        .eq('exercise_id', we.exercise_id)
        .eq('workouts.weeks.week_number', targetWeek)

      if (!weData || weData.length === 0) {
        setHistoryLogs([])
        setHistoryLoading(false)
        return
      }

      const weIds = weData.map((r: any) => r.id)

      const { data } = await supabase
        .from('set_logs')
        .select('workout_exercise_id, set_number, weight_kg, reps, rpe, completed')
        .eq('athlete_id', userId)
        .in('workout_exercise_id', weIds)
        .order('set_number')

      const grouped: { dayName: string; logs: any[] }[] = []
      for (const weRow of weData) {
        const logsForThis = (data ?? []).filter((l: any) => l.workout_exercise_id === weRow.id)
        if (logsForThis.length > 0) {
          grouped.push({ dayName: (weRow as any).workouts?.day_name ?? 'Dan', logs: logsForThis })
        }
      }
      setHistoryLogs(grouped)
    } catch (e) {
      console.error('loadHistory error:', e)
      setHistoryLogs([])
    }
    setHistoryLoading(false)
  }

  const toggleHistory = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showHistory) loadHistory()
    setShowHistory(v => !v)
  }

  // "!" badge — only for admin to toggle coach notes
  const hasNote = !!we.coach_note

  return (
    <div className="ex-row-wrap">
      {/* ── Main row ── */}
      {isAdmin ? (
        /* Admin: full-width card layout */
        <div className="ex-row-main" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Top bar: name + action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px 8px', minWidth: 0 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span
              onClick={() => setSetsOpen(v => !v)}
              style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f0f0f0', fontFamily: 'var(--fm)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, cursor: 'pointer' }}>
              {we.exercise?.name ?? '—'}
            </span>
            {/* ⓘ history */}
            <button onClick={toggleHistory}
              title="Usporedi s prošlim tjednom"
              style={{ background: showHistory ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showHistory ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showHistory ? 'rgba(255,255,255,0.85)' : '#555', fontSize: '0.58rem', fontWeight: 800, flexShrink: 0, transition: 'all 0.15s' }}>
              i
            </button>
            {/* Note/expand */}
            <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
              style={{ background: hasNote ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hasNote ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: hasNote ? '#f59e0b' : '#555', fontSize: '0.52rem', fontWeight: 800, padding: '3px 7px', cursor: 'pointer', fontFamily: 'var(--fm)', flexShrink: 0, transition: 'all 0.15s' }}>
              {expanded ? '▲' : (hasNote ? '!' : '+')}
            </button>
            {/* Delete */}
            <button onClick={() => onDelete(we.id)} className="icon-btn-danger" style={{ flexShrink: 0 }}><Trash2 size={12} /></button>
          </div>

          {/* Plan row: 4 tappable fields in a grid */}
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: '0' }}>
            {([
              { label: 'SETOVI', value: we.planned_sets,                 field: 'planned_sets'      as keyof WorkoutExercise, accent: '#94a3b8', isNum: true  },
              { label: 'REPS',   value: we.planned_reps,                 field: 'planned_reps'      as keyof WorkoutExercise, accent: '#e2e8f0', isNum: false },
              { label: 'KG',     value: we.planned_weight_kg,            field: 'planned_weight_kg' as keyof WorkoutExercise, accent: 'rgba(255,255,255,0.75)', isNum: true  },
              { label: 'RPE',    value: we.target_rpe ?? we.planned_rpe, field: 'target_rpe'        as keyof WorkoutExercise, accent: '#facc15', isNum: true  },
            ] as Array<{ label: string; value: string | number | null; field: keyof WorkoutExercise; accent: string; isNum: boolean }>).map((f, fi) => (
              <div key={String(f.field)} style={{ padding: '10px 8px 8px', borderRight: fi < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', cursor: 'text' }}>
                <div style={{ fontSize: '0.4rem', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--fm)', fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: f.accent, fontFamily: 'var(--fm)' }}>
                  <AdminPlanCell value={f.value} placeholder="—" type={f.isNum ? 'number' : 'text'} color={f.accent} onSave={(v: string) => save(f.field, v, f.isNum)} />
                </div>
              </div>
            ))}
          </div>

          {/* Coach note + sets toggle row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 10px', gap: '8px' }}>
            {we.coach_note ? (
              <div style={{ fontSize: '0.6rem', color: '#f59e0b', lineHeight: 1.4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ↳ {we.coach_note}
              </div>
            ) : <div style={{ flex: 1 }} />}
            <button
              onClick={() => setSetsOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: setsOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${setsOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '5px', color: setsOpen ? 'rgba(255,255,255,0.8)' : '#555', cursor: 'pointer', padding: '4px 10px', fontSize: '0.56rem', letterSpacing: '0.14em', fontFamily: 'var(--fm)', fontWeight: 700, flexShrink: 0, transition: 'all 0.2s' }}>
              SETOVI
              <ChevronRight size={10} style={{ transform: setsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
        </div>
      ) : (
        /* Lifter: colored-left-border design */
        (() => {
          const CAT_COLOR: Record<string, string> = {
            'Squat': '#6b8cff', 'Squat Variation': '#6b8cff',
            'Bench': '#f59e0b', 'Bench Variation': '#f59e0b',
            'Deadlift': '#22c55e', 'Deadlift Variation': '#22c55e',
          }
          const catColor = CAT_COLOR[we.exercise?.category ?? ''] ?? 'rgba(255,255,255,0.3)'
          const totalDots = we._totalSets ?? we.planned_sets ?? 0
          const doneDots  = we._completedSets ?? 0
          return (
            <div className="ex-row-main"
              onClick={() => setSetsOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${we.completed ? '#22c55e' : catColor}`, padding: '13px 14px 13px 16px', cursor: 'pointer', background: we.completed ? 'rgba(34,197,94,0.03)' : 'transparent', transition: 'background 0.2s', minHeight: '56px' }}>

              {/* Name + plan line */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: we.completed ? '#86efac' : '#f0f0f0', fontFamily: 'var(--fm)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {we.exercise?.name ?? '—'}
                  </span>
                  <button onClick={toggleHistory}
                    title="Usporedi s prošlim tjednom"
                    style={{ background: showHistory ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showHistory ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showHistory ? 'rgba(255,255,255,0.85)' : '#444', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0, transition: 'all 0.15s' }}>
                    i
                  </button>
                </div>
                {/* Plan line: 4×5 @ 160kg → actual */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' as const }}>
                  {(we.planned_sets || we.planned_reps) && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: catColor, fontFamily: 'var(--fm)' }}>
                      {we.planned_sets}×{we.planned_reps}
                    </span>
                  )}
                  {we.planned_weight_kg && (
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--fm)' }}>
                      @ {we.planned_weight_kg}kg
                    </span>
                  )}
                  {we.actual_weight_kg && (
                    <>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>→</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f0f0f0', fontFamily: 'var(--fm)' }}>{we.actual_weight_kg}kg</span>
                    </>
                  )}
                  {(we.target_rpe ?? we.planned_rpe) && (
                    <span style={{ fontSize: '0.62rem', color: 'rgba(250,204,21,0.65)', fontFamily: 'var(--fm)' }}>
                      @RPE{we.target_rpe ?? we.planned_rpe}
                    </span>
                  )}
                  {we.coach_note && (
                    <span style={{ fontSize: '0.62rem', color: '#f59e0b', fontFamily: 'var(--fm)' }}>↳ {we.coach_note}</span>
                  )}
                </div>
              </div>

              {/* Completion dots + counter + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {totalDots > 0 && (
                  <>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {Array.from({ length: Math.min(totalDots, 6) }).map((_, i) => (
                        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: i < doneDots ? catColor : 'transparent', border: `1.5px solid ${i < doneDots ? catColor : 'rgba(255,255,255,0.2)'}`, boxShadow: i < doneDots ? `0 0 4px ${catColor}80` : 'none', transition: 'all 0.2s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontWeight: 700 }}>{doneDots}/{totalDots}</span>
                  </>
                )}
                <div style={{ color: setsOpen ? catColor : 'rgba(255,255,255,0.25)', transition: 'transform 0.2s, color 0.2s', transform: setsOpen ? 'rotate(90deg)' : 'none' }}>
                  <ChevronRight size={12} />
                </div>
              </div>
            </div>
          )
        })()
      )}

      {/* ── History panel (prošli tjedan) ── */}
      {showHistory && (
        <div style={{ background: '#060606', borderBottom: '1px solid rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', animation: 'fadeUp 0.18s ease' }}>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '8px' }}>PROŠLI TJEDAN — {we.exercise?.name}</div>
          {historyLoading ? (
            <div style={{ fontSize: '0.7rem', color: '#444', display: 'flex', alignItems: 'center', gap: '6px' }}><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Učitavanje...</div>
          ) : historyLogs.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: '#333', fontFamily: 'var(--fm)' }}>Nema podataka za prošli tjedan.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {historyLogs.map((group, gi) => (
                <div key={gi}>
                  {historyLogs.length > 1 && (
                    <div style={{ fontSize: '0.42rem', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' as const }}>
                      {group.dayName}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', gap: '0', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                    {['SET','KG','REPS','RPE'].map(h => (
                      <div key={h} style={{ padding: '5px 10px', background: 'rgba(0,0,0,0.3)', fontSize: '0.38rem', letterSpacing: '0.2em', color: '#444', fontWeight: 700, fontFamily: 'var(--fm)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</div>
                    ))}
                    {group.logs.map((l: any, i: number) => (
                      [
                        <div key={`s${i}`} style={{ padding: '7px 10px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, fontFamily: 'var(--fd)', borderBottom: i < group.logs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>S{l.set_number}</div>,
                        <div key={`kg${i}`} style={{ padding: '7px 10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, borderBottom: i < group.logs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{l.weight_kg ?? '—'}</div>,
                        <div key={`r${i}`} style={{ padding: '7px 10px', fontSize: '0.78rem', color: '#94a3b8', borderBottom: i < group.logs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{l.reps ?? '—'}</div>,
                        <div key={`rpe${i}`} style={{ padding: '7px 10px', fontSize: '0.78rem', color: '#fbbf24', borderBottom: i < group.logs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{l.rpe ?? '—'}</div>,
                      ]
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Expanded details (admin: tempo/odmor/bilješka, lifter: moja bilješka) ── */}
      {expanded && (
        <div style={{ background: '#060606', borderBottom: '1px solid rgba(255,255,255,0.08)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {isAdmin ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0' }}>
              {[
                { label: 'TEMPO', key: 'planned_tempo' as keyof WorkoutExercise, ph: '3010' },
                { label: 'ODMOR (sek)', key: 'planned_rest_seconds' as keyof WorkoutExercise, ph: '90', type: 'number' },
                { label: 'BILJEŠKA TRENERA', key: 'coach_note' as keyof WorkoutExercise, ph: 'Uputa za liftera...' },
              ].map((f, fi) => (
                <div key={String(f.key)} style={{ padding: '12px 16px', borderRight: fi < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <div style={{ fontSize: '0.46rem', color: '#666', letterSpacing: '0.2em', marginBottom: '6px' }}>{f.label}</div>
                  <EditableField value={we[f.key] as string | number | null} placeholder={f.ph} type={f.type} onSave={v => save(f.key, v)} />
                </div>
              ))}
            </div>
          ) : (
            /* Lifter: only comment — tempo/odmor shown as info */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
              {(we.planned_tempo || we.planned_rest_seconds) && (
                <div style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.2em', marginBottom: '5px' }}>TEMPO / ODMOR</div>
                  <div style={{ fontSize: '0.78rem', color: '#888' }}>
                    {we.planned_tempo || '—'} · {we.planned_rest_seconds ? `${we.planned_rest_seconds}s` : '—'}
                  </div>
                </div>
              )}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', marginBottom: '6px' }}>MOJA BILJEŠKA</div>
                <EditableField value={we.actual_note} placeholder="Upiši komentar..." onSave={v => save('actual_note', v)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Set log section — collapse/expand klikom na naziv vježbe */}
      {setsOpen && (
        <div style={{ animation: 'fadeUp 0.18s ease' }}>
          <SetLogSection
            we={we} userId={userId} isAdmin={isAdmin}
            onAggregateUpdate={data => onUpdate(we.id, data)}
          />
        </div>
      )}

      {/* Lifter: inline comment field — vidljivo samo kad su setovi otvoreni */}
      {!isAdmin && setsOpen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.42rem', color: '#444', letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'var(--fm)', whiteSpace: 'nowrap' as const }}>KOMENTAR</span>
          <div style={{ flex: 1 }}>
            <EditableField value={we.actual_note} placeholder="Dodaj komentar na vježbu..." onSave={v => save('actual_note', v)} />
          </div>
        </div>
      )}

    </div>
  )
}

// ─── WORKOUT CARD — editorial style ──────────────────────────────
export function WorkoutCard({ workout, exercises, isAdmin, userId, weekNumber, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise, onCopyWorkout, onMoveWorkout, isFirst, isLast, allWeeks, onCopyWorkoutToWeek }: {
  workout: Workout; exercises: Exercise[]; isAdmin: boolean; userId: string; weekNumber?: number
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void
  onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void
  onDeleteExercise: (id: string) => void
  onCopyWorkout?: () => void
  onMoveWorkout?: (dir: 'up' | 'down') => void
  isFirst?: boolean; isLast?: boolean
  allWeeks?: { id: string; week_number: number }[]
  onCopyWorkoutToWeek?: (targetWeekId: string) => void
}) {
  const ssKey = `workout-open-${workout.id}`
  const [open, setOpen] = useState(() => {
    try { const v = sessionStorage.getItem(ssKey); return v === 'true' } catch { return false }
  })
  const [showPicker, setShowPicker] = useState(false)
  const [showWeekPicker, setShowWeekPicker] = useState(false)
  const [confirmDeleteWorkout, setConfirmDeleteWorkout] = useState(false)
  const weekPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showWeekPicker) return
    const handler = (e: MouseEvent) => {
      if (weekPickerRef.current && !weekPickerRef.current.contains(e.target as Node)) setShowWeekPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showWeekPicker])
  const exCount = workout.workout_exercises?.length ?? 0

  // ── Local exercise order (for optimistic drag-reorder) ──
  const [localExs, setLocalExs] = useState(() =>
    [...(workout.workout_exercises ?? [])].sort((a, b) => a.exercise_order - b.exercise_order)
  )
  const localExsRef = useRef(localExs)
  useEffect(() => { localExsRef.current = localExs }, [localExs])

  // Sync when exercises are added/removed, or when their properties change (e.g. completed)
  useEffect(() => {
    const incoming = workout.workout_exercises ?? []
    const cur = localExsRef.current
    const sameSet = incoming.length === cur.length && incoming.every(e => cur.find(l => l.id === e.id))
    if (!sameSet) {
      setLocalExs([...incoming].sort((a, b) => a.exercise_order - b.exercise_order))
    } else {
      setLocalExs(cur.map(l => ({ ...l, ...incoming.find(e => e.id === l.id) })))
    }
  }, [workout.workout_exercises])

  // ── Drag state ──
  const [dragState, setDragState] = useState<{ id: string; overIdx: number } | null>(null)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commitReorder = (fromId: string, toIdx: number) => {
    setLocalExs(prev => {
      const fromIdx = prev.findIndex(e => e.id === fromId)
      if (fromIdx === -1 || fromIdx === toIdx) return prev
      const arr = [...prev]
      const [el] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, el)
      const updated = arr.map((e, i) => ({ ...e, exercise_order: i + 1 }))
      updated.forEach(e => onUpdateExercise(e.id, { exercise_order: e.exercise_order }))
      return updated
    })
    setDragState(null)
  }

  const startDragTimer = (weId: string, startX: number, startY: number) => {
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current)
    const onPreMove = (e: PointerEvent) => {
      if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) cleanup()
    }
    const onPreUp = () => cleanup()
    const cleanup = () => {
      if (dragTimerRef.current) { clearTimeout(dragTimerRef.current); dragTimerRef.current = null }
      window.removeEventListener('pointermove', onPreMove)
      window.removeEventListener('pointerup', onPreUp)
    }
    window.addEventListener('pointermove', onPreMove)
    window.addEventListener('pointerup', onPreUp)
    dragTimerRef.current = setTimeout(() => {
      window.removeEventListener('pointermove', onPreMove)
      window.removeEventListener('pointerup', onPreUp)
      dragTimerRef.current = null
      const overIdx = localExsRef.current.findIndex(e => e.id === weId)
      setDragState({ id: weId, overIdx })
      try { navigator.vibrate(40) } catch {}
    }, 400)
  }

  // Global move/up handlers while drag is active
  useEffect(() => {
    if (!dragState) return
    const onMove = (e: PointerEvent) => {
      e.preventDefault()
      for (const [id, el] of rowRefs.current) {
        const rect = el.getBoundingClientRect()
        if (e.clientY >= rect.top && e.clientY < rect.bottom) {
          const idx = localExsRef.current.findIndex(ex => ex.id === id)
          if (idx !== -1) setDragState(prev => prev ? { ...prev, overIdx: idx } : null)
          return
        }
      }
    }
    const onUp = () => commitReorder(dragState.id, dragState.overIdx)
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState?.id, dragState?.overIdx])

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
      {/* Outer card: sharp border */}
      <div className="workout-card" style={{ border: '1px solid rgba(255,255,255,0.12)', marginBottom: '10px', overflow: 'hidden', borderRadius: '8px', boxShadow: '0 4px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)' }}>

        {/* ── Day header — sharp editorial strip ── */}
        <div
          style={{ background: workout.completed ? '#0a1c0e' : '#111111', borderBottom: open ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: 'pointer', padding: '0' }}
          onClick={() => { const next = !open; setOpen(next); try { sessionStorage.setItem(ssKey, String(next)) } catch {} }}>
          {/* Top accent line — amber for active days, green for completed */}
          <div style={{ height: '3px', background: workout.completed ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 60%, #15803d 100%)' : 'linear-gradient(90deg, rgba(239,53,53,0.5) 0%, rgba(239,53,53,0.75) 50%, rgba(239,53,53,0.4) 100%)', boxShadow: workout.completed ? '0 0 14px rgba(34,197,94,0.4)' : '0 0 10px rgba(239,53,53,0.15)', transition: 'all 0.3s' }} />

          <div className='workout-header-inner' style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Workout name — large, bold */}
            <div style={{ flex: 1 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '0.47rem', fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '0.2em', color: workout.completed ? 'rgba(134,239,172,0.45)' : 'rgba(255,255,255,0.25)', textTransform: 'uppercase' as const, marginBottom: '3px' }}>
                TRENING
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: workout.completed ? '#86efac' : '#f0f0ff', fontFamily: 'var(--fd)', letterSpacing: '0.02em', textTransform: 'uppercase' as const }}>
                <EditableField value={workout.day_name} placeholder="DAN TRENINGA" onSave={v => onUpdateWorkout(workout.id, { day_name: v })} />
              </div>
              {workout.completed && workout.completion_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                  <CalendarDays size={9} color="rgba(134,239,172,0.5)" />
                  <span style={{ fontSize: '0.5rem', color: 'rgba(134,239,172,0.55)', fontFamily: 'var(--fm)', letterSpacing: '0.1em' }}>
                    {new Date(workout.completion_date).toLocaleString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Right controls */}
            <div className="workout-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {/* Ex count badge */}
              {exCount > 0 && (
                <div style={{ fontSize: '0.54rem', color: 'rgba(255,255,255,0.38)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.12em', fontWeight: 700 }}>
                  {exCount} VJ
                </div>
              )}
              {/* Completed toggle — only for lifter */}
              {!isAdmin && (
                <div onClick={e => {
                  e.stopPropagation()
                  const newDone = !workout.completed
                  onUpdateWorkout(workout.id, { completed: newDone })
                  workout.workout_exercises?.forEach(we => onUpdateExercise(we.id, { completed: newDone }))
                }}
                  className={`done-badge${workout.completed ? ' done-badge-active' : ''}`}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: workout.completed ? 'none' : '1.5px solid rgba(255,255,255,0.25)', background: workout.completed ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)', boxShadow: workout.completed ? '0 0 8px rgba(34,197,94,0.4)' : 'none' }}>
                    {workout.completed && <Check size={9} color="#fff" strokeWidth={3.5} />}
                  </div>
                  <span>{workout.completed ? 'GOTOVO' : 'ODRADITI'}</span>
                </div>
              )}
              {/* Copy/Move/Delete — admin only */}
              {isAdmin && onMoveWorkout && !isFirst && (
                <button onClick={e => { e.stopPropagation(); onMoveWorkout('up') }}
                  title="Pomjeri gore"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}>
                  <ArrowUp size={11} />
                </button>
              )}
              {isAdmin && onMoveWorkout && !isLast && (
                <button onClick={e => { e.stopPropagation(); onMoveWorkout('down') }}
                  title="Pomjeri dolje"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}>
                  <ArrowDown size={11} />
                </button>
              )}
              {isAdmin && onCopyWorkout && (
                <button onClick={e => { e.stopPropagation(); onCopyWorkout() }}
                  title="Kopiraj dan (isti tjedan)"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}>
                  <Copy size={11} />
                </button>
              )}
              {isAdmin && onCopyWorkoutToWeek && allWeeks && allWeeks.length > 0 && (
                <div ref={weekPickerRef} style={{ position: 'relative' }}>
                  <button onClick={e => { e.stopPropagation(); setShowWeekPicker(v => !v) }}
                    title="Kopiraj dan u drugi tjedan"
                    style={{ background: showWeekPicker ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showWeekPicker ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`, color: showWeekPicker ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (!showWeekPicker) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                    onMouseLeave={e => { if (!showWeekPicker) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' } }}>
                    <CalendarDays size={11} />
                  </button>
                  {showWeekPicker && (
                    <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 999, background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.7)', minWidth: '100px' }}>
                      <div style={{ padding: '6px 10px 4px', fontSize: '0.55rem', fontFamily: 'var(--fm)', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>KOPIRAJ U</div>
                      {allWeeks.map(w => (
                        <button key={w.id}
                          onClick={e => { e.stopPropagation(); onCopyWorkoutToWeek(w.id); setShowWeekPicker(false) }}
                          style={{ display: 'block', width: '100%', padding: '7px 14px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', textAlign: 'left', fontSize: '0.72rem', fontFamily: 'var(--fm)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}>
                          W{w.week_number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {isAdmin && (
                <button onClick={e => { e.stopPropagation(); setConfirmDeleteWorkout(true) }} className="icon-btn-danger">
                  <Trash2 size={11} />
                </button>
              )}
              {confirmDeleteWorkout && (
                <ConfirmDialog
                  message={`Jeste li sigurni da želite obrisati "${workout.day_name}"? Ova akcija je nepovratna.`}
                  onConfirm={() => { setConfirmDeleteWorkout(false); onDeleteWorkout(workout.id) }}
                  onCancel={() => setConfirmDeleteWorkout(false)}
                />
              )}
              {/* Expand arrow */}
              <div style={{ color: open ? 'rgba(255,255,255,0.7)' : '#444', transition: 'transform 0.25s, color 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Exercise table — dark with sharp grid ── */}
        {open && (
          <div style={{ background: '#080808', animation: 'fadeUp 0.2s ease' }}>

            {/* Exercises */}
            {localExs.map((we, idx) => (
              <div
                key={we.id}
                ref={el => { if (el) rowRefs.current.set(we.id, el); else rowRefs.current.delete(we.id) }}
                style={{
                  display: 'flex', alignItems: 'stretch',
                  opacity: dragState?.id === we.id ? 0.3 : 1,
                  borderTop: dragState && dragState.overIdx === idx && dragState.id !== we.id ? '2px solid #ef3535' : undefined,
                  transition: 'opacity 0.15s',
                  userSelect: 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <ExerciseRow key={we.id} we={we} isAdmin={isAdmin} userId={userId} weekNumber={weekNumber} onUpdate={handleUpdateExercise} onDelete={onDeleteExercise} />
                </div>
                {isAdmin && (
                  <div
                    onPointerDown={e => { e.preventDefault(); startDragTimer(we.id, e.clientX, e.clientY) }}
                    style={{
                      width: '32px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderLeft: '1px solid rgba(255,255,255,0.06)',
                      cursor: dragState?.id === we.id ? 'grabbing' : 'grab',
                      touchAction: 'none',
                      background: dragState?.id === we.id ? 'rgba(239,53,53,0.06)' : 'transparent',
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px',
                      border: `1.5px dashed ${dragState?.id === we.id ? 'rgba(239,53,53,0.6)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.15s',
                    }}>
                      <GripVertical size={11} color={dragState?.id === we.id ? '#ef3535' : 'rgba(255,255,255,0.15)'} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add vježbu + bilješka footer */}
            <div className="ex-table-footer" style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(0,0,0,0.15)' }}>
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
// ─── WEEK NOTES MODAL ────────────────────────────────────────────
function WeekNotesModal({ notes, isAdmin, onSave, onClose }: {
  notes: string | null; isAdmin: boolean; onSave: (v: string) => void; onClose: () => void
}) {
  const [val, setVal] = useState(notes ?? '')
  const [saving, setSaving] = useState(false)
  const save = async () => { setSaving(true); onSave(val); setSaving(false); onClose() }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.15s' }}
      onClick={onClose}>
      <div style={{ background: '#0d0d16', border: '1.5px solid rgba(251,191,36,0.25)', borderRadius: '14px', padding: '28px', maxWidth: '500px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,191,36,0.08)', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <MessageSquare size={16} color="#fbbf24" />
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: '#fbbf24', fontFamily: 'var(--fm)', fontWeight: 700 }}>KOMENTAR TJEDNA</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '2px' }}>
            <X size={14} />
          </button>
        </div>
        {isAdmin ? (
          <>
            <textarea value={val} onChange={e => setVal(e.target.value)} rows={5} placeholder="Napiši komentar za ovaj tjedan..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(251,191,36,0.2)', borderRadius: '9px', color: '#f0f0f5', padding: '12px 14px', fontFamily: 'var(--fm)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.7 }}
              onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(251,191,36,0.2)'} />
            <button onClick={save} disabled={saving}
              style={{ marginTop: '12px', padding: '10px 24px', background: 'rgba(251,191,36,0.12)', border: '1.5px solid rgba(251,191,36,0.35)', borderRadius: '8px', color: '#fbbf24', fontFamily: 'var(--fm)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.08em', cursor: 'pointer' }}>
              {saving ? 'SPREMA...' : 'SPREMI'}
            </button>
          </>
        ) : (
          <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, fontFamily: 'var(--fm)', whiteSpace: 'pre-wrap' as const }}>
            {notes || <span style={{ color: 'rgba(255,255,255,0.25)' }}>Nema komentara za ovaj tjedan.</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export function WeekPanel({ week, exercises, isAdmin, userId, onDeleteWeek, onCopyWeek, onUpdateWeek, onAddWorkout, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise, onCopyWorkout, onMoveWorkout, allWeeks, onCopyWorkoutToWeek }: {
  week: Week; exercises: Exercise[]; isAdmin: boolean; userId: string
  onDeleteWeek: (id: string) => void; onCopyWeek: (id: string) => void; onUpdateWeek: (id: string, data: Partial<Week>) => void
  onAddWorkout: (weekId: string) => void
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void; onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void; onDeleteExercise: (id: string) => void
  onCopyWorkout?: (workoutId: string) => void
  onMoveWorkout?: (workoutId: string, dir: 'up' | 'down') => void
  allWeeks?: { id: string; week_number: number }[]
  onCopyWorkoutToWeek?: (workoutId: string, targetWeekId: string) => void
}) {
  const ssKey = `week-open-${week.id}`
  const [open, setOpen] = useState(() => {
    try { const v = sessionStorage.getItem(ssKey); return v === null ? false : v === 'true' } catch { return false }
  })
  const [showNotes, setShowNotes] = useState(false)
  const [confirmDeleteWeek, setConfirmDeleteWeek] = useState(false)
  const addWorkoutLocked = useRef(false)

  const handleAddWorkout = () => {
    if (addWorkoutLocked.current) return
    addWorkoutLocked.current = true
    onAddWorkout(week.id)
    setTimeout(() => { addWorkoutLocked.current = false }, 500)
  }

  const { totalSets, doneSets, total, done, pct, totalEx, doneEx } = useMemo(() => {
    const allExercises = week.workouts?.flatMap(w => w.workout_exercises ?? []) ?? []
    const totalSets = allExercises.reduce((s, e) => s + (e._totalSets ?? e.planned_sets ?? 0), 0)
    const doneSets = allExercises.reduce((s, e) => {
      const fromLogs = e._completedSets ?? 0
      const fromCompleted = e.completed ? (e._totalSets ?? e.planned_sets ?? 0) : 0
      return s + Math.max(fromLogs, fromCompleted)
    }, 0)
    const total = week.workouts?.length ?? 0
    const done = week.workouts?.filter(w => w.completed).length ?? 0
    const pct = totalSets > 0 ? (doneSets / totalSets) * 100 : (total > 0 ? (done / total) * 100 : 0)
    const totalEx = allExercises.length
    const doneEx = allExercises.filter(e => e.completed).length
    return { totalSets, doneSets, total, done, pct, totalEx, doneEx }
  }, [week.workouts])

  const hasNotes = !!(week.notes?.trim())

  const allDone = done === total && total > 0
  const accentColor = allDone ? '#22c55e' : pct > 0 ? '#ef3535' : 'rgba(255,255,255,0.1)'

  return (
    <div style={{
      marginBottom: '20px',
      background: '#0e0e0e',
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)${allDone ? ', 0 0 0 1px rgba(34,197,94,0.05)' : ''}`,
      transition: 'border-color 0.4s, box-shadow 0.4s',
    }}>

      {/* ── Week header ── */}
      <div style={{ background: allDone ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.01)', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
        onClick={() => { const next = !open; setOpen(next); try { sessionStorage.setItem(ssKey, String(next)) } catch {} }}>

        {/* Top: large week label row */}
        <div className="week-header-top" style={{ padding: 'clamp(14px,3vw,20px) clamp(16px,4vw,24px) 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div>
              {/* Overline label — profile page style */}
              <div style={{ fontSize: '0.45rem', fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '0.22em', color: allDone ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.25)', marginBottom: '4px', textTransform: 'uppercase' as const }}>
                TJEDAN
              </div>
              {/* Giant W number — color based on completion */}
              <span className="week-w-num" style={{
                fontFamily: 'var(--fd)', fontSize: 'clamp(2rem,4.5vw,3.6rem)', fontWeight: 900, lineHeight: 1,
                color: allDone ? '#4ade80' : pct > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.22)',
                letterSpacing: '-0.05em', transition: 'all 0.4s',
              }}>
                W{week.week_number}
              </span>
            </div>
            {allDone && (
              <span style={{ fontSize: '0.48rem', fontWeight: 800, fontFamily: 'var(--fm)', letterSpacing: '0.18em', color: '#4ade80', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.28)', borderRadius: '6px', padding: '3px 9px' }}>
                ZAVRŠENO
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '4px' }}>
            {/* Progress pill */}
            {total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px' }}>
                <div style={{ width: '52px', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, background: allDone ? '#22c55e' : '#f0f0f0', boxShadow: allDone ? '0 0 8px rgba(34,197,94,0.6)' : 'none', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)', borderRadius: '2px' }} />
                </div>
                <span style={{ fontSize: '0.54rem', color: allDone ? '#4ade80' : 'rgba(255,255,255,0.45)', fontFamily: 'var(--fm)', fontWeight: 800, letterSpacing: '0.05em' }}>{totalSets > 0 ? `${doneSets}/${totalSets}` : `${doneEx}/${totalEx}`}</span>
              </div>
            )}
            <div style={{ color: '#888', transition: 'transform 0.25s, color 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
              <ChevronRight size={14} />
            </div>
            {/* Week notes icon — always visible, yellow if has notes */}
            <button onClick={e => { e.stopPropagation(); setShowNotes(true) }}
              style={{ background: hasNotes ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${hasNotes ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '7px', padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s', color: hasNotes ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(251,191,36,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#fbbf24' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = hasNotes ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = hasNotes ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
              <MessageSquare size={12} />
              {hasNotes && <span style={{ fontSize: '0.48rem', fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '0.05em' }}>KOMENTAR</span>}
            </button>
            {isAdmin && (
              <>
                <button onClick={e => { e.stopPropagation(); onCopyWeek(week.id) }}
                  title="Kopiraj tjedan"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', width: '28px', height: '28px', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}>
                  <Copy size={12} />
                </button>
                <button onClick={e => { e.stopPropagation(); setConfirmDeleteWeek(true) }} className="icon-btn-danger">
                  <Trash2 size={13} />
                </button>
                {confirmDeleteWeek && (
                  <ConfirmDialog
                    message={`Jeste li sigurni da želite obrisati Tjedan ${week.week_number}? Ova akcija je nepovratna.`}
                    onConfirm={() => { setConfirmDeleteWeek(false); onDeleteWeek(week.id) }}
                    onCancel={() => setConfirmDeleteWeek(false)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Day grid overview — only when collapsed */}
        {total > 0 && !open && (
          <div className="day-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(total, 7)}, 1fr)`, margin: '16px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {week.workouts?.map((w, i) => (
              <div key={w.id} style={{ padding: '10px 12px', borderRight: i < total - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', background: w.completed ? 'rgba(34,197,94,0.06)' : 'rgba(0,0,0,0.2)', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.52rem', letterSpacing: '0.22em', color: w.completed ? '#4ade80' : '#666', fontFamily: 'var(--fm)', fontWeight: 800 }}>
                    D{i + 1}
                  </span>
                  {w.completed && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }}>
                      <Check size={6} color="#fff" strokeWidth={3.5} />
                    </div>
                  )}
                </div>
                {/* Bottom accent */}
                <div style={{ height: '2px', marginTop: '8px', background: w.completed ? '#22c55e' : 'rgba(255,255,255,0.08)', borderRadius: '1px', boxShadow: w.completed ? '0 0 8px rgba(34,197,94,0.4)' : 'none' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Workout cards ── */}
      {open && (
        <div style={{ padding: '22px 14px 14px', background: '#080808' }}>
          {[...(week.workouts ?? [])].sort((a, b) => a.workout_date.localeCompare(b.workout_date)).map((w, i, arr) => (
            <WorkoutCard key={w.id} workout={w} exercises={exercises} isAdmin={isAdmin} userId={userId} weekNumber={week.week_number}
              onUpdateWorkout={onUpdateWorkout} onDeleteWorkout={onDeleteWorkout}
              onAddExercise={onAddExercise} onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise}
              onCopyWorkout={onCopyWorkout ? () => onCopyWorkout(w.id) : undefined}
              onMoveWorkout={onMoveWorkout ? (dir) => onMoveWorkout(w.id, dir) : undefined}
              isFirst={i === 0} isLast={i === arr.length - 1}
              allWeeks={allWeeks?.filter(aw => aw.id !== week.id)}
              onCopyWorkoutToWeek={onCopyWorkoutToWeek ? (targetWeekId) => onCopyWorkoutToWeek(w.id, targetWeekId) : undefined} />
          ))}
          {isAdmin && (
            <button onClick={handleAddWorkout} className="add-btn">
              <Plus size={11} /> DODAJ DAN TRENINGA
            </button>
          )}
        </div>
      )}

      {showNotes && (
        <WeekNotesModal
          notes={week.notes ?? null}
          isAdmin={isAdmin}
          onSave={v => onUpdateWeek(week.id, { notes: v || null })}
          onClose={() => setShowNotes(false)}
        />
      )}
    </div>
  )
}