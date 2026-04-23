'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check, Search,
  GripVertical, Loader2, LogOut,
  User, Shield, X, Dumbbell, BarChart2, MessageSquare, Copy
} from 'lucide-react'
import type { Exercise, WorkoutExercise, Workout, Week, SetLog, Competition } from './types'

const supabase = createClient()

// ─── AVATAR ICONS ─────────────────────────────────────────────────
export const AVATARS: { id: string; label: string; svg: string }[] = [
  { id: 'barbell', label: 'Šipka',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="19" width="14" height="2" fill="currentColor"/><rect x="5" y="17" width="3" height="6" rx="1" fill="currentColor"/><rect x="8" y="15" width="3" height="10" rx="1" fill="currentColor" opacity=".85"/><rect x="29" y="17" width="3" height="6" rx="1" fill="currentColor"/><rect x="29" y="15" width="3" height="10" rx="1" fill="currentColor" opacity=".85"/><rect x="11" y="19.5" width="18" height="1" fill="currentColor" opacity=".5"/><rect x="3" y="18" width="5" height="4" rx=".8" fill="currentColor" opacity=".6"/><rect x="32" y="18" width="5" height="4" rx=".8" fill="currentColor" opacity=".6"/></svg>` },
  { id: 'squat', label: 'Čučanj',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="6" r="2.5" fill="currentColor"/><rect x="4" y="13" width="32" height="2.5" rx="1.25" fill="currentColor" opacity=".35"/><rect x="4" y="12" width="4.5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="31.5" y="12" width="4.5" height="5" rx="1" fill="currentColor" opacity=".7"/><path d="M17 15.5c-.5 0-4 5-5.5 9.5l3 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 15.5c.5 0 4 5 5.5 9.5l-3 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 27.5l5.5 6 5.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 15.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".6"/></svg>` },
  { id: 'deadlift', label: 'Mrtvo dizanje',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="5.5" r="2.5" fill="currentColor"/><path d="M20 8v11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M20 19c-3 0-6 1-7 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 19c3 0 6 1 7 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="3" y="28" width="34" height="3" rx="1.5" fill="currentColor" opacity=".45"/><rect x="3" y="26" width="5.5" height="7" rx="1.2" fill="currentColor" opacity=".75"/><rect x="31.5" y="26" width="5.5" height="7" rx="1.2" fill="currentColor" opacity=".75"/><path d="M13 22l-1 6M27 22l1 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".55"/></svg>` },
  { id: 'bench', label: 'Bench press',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="6" r="2.5" fill="currentColor"/><path d="M20 8.5v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="5" y="15.5" width="30" height="2.5" rx="1.25" fill="currentColor" opacity=".35"/><rect x="5" y="14.5" width="4.5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="30.5" y="14.5" width="4.5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="8" y="22" width="24" height="5.5" rx="2" fill="currentColor" opacity=".6"/><rect x="10" y="27.5" width="4" height="7" rx="1.5" fill="currentColor" opacity=".55"/><rect x="26" y="27.5" width="4" height="7" rx="1.5" fill="currentColor" opacity=".55"/></svg>` },
  { id: 'kettlebell', label: 'Kettlebell',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M12 16c-1 1-2 3-2 5a10 10 0 0 0 20 0c0-2-1-4-2-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".5"/><ellipse cx="20" cy="24" rx="9" ry="9.5" fill="currentColor" opacity=".85"/><ellipse cx="20" cy="24" rx="5" ry="5.5" fill="currentColor" opacity="-.3"/><path d="M16.5 13.5h7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="24" r="3" fill="white" opacity=".12"/></svg>` },
  { id: 'dumbbell', label: 'Bučica',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="17" y="19" width="6" height="2" rx="1" fill="currentColor"/><rect x="9" y="16" width="3.5" height="8" rx="1.2" fill="currentColor" opacity=".9"/><rect x="7" y="17.5" width="3" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="27.5" y="16" width="3.5" height="8" rx="1.2" fill="currentColor" opacity=".9"/><rect x="30" y="17.5" width="3" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="12.5" y="19.2" width="15" height="1.6" rx=".8" fill="currentColor" opacity=".6"/></svg>` },
  { id: 'trophy', label: 'Trofej',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 5h14v13a7 7 0 0 1-14 0V5Z" fill="currentColor" opacity=".85"/><path d="M13 9H7a4 4 0 0 0 4.5 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity=".7"/><path d="M27 9h6a4 4 0 0 1-4.5 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity=".7"/><rect x="17" y="26" width="6" height="4" rx="1" fill="currentColor" opacity=".6"/><rect x="13" y="30" width="14" height="3.5" rx="1.5" fill="currentColor" opacity=".55"/><path d="M17 13l2.5 3 3-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></svg>` },
  { id: 'flame', label: 'Plamen',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 3c0 0 9 10 9 19a9 9 0 0 1-18 0c0-5 2.5-9 5-11.5-1.5 5 2.5 7 2.5 7S20 11 20 3Z" fill="currentColor" opacity=".9"/><path d="M20 28a4 4 0 0 0 4-4c0-3-4-7-4-7s-4 4-4 7a4 4 0 0 0 4 4Z" fill="white" opacity=".2"/><path d="M20 30a2 2 0 0 0 2-2c0-1.5-2-3.5-2-3.5s-2 2-2 3.5a2 2 0 0 0 2 2Z" fill="white" opacity=".35"/></svg>` },
  { id: 'lightning', label: 'Munja',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23 3L9 22h13l-5 15 19-22H23L23 3Z" fill="currentColor" opacity=".9"/><path d="M23 3L9 22h13l-5 15 19-22H23Z" stroke="currentColor" stroke-width=".5" stroke-linejoin="round" fill="none" opacity=".3"/></svg>` },
  { id: 'shield', label: 'Štit',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 3L5 9.5v12C5 30 11.5 35.5 20 38c8.5-2.5 15-8 15-16.5V9.5L20 3Z" fill="currentColor" opacity=".8"/><path d="M13 20l5 5.5 9-10" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/></svg>` },
  { id: 'crown', label: 'Kruna',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 29h28M7 13l5.5 8.5L20 9l7.5 12.5L33 13l-3 16H10L7 13Z" fill="currentColor" opacity=".8"/><circle cx="7" cy="13" r="2.5" fill="currentColor"/><circle cx="20" cy="9" r="2.5" fill="currentColor"/><circle cx="33" cy="13" r="2.5" fill="currentColor"/><rect x="9" y="29" width="22" height="5" rx="1.5" fill="currentColor" opacity=".55"/><path d="M14 21h12" stroke="white" stroke-width="1.2" opacity=".25" stroke-linecap="round"/></svg>` },
  { id: 'skull', label: 'Lubanja',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 22c0-5.52 4.48-10 10-10s10 4.48 10 10c0 3.5-1.8 6.6-4.5 8.4V34h-11v-3.6C11.8 28.6 10 25.5 10 22Z" fill="currentColor" opacity=".85"/><rect x="14.5" y="34" width="11" height="3" rx="1" fill="currentColor" opacity=".5"/><rect x="14" y="31.5" width="2.5" height="2.5" rx=".5" fill="white" opacity=".15"/><rect x="23.5" y="31.5" width="2.5" height="2.5" rx=".5" fill="white" opacity=".15"/><ellipse cx="16" cy="22" rx="3" ry="3.5" fill="white" opacity=".2"/><ellipse cx="24" cy="22" rx="3" ry="3.5" fill="white" opacity=".2"/><path d="M18 27h4M20 25v4" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity=".18"/></svg>` },
  { id: 'fist', label: 'Šaka',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="17" width="20" height="16" rx="4" fill="currentColor" opacity=".85"/><rect x="12" y="11" width="5" height="8" rx="2.5" fill="currentColor" opacity=".9"/><rect x="17.5" y="10" width="5" height="9" rx="2.5" fill="currentColor" opacity=".9"/><rect x="23" y="11" width="5" height="8" rx="2.5" fill="currentColor" opacity=".9"/><rect x="8" y="20" width="5" height="7" rx="2.5" fill="currentColor" opacity=".8"/><path d="M12 21h16M12 25h16" stroke="white" stroke-width=".8" opacity=".12"/></svg>` },
  { id: 'wolf', label: 'Vuk',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 34C9 34 7 24 7 20c0-2 1-5 3-7L6 7l7 5c2-1 4.5-2 7-2s5 1 7 2l7-5-4 6c2 2 3 5 3 7 0 4-2 14-13 14Z" fill="currentColor" opacity=".85"/><path d="M6 7l4 6" stroke="currentColor" stroke-width="1" opacity=".4" stroke-linecap="round"/><path d="M34 7l-4 6" stroke="currentColor" stroke-width="1" opacity=".4" stroke-linecap="round"/><ellipse cx="15.5" cy="21" rx="2" ry="2.5" fill="white" opacity=".22"/><ellipse cx="24.5" cy="21" rx="2" ry="2.5" fill="white" opacity=".22"/><path d="M17 27.5c1 1.5 5 1.5 6 0" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity=".3"/></svg>` },
  { id: 'bull', label: 'Bik',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12c-3 0-5 2-5 4s1.5 3 3 3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".7"/><path d="M32 12c3 0 5 2 5 4s-1.5 3-3 3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".7"/><ellipse cx="20" cy="22" rx="13" ry="12" fill="currentColor" opacity=".85"/><ellipse cx="15" cy="20" rx="2.5" ry="3" fill="white" opacity=".2"/><ellipse cx="25" cy="20" rx="2.5" ry="3" fill="white" opacity=".2"/><ellipse cx="20" cy="27" rx="4" ry="2.5" fill="white" opacity=".15"/><circle cx="18" cy="27" r="1" fill="white" opacity=".3"/><circle cx="22" cy="27" r="1" fill="white" opacity=".3"/></svg>` },
  { id: 'diamond', label: 'Dijamant',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4l16 10-16 22L4 14 20 4Z" fill="currentColor" opacity=".85"/><path d="M4 14h32M12 14L20 4M28 14L20 4M12 14L20 36M28 14L20 36" stroke="white" stroke-width="1" opacity=".18"/><path d="M14 14l6-8 6 8" fill="white" opacity=".12"/></svg>` },
  { id: 'mountain', label: 'Planina',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 35L15 12l5 7 3-4 14 20H3Z" fill="currentColor" opacity=".8"/><path d="M15 12l5 7 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".5"/><path d="M20 12l-2 3-3-1" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity=".35"/><path d="M20 12l2 3 2.5-.5" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity=".22"/></svg>` },
  { id: 'target', label: 'Meta',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="16" stroke="currentColor" stroke-width="2" opacity=".3"/><circle cx="20" cy="20" r="11" stroke="currentColor" stroke-width="2" opacity=".55"/><circle cx="20" cy="20" r="6" stroke="currentColor" stroke-width="2" opacity=".8"/><circle cx="20" cy="20" r="2.5" fill="currentColor"/><line x1="20" y1="4" x2="20" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".4"/><line x1="20" y1="31" x2="20" y2="36" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".4"/><line x1="4" y1="20" x2="9" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".4"/><line x1="31" y1="20" x2="36" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".4"/></svg>` },
  { id: 'star', label: 'Zvijezda',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4l4.5 9.5 10.5 1.5-7.5 7.5 1.8 10.5L20 28.2l-9.3 4.8 1.8-10.5L5 15l10.5-1.5L20 4Z" fill="currentColor" opacity=".9"/><path d="M20 4l4.5 9.5 10.5 1.5-7.5 7.5 1.8 10.5L20 28.2l-9.3 4.8 1.8-10.5L5 15l10.5-1.5Z" stroke="white" stroke-width=".5" opacity=".2" stroke-linejoin="round"/></svg>` },
  { id: 'anchor', label: 'Sidro',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="10" r="3.5" stroke="currentColor" stroke-width="2.2" fill="none"/><line x1="20" y1="13.5" x2="20" y2="34" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 34c1-6 4-10 8-10s7 4 8 10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".85"/><line x1="12" y1="18" x2="28" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/><circle cx="12" cy="34" r="2.5" fill="currentColor" opacity=".7"/><circle cx="28" cy="34" r="2.5" fill="currentColor" opacity=".7"/></svg>` },
]

export function AvatarSvg({ iconId, size = 32, color = 'currentColor' }: { iconId: string; size?: number; color?: string }) {
  const icon = AVATARS.find(a => a.id === iconId) ?? AVATARS[0]
  return (
    <div style={{ width: size, height: size, color, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: icon.svg }} />
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
        <img src="/slike/logopng.png" alt="LWL UP" width="49" height="36" className="nav-logo" style={{ height: '36px', opacity: 0.95, transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.25s ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.12)'; (e.currentTarget as HTMLImageElement).style.filter = 'drop-shadow(0 0 12px rgba(255,255,255,0.7)) drop-shadow(0 0 28px rgba(255,255,255,0.35))' }}
          onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLImageElement).style.filter = 'none' }} />
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
export function AppNav({ athleteName, isAdmin, onLogout, avatarIcon, userId }: {
  athleteName: string; isAdmin: boolean; onLogout: () => void; avatarIcon?: string; userId?: string
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
        <img src="/slike/logopng.png" alt="LWL UP" width="49" height="36" className="nav-logo" style={{ height: '36px', opacity: 0.95, transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.25s ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.12)'; (e.currentTarget as HTMLImageElement).style.filter = 'drop-shadow(0 0 12px rgba(255,255,255,0.7)) drop-shadow(0 0 28px rgba(255,255,255,0.35))' }}
          onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLImageElement).style.filter = 'none' }} />
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
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '300px', background: 'rgba(10,10,16,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.85)', zIndex: 300, overflow: 'hidden', backdropFilter: 'blur(40px)', animation: 'appnavDrop 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
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
          <div className="comp-days-pill" style={{ padding: '0 24px', background: daysOut <= 14 ? 'rgba(239,68,68,0.12)' : daysOut <= 30 ? 'rgba(250,204,21,0.08)' : 'rgba(34,197,94,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: '90px' }}>
            <div className="comp-days-num" style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: daysOut <= 14 ? '#ef4444' : daysOut <= 30 ? '#facc15' : '#22c55e' }}>{daysOut}</div>
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
export function SetLogSection({ we, userId, isAdmin, onAggregateUpdate }: {
  we: WorkoutExercise; userId: string; isAdmin: boolean
  onAggregateUpdate: (data: Partial<WorkoutExercise>) => void
}) {
  const plannedSets = we.planned_sets ?? 3
  const [logs, setLogs] = useState<SetLog[]>([])
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
    const { data: existing } = await supabase.from('set_logs')
      .select('id')
      .eq('workout_exercise_id', we.id)
      .eq('athlete_id', userId)
      .eq('set_number', setNum)
      .maybeSingle()
    if (existing) {
      await supabase.from('set_logs').update({ [field]: value }).eq('id', existing.id)
    } else {
      await supabase.from('set_logs').insert({
        workout_exercise_id: we.id, athlete_id: userId, set_number: setNum, [field]: value,
      })
    }
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

    const filled = updated.filter(s => s.weight_kg || s.reps)
    if (filled.length > 0) {
      const avgKg = filled.reduce((s, x) => s + (x.weight_kg ?? 0), 0) / filled.length
      const lastRpe = filled[filled.length - 1].rpe
      onAggregateUpdate({ actual_weight_kg: avgKg, actual_rpe: lastRpe })
    }
    propagateCounts(updated)
    setSaving(false)
  }

  const markSetDone = async (setNum: number) => {
    const s = logs.find(l => l.set_number === setNum)
    if (!s) return
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
  }

  // Both admin and lifter use the same table layout.
  // Admin routes saves through service-role API; lifter writes directly via anon client.
  const targetRpe = we.target_rpe ?? we.planned_rpe
  const SLR_GRID = '52px 1fr 1fr 80px 44px'
  const cellStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.07)' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#e8e8ff', padding: '5px 6px', fontSize: '1rem', outline: 'none', fontFamily: 'var(--fm)', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }

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
          <span style={{ fontSize: '0.4rem', color: '#818cf8', letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'var(--fm)' }}>
            KG{we.planned_weight_kg ? ` · ${we.planned_weight_kg}` : ''}
          </span>
        </div>
        <div style={{ ...cellStyle, padding: '6px 0' }}>
          <span style={{ fontSize: '0.4rem', color: '#aaa', letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'var(--fm)' }}>
            REPS{we.planned_reps ? ` · ${we.planned_reps}` : ''}
          </span>
        </div>
        <div className="slr-rpe" style={{ ...cellStyle, padding: '6px 0' }}>
          <span style={{ fontSize: '0.4rem', color: '#facc15', letterSpacing: '0.22em', fontWeight: 700, fontFamily: 'var(--fm)' }}>
            RPE{targetRpe ? ` · ${targetRpe}` : ''}
          </span>
        </div>
        <div style={{ ...cellStyle, padding: '6px 0', borderRight: 'none' }}>
          <span style={{ fontSize: '0.4rem', color: '#facc1588', letterSpacing: '0.18em', fontWeight: 700, fontFamily: 'var(--fm)' }}>{isAdmin ? 'TOP' : '✓'}</span>
        </div>
      </div>

      {logs.map((log, i) => (
        <div key={i} className="set-log-row" style={{ display: 'grid', gridTemplateColumns: SLR_GRID, alignItems: 'stretch', background: log.completed ? 'rgba(34,197,94,0.07)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.013)', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s', minHeight: '52px' }}>

          {/* Set label */}
          <div style={{ ...cellStyle, justifyContent: 'flex-start', padding: '12px 14px', gap: '8px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: log.completed ? '#22c55e' : 'rgba(255,255,255,0.15)', boxShadow: log.completed ? '0 0 5px rgba(34,197,94,0.5)' : 'none', transition: 'all 0.2s' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: log.completed ? '#22c55e' : '#6366f1', fontFamily: 'var(--fd)', letterSpacing: '0.06em' }}>S{log.set_number}</span>
          </div>

          {/* KG input */}
          <div style={{ ...cellStyle, padding: '10px 12px', background: 'rgba(99,102,241,0.04)' }}>
            <input
              type="number" step="2.5"
              value={localVals[`${log.set_number}_weight_kg`] ?? ''}
              onChange={e => { setLocalVals(v => ({ ...v, [`${log.set_number}_weight_kg`]: e.target.value })); scheduleSet(log.set_number, 'weight_kg', e.target.value) }}
              onFocus={e => { focusedKey.current = `${log.set_number}_weight_kg`; e.target.style.borderBottomColor = 'rgba(129,140,248,0.8)' }}
              onBlur={e => { focusedKey.current = null; e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)'; flushSet(log.set_number, 'weight_kg', e.target.value) }}
              placeholder={we.planned_weight_kg ? String(we.planned_weight_kg) : '—'}
              style={{ ...inputStyle, color: '#c7d2fe' }}
            />
          </div>

          {/* REPS input */}
          <div style={{ ...cellStyle, padding: '10px 12px' }}>
            <input
              type="text"
              value={localVals[`${log.set_number}_reps`] ?? ''}
              onChange={e => { setLocalVals(v => ({ ...v, [`${log.set_number}_reps`]: e.target.value })); scheduleSet(log.set_number, 'reps', e.target.value) }}
              onFocus={e => { focusedKey.current = `${log.set_number}_reps`; e.target.style.borderBottomColor = 'rgba(255,255,255,0.6)' }}
              onBlur={e => { focusedKey.current = null; e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)'; flushSet(log.set_number, 'reps', e.target.value) }}
              placeholder={we.planned_reps ?? '—'}
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
              placeholder="—"
              style={{ ...inputStyle, color: log.rpe && targetRpe ? (Number(log.rpe) - Number(targetRpe) > 1 ? '#f87171' : Number(log.rpe) - Number(targetRpe) > 0 ? '#facc15' : '#4ade80') : '#e0e0e0' }}
            />
          </div>

          {/* Admin: top set toggle ★ | Lifter: done toggle ✓ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isAdmin ? (
              <button onClick={() => toggleTopSet(log.set_number)}
                title={log.is_top_set ? 'Makni top set' : 'Označi kao top set'}
                style={{ background: log.is_top_set ? 'rgba(250,204,21,0.12)' : 'transparent', border: 'none', cursor: 'pointer', color: log.is_top_set ? '#facc15' : '#333', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontSize: '0.9rem' }}>
                {log.is_top_set ? '★' : '☆'}
              </button>
            ) : (
              <button onClick={() => markSetDone(log.set_number)}
                style={{ background: log.completed ? 'rgba(34,197,94,0.15)' : 'transparent', border: 'none', cursor: 'pointer', color: log.completed ? '#22c55e' : '#444', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                title={log.completed ? 'Poništi' : 'Odrađeno'}>
                <Check size={14} strokeWidth={log.completed ? 3 : 1.5} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
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
  const [historyLogs, setHistoryLogs]   = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const save = (field: keyof WorkoutExercise, val: string, isNum = false) =>
    onUpdate(we.id, { [field]: isNum ? (val ? Number(val) : null) : (val || null) })

  const loadHistory = async () => {
    if (historyLoading) return
    setHistoryLoading(true)
    try {
      // Find workout_exercise IDs for the same exercise in the previous week
      // by joining through workouts → weeks filtered by week_number
      const targetWeek = weekNumber ? weekNumber - 1 : null
      if (!targetWeek || targetWeek < 1) {
        setHistoryLogs([])
        setHistoryLoading(false)
        return
      }

      // Get workout_exercise IDs for the same exercise in previous week of same block
      const { data: weData } = await supabase
        .from('workout_exercises')
        .select('id, workouts!inner(weeks!inner(week_number))')
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
        .select('set_number, weight_kg, reps, rpe, completed')
        .eq('athlete_id', userId)
        .in('workout_exercise_id', weIds)
        .order('set_number')

      setHistoryLogs(data ?? [])
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
        /* Admin: compact 2-col — name+info | delete */
        <div className="ex-row-main" style={{ display: 'grid', gridTemplateColumns: '1fr 36px', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '52px' }}>
          {/* Name + inline plan info */}
          <div onClick={() => setSetsOpen(v => !v)} style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', cursor: 'pointer', minWidth: 0 }}>
            {/* Row 1: icon + name + buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#a78bfa', fontFamily: 'var(--fm)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{we.exercise?.name ?? '—'}</span>
              <button onClick={toggleHistory}
                title="Usporedi s prošlim tjednom"
                style={{ background: showHistory ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showHistory ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showHistory ? '#818cf8' : '#444', fontSize: '0.55rem', fontWeight: 800, flexShrink: 0, transition: 'all 0.15s' }}>
                i
              </button>
              <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
                style={{ background: hasNote ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hasNote ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: hasNote ? '#f59e0b' : '#555', fontSize: '0.52rem', fontWeight: 800, padding: '2px 6px', cursor: 'pointer', fontFamily: 'var(--fm)', letterSpacing: '0.06em', flexShrink: 0, transition: 'all 0.15s' }}>
                {expanded ? '▲' : (hasNote ? '!' : '+')}
              </button>
              <div style={{ color: setsOpen ? '#818cf8' : '#333', transition: 'transform 0.2s, color 0.2s', transform: setsOpen ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>
                <ChevronRight size={11} />
              </div>
            </div>
            {/* Row 2: sets × reps · kg · RPE — editable, single line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '15px' }} onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: '0.62rem', color: '#666', fontFamily: 'var(--fm)' }}>
                <EditableField value={we.planned_sets} placeholder="3" type="number" small onSave={v => save('planned_sets', v, true)} />
              </span>
              <span style={{ fontSize: '0.6rem', color: '#444' }}>×</span>
              <span style={{ fontSize: '0.62rem', color: '#666', fontFamily: 'var(--fm)' }}>
                <EditableField value={we.planned_reps} placeholder="reps" small onSave={v => save('planned_reps', v)} />
              </span>
              <span style={{ fontSize: '0.6rem', color: '#333' }}>·</span>
              <span style={{ fontSize: '0.62rem', color: '#818cf8' }}>
                <EditableField value={we.planned_weight_kg} placeholder="kg" type="number" small onSave={v => save('planned_weight_kg', v, true)} />
              </span>
              <span style={{ fontSize: '0.6rem', color: '#333' }}>·</span>
              <span style={{ fontSize: '0.62rem', color: '#facc15' }}>
                @<EditableField value={we.target_rpe ?? we.planned_rpe} placeholder="—" type="number" small onSave={v => save('target_rpe', v, true)} />
              </span>
            </div>
            {/* Coach note */}
            {we.coach_note && (
              <div style={{ fontSize: '0.6rem', color: '#f59e0b', paddingLeft: '15px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ↳ {we.coach_note}
              </div>
            )}
          </div>
          {/* Delete */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => onDelete(we.id)} className="icon-btn-danger"><Trash2 size={11} /></button>
          </div>
        </div>
      ) : (
        /* Lifter: 2-col — status | name+coach note */
        <div className="ex-row-main" style={{ display: 'grid', gridTemplateColumns: '52px 1fr', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '58px' }}>
          {/* Status dot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={we.completed ? '#4ade80' : '#555'} strokeWidth="2.5">
              {we.completed
                ? <><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></>
                : <circle cx="12" cy="12" r="8"/>}
            </svg>
          </div>
          {/* Name + coach instruction */}
          <div onClick={() => setSetsOpen(v => !v)} style={{ padding: '13px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={we.completed ? '#4ade80' : '#6366f1'} strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: we.completed ? '#86efac' : '#a78bfa', fontFamily: 'var(--fm)', letterSpacing: '-0.01em' }}>{we.exercise?.name ?? '—'}</span>
              {/* ⓘ history button */}
              <button onClick={toggleHistory}
                title="Usporedi s prošlim tjednom"
                style={{ background: showHistory ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showHistory ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showHistory ? '#818cf8' : '#444', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0, transition: 'all 0.15s' }}>
                i
              </button>
              {/* Plan label inline */}
              {(we.planned_sets || we.planned_reps) && (
                <span style={{ fontSize: '0.6rem', color: '#666', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '2px 7px', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' as const }}>
                  {we.planned_sets}×{we.planned_reps}{we.planned_weight_kg ? ` · ${we.planned_weight_kg}kg` : ''}
                  {(we.target_rpe ?? we.planned_rpe) ? ` @ RPE ${we.target_rpe ?? we.planned_rpe}` : ''}
                </span>
              )}
              <div style={{ marginLeft: 'auto', color: setsOpen ? '#818cf8' : '#333', transition: 'transform 0.2s, color 0.2s', transform: setsOpen ? 'rotate(90deg)' : 'none' }}>
                <ChevronRight size={12} />
              </div>
            </div>
            {/* Coach note — always visible as instruction */}
            {we.coach_note && (
              <div style={{ fontSize: '0.65rem', color: '#f59e0b', letterSpacing: '0.04em', paddingLeft: '18px', lineHeight: 1.5 }}>
                ↳ {we.coach_note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History panel (prošli tjedan) ── */}
      {showHistory && (
        <div style={{ background: '#060612', borderBottom: '1px solid rgba(129,140,248,0.12)', borderTop: '1px solid rgba(129,140,248,0.1)', padding: '12px 16px', animation: 'fadeUp 0.18s ease' }}>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.25em', color: '#818cf8', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '8px' }}>PROŠLI TJEDAN — {we.exercise?.name}</div>
          {historyLoading ? (
            <div style={{ fontSize: '0.7rem', color: '#444', display: 'flex', alignItems: 'center', gap: '6px' }}><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Učitavanje...</div>
          ) : historyLogs.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: '#333', fontFamily: 'var(--fm)' }}>Nema podataka za prošli tjedan.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', gap: '0', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
              {['SET','KG','REPS','RPE'].map(h => (
                <div key={h} style={{ padding: '5px 10px', background: 'rgba(0,0,0,0.3)', fontSize: '0.38rem', letterSpacing: '0.2em', color: '#444', fontWeight: 700, fontFamily: 'var(--fm)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</div>
              ))}
              {historyLogs.map((l: any, i: number) => (
                [
                  <div key={`s${i}`} style={{ padding: '7px 10px', fontSize: '0.72rem', color: '#6366f1', fontWeight: 800, fontFamily: 'var(--fd)', borderBottom: i < historyLogs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>S{l.set_number}</div>,
                  <div key={`kg${i}`} style={{ padding: '7px 10px', fontSize: '0.78rem', color: '#c7d2fe', fontWeight: 700, borderBottom: i < historyLogs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{l.weight_kg ?? '—'}</div>,
                  <div key={`r${i}`} style={{ padding: '7px 10px', fontSize: '0.78rem', color: '#94a3b8', borderBottom: i < historyLogs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{l.reps ?? '—'}</div>,
                  <div key={`rpe${i}`} style={{ padding: '7px 10px', fontSize: '0.78rem', color: '#fbbf24', borderBottom: i < historyLogs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{l.rpe ?? '—'}</div>,
                ]
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Expanded details (admin: tempo/odmor/bilješka, lifter: moja bilješka) ── */}
      {expanded && (
        <div style={{ background: '#060610', borderBottom: '1px solid rgba(255,255,255,0.08)', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
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
                <div style={{ fontSize: '0.46rem', color: '#6b8cff', letterSpacing: '0.2em', marginBottom: '6px' }}>MOJA BILJEŠKA</div>
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
export function WorkoutCard({ workout, exercises, isAdmin, userId, weekNumber, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }: {
  workout: Workout; exercises: Exercise[]; isAdmin: boolean; userId: string; weekNumber?: number
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void
  onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void
  onDeleteExercise: (id: string) => void
}) {
  const ssKey = `workout-open-${workout.id}`
  const [open, setOpen] = useState(() => {
    try { const v = sessionStorage.getItem(ssKey); return v === 'true' } catch { return false }
  })
  const [showPicker, setShowPicker] = useState(false)
  const exCount = workout.workout_exercises?.length ?? 0

  // ── Local exercise order (for optimistic drag-reorder) ──
  const [localExs, setLocalExs] = useState(() =>
    [...(workout.workout_exercises ?? [])].sort((a, b) => a.exercise_order - b.exercise_order)
  )
  const localExsRef = useRef(localExs)
  useEffect(() => { localExsRef.current = localExs }, [localExs])

  // Sync if exercises are added / removed externally
  useEffect(() => {
    const incoming = workout.workout_exercises ?? []
    const cur = localExsRef.current
    const same = incoming.length === cur.length && incoming.every(e => cur.find(l => l.id === e.id))
    if (!same) setLocalExs([...incoming].sort((a, b) => a.exercise_order - b.exercise_order))
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
          style={{ background: workout.completed ? '#0a1c0e' : '#0c0c18', borderBottom: open ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: 'pointer', padding: '0' }}
          onClick={() => { const next = !open; setOpen(next); try { sessionStorage.setItem(ssKey, String(next)) } catch {} }}>
          {/* Top accent line — amber for active days, green for completed */}
          <div style={{ height: '3px', background: workout.completed ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 60%, #15803d 100%)' : 'linear-gradient(90deg, rgba(245,158,11,0.55) 0%, rgba(251,191,36,0.75) 50%, rgba(245,158,11,0.4) 100%)', boxShadow: workout.completed ? '0 0 14px rgba(34,197,94,0.4)' : '0 0 10px rgba(245,158,11,0.2)', transition: 'all 0.3s' }} />

          <div className='workout-header-inner' style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Workout name — large, bold */}
            <div style={{ flex: 1 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: workout.completed ? '#86efac' : '#f0f0ff', fontFamily: 'var(--fd)', letterSpacing: '0.02em', textTransform: 'uppercase' as const }}>
                <EditableField value={workout.day_name} placeholder="DAN TRENINGA" onSave={v => onUpdateWorkout(workout.id, { day_name: v })} />
              </div>
            </div>

            {/* Right controls */}
            <div className="workout-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {/* Ex count badge */}
              {exCount > 0 && (
                <div style={{ fontSize: '0.54rem', color: '#8888bb', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.12em', fontWeight: 700 }}>
                  {exCount} VJ
                </div>
              )}
              {/* Completed toggle — only for lifter */}
              {!isAdmin && (
                <div onClick={e => {
                  e.stopPropagation()
                  const newDone = !workout.completed
                  onUpdateWorkout(workout.id, { completed: newDone })
                  if (newDone) {
                    workout.workout_exercises?.forEach(we => onUpdateExercise(we.id, { completed: true }))
                  }
                }}
                  className={`done-badge${workout.completed ? ' done-badge-active' : ''}`}>
                  {workout.completed ? <Check size={10} color="#22c55e" strokeWidth={3} /> : <div style={{ width: '8px', height: '8px', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '2px' }} />}
                  <span>{workout.completed ? 'GOTOVO' : 'ODRADITI'}</span>
                </div>
              )}
              {/* Delete — admin only */}
              {isAdmin && (
                <button onClick={e => { e.stopPropagation(); onDeleteWorkout(workout.id) }} className="icon-btn-danger">
                  <Trash2 size={11} />
                </button>
              )}
              {/* Expand arrow */}
              <div style={{ color: open ? '#818cf8' : '#444', transition: 'transform 0.25s, color 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Exercise table — dark with sharp grid ── */}
        {open && (
          <div style={{ background: '#07070e', animation: 'fadeUp 0.2s ease' }}>

            {/* Exercises */}
            {localExs.map((we, idx) => (
              <div
                key={we.id}
                ref={el => { if (el) rowRefs.current.set(we.id, el); else rowRefs.current.delete(we.id) }}
                style={{
                  display: 'flex', alignItems: 'stretch',
                  opacity: dragState?.id === we.id ? 0.3 : 1,
                  borderTop: dragState && dragState.overIdx === idx && dragState.id !== we.id ? '2px solid #6366f1' : undefined,
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
                      background: dragState?.id === we.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px',
                      border: `1.5px dashed ${dragState?.id === we.id ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.15s',
                    }}>
                      <GripVertical size={11} color={dragState?.id === we.id ? '#6366f1' : '#3a3a5c'} />
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

export function WeekPanel({ week, exercises, isAdmin, userId, onDeleteWeek, onCopyWeek, onUpdateWeek, onAddWorkout, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }: {
  week: Week; exercises: Exercise[]; isAdmin: boolean; userId: string
  onDeleteWeek: (id: string) => void; onCopyWeek: (id: string) => void; onUpdateWeek: (id: string, data: Partial<Week>) => void
  onAddWorkout: (weekId: string) => void
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void; onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void; onDeleteExercise: (id: string) => void
}) {
  const ssKey = `week-open-${week.id}`
  const [open, setOpen] = useState(() => {
    try { const v = sessionStorage.getItem(ssKey); return v === null ? true : v === 'true' } catch { return true }
  })
  const [showNotes, setShowNotes] = useState(false)
  const addWorkoutLocked = useRef(false)

  const handleAddWorkout = () => {
    if (addWorkoutLocked.current) return
    addWorkoutLocked.current = true
    onAddWorkout(week.id)
    setTimeout(() => { addWorkoutLocked.current = false }, 500)
  }

  const { totalSets, doneSets, total, pct, totalEx, doneEx } = useMemo(() => {
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
    return { totalSets, doneSets, total, pct, totalEx, doneEx }
  }, [week.workouts])

  const hasNotes = !!(week.notes?.trim())

  return (
    <div style={{ marginBottom: '20px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,0.6), inset 4px 0 0 rgba(99,102,241,0.7), 0 0 0 1px rgba(255,255,255,0.03)' }}>

      {/* ── Week header — editorial black band ── */}
      <div style={{ background: 'linear-gradient(160deg, #0e0e1c 0%, #080810 100%)', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.09)' : 'none' }}
        onClick={() => { const next = !open; setOpen(next); try { sessionStorage.setItem(ssKey, String(next)) } catch {} }}>

        {/* Top: large week label row */}
        <div className="week-header-top" style={{ padding: 'clamp(14px,3vw,20px) clamp(16px,4vw,24px) 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            {/* Giant W number — accent color */}
            <span className="week-w-num" style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2rem,4.5vw,3.6rem)', fontWeight: 900, lineHeight: 1, background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.05em' }}>
              W{week.week_number}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '4px' }}>
            {/* Progress pill */}
            {total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px' }}>
                <div style={{ width: '52px', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, background: pct === 100 ? '#22c55e' : 'linear-gradient(90deg, #6366f1, #818cf8)', boxShadow: pct === 100 ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 8px rgba(99,102,241,0.5)', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)', borderRadius: '2px' }} />
                </div>
                <span style={{ fontSize: '0.54rem', color: pct === 100 ? '#4ade80' : '#8888bb', fontFamily: 'var(--fm)', fontWeight: 800, letterSpacing: '0.05em' }}>{totalSets > 0 ? `${doneSets}/${totalSets}` : `${doneEx}/${totalEx}`}</span>
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
                <button onClick={e => { e.stopPropagation(); onDeleteWeek(week.id) }} className="icon-btn-danger">
                  <Trash2 size={13} />
                </button>
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
                  {w.completed && <Check size={9} color="#22c55e" strokeWidth={3} />}
                </div>
                {/* Bottom accent */}
                <div style={{ height: '2px', marginTop: '8px', background: w.completed ? '#22c55e' : 'rgba(99,102,241,0.25)', borderRadius: '1px', boxShadow: w.completed ? '0 0 8px rgba(34,197,94,0.4)' : 'none' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Workout cards ── */}
      {open && (
        <div style={{ padding: '22px 14px 14px', background: '#08080f' }}>
          {week.workouts?.map(w => (
            <WorkoutCard key={w.id} workout={w} exercises={exercises} isAdmin={isAdmin} userId={userId} weekNumber={week.week_number}
              onUpdateWorkout={onUpdateWorkout} onDeleteWorkout={onDeleteWorkout}
              onAddExercise={onAddExercise} onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise} />
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