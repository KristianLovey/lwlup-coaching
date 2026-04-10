'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, X, ChevronRight } from 'lucide-react'
import { AppNav } from '../training/training-components'

const supabase = createClient()


interface Exercise {
  id: string
  name: string
  category: string
  notes: string
  created_at: string
}

// ── Category colour map ────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  'Squat':              '#6b8cff',
  'Bench':              '#f59e0b',
  'Deadlift':           '#22c55e',
  'Squat Variation':    '#818cf8',
  'Bench Variation':    '#fcd34d',
  'Deadlift Variation': '#4ade80',
  'Back Mid':           '#f87171',
  'Back Lats':          '#fb923c',
  'Quads':              '#a78bfa',
  'Hamstring':          '#34d399',
  'Glute':              '#f472b6',
  'Biceps Inner':       '#60a5fa',
  'Biceps Brachialis':  '#38bdf8',
  'Triceps Lateral':    '#e879f9',
  'Triceps Medial':     '#c084fc',
  'Delts Rear':         '#94a3b8',
  'Delts Side':         '#cbd5e1',
  'Delts Front':        '#e2e8f0',
  'Adductors':          '#fda4af',
}

const CATEGORY_GROUPS = [
  { label: 'KOMPETITIVNI LIFTOVI', cats: ['Squat', 'Bench', 'Deadlift'] },
  { label: 'VARIJACIJE', cats: ['Squat Variation', 'Bench Variation', 'Deadlift Variation'] },
  { label: 'UPPER', cats: ['Back Mid', 'Back Lats', 'Biceps Inner', 'Biceps Brachialis', 'Triceps Lateral', 'Triceps Medial', 'Delts Rear', 'Delts Side', 'Delts Front'] },
  { label: 'LOWER', cats: ['Quads', 'Hamstring', 'Glute', 'Adductors'] },
]

// Top-level filter structure
const TOP_FILTERS = [
  { id: 'ALL',   label: 'SVE',        color: '#e0e0e0', cats: null as string[] | null },
  { id: 'COMP',  label: 'COMP',       color: '#6b8cff', cats: ['Squat','Bench','Deadlift'] },
  { id: 'VAR',   label: 'VARIJACIJE', color: '#f59e0b', cats: ['Squat Variation','Bench Variation','Deadlift Variation'] },
  { id: 'UPPER', label: 'UPPER',      color: '#f87171', cats: ['Back Mid','Back Lats','Biceps Inner','Biceps Brachialis','Triceps Lateral','Triceps Medial','Delts Rear','Delts Side','Delts Front'] },
  { id: 'LOWER', label: 'LOWER',      color: '#22c55e', cats: ['Quads','Hamstring','Glute','Adductors'] },
]

function getCatColor(cat: string) {
  return CAT_COLORS[cat] ?? '#888'
}

// ── Scroll reveal hook ─────────────────────────────────────────────
function useReveal(threshold = 0.06) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800)
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); clearTimeout(t) } },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )
    if (ref.current) obs.observe(ref.current)
    return () => { obs.disconnect(); clearTimeout(t) }
  }, [])
  return { ref, visible }
}

// ── Category pill ──────────────────────────────────────────────────
function CatPill({ label, active, color, onClick }: {
  label: string; active: boolean; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      style={{
        padding: '5px 14px', fontSize: '0.6rem', letterSpacing: '0.14em',
        fontWeight: 700, fontFamily: 'var(--fm)', cursor: 'pointer',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '5px', transition: 'all 0.18s',
        background: active ? `${color}18` : 'transparent',
        color: active ? color : 'rgba(255,255,255,0.45)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = `${color}66`; e.currentTarget.style.color = color } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}>
      {label}
    </button>
  )
}

// ── Exercise card ──────────────────────────────────────────────────
function ExCard({ ex, index, onClick }: { ex: Exercise; index: number; onClick: () => void }) {
  const color = getCatColor(ex.category)
  const { ref, visible } = useReveal()

  return (
    <div ref={ref}
      onClick={onClick}
      className="ex-card"
      style={{
        background: 'linear-gradient(160deg, #0e0e14 0%, #090910 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(18px)',
        transitionProperty: 'opacity, transform, border-color, box-shadow',
        transitionDuration: `0.45s, 0.45s, 0.25s, 0.25s`,
        transitionDelay: `${(index % 6) * 0.05}s`,
      }}>

      {/* Top accent line in category colour */}
      <div style={{ height: '2px', background: `linear-gradient(90deg, ${color}, ${color}44)` }} />

      <div style={{ padding: '20px 22px 18px' }}>
        {/* Category badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '11px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: '0.52rem', letterSpacing: '0.22em', color: color, fontFamily: 'var(--fm)', fontWeight: 700 }}>
            {ex.category.toUpperCase()}
          </span>
        </div>

        {/* Name */}
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.1rem,2.5vw,1.35rem)', fontWeight: 800, lineHeight: 1, margin: '0 0 12px', letterSpacing: '-0.01em', color: '#f0f0f0' }}>
          {ex.name}
        </h3>

        {/* Notes preview */}
        {ex.notes ? (
          <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {ex.notes}
          </p>
        ) : (
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', margin: 0, fontStyle: 'italic' }}>Nema bilješki</p>
        )}

        {/* Footer arrow */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>DETALJI</span>
          <ChevronRight size={11} color="rgba(255,255,255,0.25)" />
        </div>
      </div>
    </div>
  )
}

// ── Detail modal ───────────────────────────────────────────────────
function ExModal({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const color = getCatColor(ex.category)

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,4vw,40px)', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(18px)', animation: 'fadeIn 0.2s ease' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto', background: '#09090e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${color}18`, animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)', position: 'relative' }}>

        {/* Top accent — sticky at top of scrollable modal */}
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${color}, ${color}55, transparent)`, boxShadow: `0 0 16px ${color}44`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontSize: '0.52rem', letterSpacing: '0.3em', color: color, fontFamily: 'var(--fm)', fontWeight: 700 }}>
                  {ex.category.toUpperCase()}
                </span>
              </div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem,5vw,2.8rem)', fontWeight: 800, lineHeight: 0.92, margin: 0, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
                {ex.name}
              </h2>
            </div>
            <button onClick={onClose}
              style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.12)', color: '#888', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1e1e26'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#111118'; e.currentTarget.style.color = '#888' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Video placeholder */}
        <div style={{ margin: '24px 32px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}22`, borderRadius: '10px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative background */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }} />
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${color}08 0%, transparent 70%)` }} />
          {/* Play button */}
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, background: `${color}10` }}>
            <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '9px 0 9px 16px', borderColor: `transparent transparent transparent ${color}99`, marginLeft: '3px' }} />
          </div>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', position: 'relative', zIndex: 1 }}>VIDEO DEMONSTRACIJA</span>
        </div>

        {/* Notes */}
        {ex.notes && (
          <div style={{ margin: '0 32px 24px' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.35em', color: '#666', marginBottom: '10px', fontFamily: 'var(--fm)' }}>TEHNIČKE NAPOMENE</div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.72)', margin: 0 }}>{ex.notes}</p>
          </div>
        )}

        {/* Key points */}
        <div style={{ margin: '0 32px 32px', padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.35em', color: '#666', marginBottom: '12px', fontFamily: 'var(--fm)' }}>KLJUČNE TOČKE</div>
          {[
            'Pravilna forma kroz cijeli pokret',
            'Kontrola ekscentrične faze',
            'Fokus na mind-muscle konekciju',
          ].map((pt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 2 ? '8px' : 0 }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '7px' }} />
              <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{pt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function ExerciseLibraryPage() {
  const router = useRouter()
  const [exercises, setExercises]           = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery]       = useState('')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [ready, setReady]                   = useState(false)
  const [topFilter, setTopFilter]           = useState('ALL')
  const [openDropdown, setOpenDropdown]     = useState<string | null>(null)
  const [dropdownPos, setDropdownPos]       = useState<{top: number; left: number}>({top: 0, left: 0})
  const [subCat, setSubCat]                 = useState<string | null>(null)
  const filterBarRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [navUser, setNavUser] = useState({ name: '', isAdmin: false, avatarIcon: '' })

  useEffect(() => {
    supabase.from('exercises').select('*').order('name').then(({ data }) => {
      setExercises(data ?? [])
      setTimeout(() => setReady(true), 60)
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, role, avatar_icon').eq('id', user.id).single()
        .then(({ data }) => setNavUser({ name: data?.full_name ?? '', isAdmin: data?.role === 'admin', avatarIcon: data?.avatar_icon ?? 'barbell' }))
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return
    const fn = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      const insideBar = filterBarRef.current?.contains(target)
      const insideDropdown = dropdownRef.current?.contains(target)
      if (!insideBar && !insideDropdown) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', fn)
    document.addEventListener('touchstart', fn)
    return () => {
      document.removeEventListener('mousedown', fn)
      document.removeEventListener('touchstart', fn)
    }
  }, [openDropdown])

  // Compute active cats from topFilter + optional subCat
  const activeCats: string[] | null = (() => {
    if (topFilter === 'ALL') return null
    const tf = TOP_FILTERS.find(f => f.id === topFilter)
    if (!tf?.cats) return null
    if (subCat) return [subCat]
    return tf.cats
  })()

  const filtered = exercises.filter(ex => {
    const matchCat = !activeCats || activeCats.includes(ex.category)
    const matchQ   = !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchQ
  })

  const heroCount = exercises.length

  return (
    <div style={{ background: '#06060a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      {/* ── Atmospheric bg ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.014) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'fixed', top: '-20vh', right: '-10vw', width: '60vw', height: '60vh', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse, rgba(107,140,255,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div style={{ position: 'fixed', bottom: '-10vh', left: '-8vw', width: '50vw', height: '50vh', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse, rgba(34,197,94,0.04) 0%, transparent 70%)', filter: 'blur(70px)' }} />

      <AppNav
        athleteName={navUser.name}
        isAdmin={navUser.isAdmin}
        onLogout={async () => { await supabase.auth.signOut(); router.push('/') }}
        avatarIcon={navUser.avatarIcon}
      />

      {/* ── Hero ── */}
      <section style={{ paddingTop: '56px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(52px,8vw,80px) clamp(16px,4vw,48px) 0' }}>

          {/* Overline */}
          <div style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(16px)', transition: 'all 0.6s ease', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{ height: '1px', width: '32px', background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: '0.56rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontWeight: 700 }}>POWERLIFTING KNOWLEDGE BASE</span>
          </div>

          {/* Title row */}
          <div className="ex-hero-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '24px', marginBottom: 'clamp(36px,5vw,56px)' }}>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3.5rem,9vw,7.5rem)', fontWeight: 800, lineHeight: 0.87, margin: 0, letterSpacing: '-0.03em', opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(24px)', transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s' }}>
              BAZA<br /><span style={{ color: 'rgba(255,255,255,0.22)' }}>VJEŽBI</span>
            </h1>

            {/* Stats */}
            <div className="ex-stats-bar" style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(16px)', transition: 'all 0.6s ease 0.2s', display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              {[
                { val: heroCount, label: 'VJEŽBI' },
                { val: CATEGORY_GROUPS.length, label: 'GRUPA' },
                { val: Object.keys(CAT_COLORS).length, label: 'KATEGORIJA' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '14px 22px', background: '#09090e', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, color: '#e0e0e0', lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.22em', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(12px)', transition: 'all 0.6s ease 0.25s', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #0e0e14 0%, #090910 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)', transition: 'border-color 0.2s' }}>
              <Search size={15} color="#555" style={{ flexShrink: 0 }} />
              <input
                type="text" placeholder="Pretraži vježbe..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e0e0e0', fontSize: '0.92rem', fontFamily: 'var(--fm)', padding: '14px 0' }} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  style={{ background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)', color: '#888', width: '26px', height: '26px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#252530'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1c1c24'; e.currentTarget.style.color = '#888' }}>
                  <X size={11} />
                </button>
              )}
              {/* Result count */}
              <span style={{ fontSize: '0.58rem', color: '#444', letterSpacing: '0.1em', flexShrink: 0, whiteSpace: 'nowrap', borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: '12px', fontFamily: 'var(--fm)' }}>
                {filtered.length} / {exercises.length}
              </span>
            </div>
          </div>
        </div>

        {/* ── Category filter bar ── */}
        <div ref={filterBarRef} className="ex-filter-bar" style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.6s ease 0.3s', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,6,10,0.92)', backdropFilter: 'blur(16px)', position: 'sticky', top: '56px', zIndex: 150, overflow: 'auto' }}>
          <div className="ex-top-filters" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(16px,4vw,48px)', display: 'flex', alignItems: 'stretch', gap: '0', minWidth: 'max-content' }}>

            {TOP_FILTERS.map((tf, i) => {
              const isActive  = topFilter === tf.id
              const hasDropdown = tf.cats && tf.cats.length > 3   // UPPER + LOWER get dropdown
              const isOpen    = openDropdown === tf.id
              const activeSubInGroup = tf.cats && subCat && tf.cats.includes(subCat)

              return (
                <div key={tf.id} style={{ position: 'relative', borderRight: i < TOP_FILTERS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      if (hasDropdown) {
                        if (isOpen) { setOpenDropdown(null) }
                        else {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          setDropdownPos({ top: rect.bottom + 4, left: rect.left })
                          setOpenDropdown(tf.id)
                        }
                      } else {
                        setTopFilter(tf.id)
                        setSubCat(null)
                        setOpenDropdown(null)
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '0 clamp(12px,2vw,20px)', height: '48px',
                      background: isActive ? `${tf.color}0e` : 'transparent',
                      border: 'none', cursor: 'pointer',
                      fontSize: '0.62rem', letterSpacing: '0.18em', fontWeight: 800,
                      fontFamily: 'var(--fm)', transition: 'all 0.18s',
                      color: isActive ? tf.color : 'rgba(255,255,255,0.38)',
                      borderBottom: `2px solid ${isActive ? tf.color : 'transparent'}`,
                      marginBottom: '-1px',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = tf.color; e.currentTarget.style.background = `${tf.color}08` } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'transparent' } }}>

                    {/* Color dot */}
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? tf.color : 'rgba(255,255,255,0.2)', boxShadow: isActive ? `0 0 6px ${tf.color}` : 'none', transition: 'all 0.18s', flexShrink: 0 }} />

                    {tf.label}

                    {/* Sub-selection indicator */}
                    {activeSubInGroup && subCat && (
                      <span style={{ fontSize: '0.48rem', background: `${tf.color}22`, color: tf.color, padding: '2px 6px', borderRadius: '3px', border: `1px solid ${tf.color}44`, letterSpacing: '0.08em', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {subCat}
                      </span>
                    )}

                    {/* Dropdown chevron */}
                    {hasDropdown && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5, flexShrink: 0 }}>
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

{/* dropdown rendered at root level below */}
                </div>
              )
            })}

            {/* Result count — right side */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontSize: '0.56rem', color: '#444', letterSpacing: '0.12em', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>{filtered.length}/{exercises.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,48px) clamp(60px,8vw,120px)' }}>

          {/* Active filter label */}
          {topFilter !== 'ALL' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', animation: 'fadeIn 0.2s ease' }}>
              {(() => {
                const tf = TOP_FILTERS.find(f => f.id === topFilter)!
                const displayColor = subCat ? getCatColor(subCat) : tf.color
                const displayLabel = subCat ?? tf.label
                return <>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: displayColor, boxShadow: `0 0 8px ${displayColor}` }} />
                  <span style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.2rem,3vw,1.8rem)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.01em' }}>{displayLabel}</span>
                  {subCat && <span style={{ fontSize: '0.6rem', color: tf.color, letterSpacing: '0.12em', padding: '2px 8px', border: `1px solid ${tf.color}33`, borderRadius: '4px' }}>{tf.label}</span>}
                  <span style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '0.12em' }}>{filtered.length} vježbi</span>
                  <button onClick={() => { setTopFilter('ALL'); setSubCat(null) }}
                    style={{ marginLeft: '4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.54rem', letterSpacing: '0.1em', fontFamily: 'var(--fm)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#666' }}>
                    ✕ RESET
                  </button>
                </>
              })()}
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '3.5rem', color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }}>—</div>
              <div style={{ fontSize: '0.78rem', color: '#444', letterSpacing: '0.2em' }}>NEMA REZULTATA ZA "{searchQuery}"</div>
              <button onClick={() => setSearchQuery('')}
                style={{ marginTop: '20px', padding: '8px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#888', borderRadius: '6px', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#888' }}>
                RESET PRETRAGE
              </button>
            </div>
          )}

          {/* Cards grid */}
          <div className="ex-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(240px,25vw,320px), 1fr))', gap: 'clamp(10px,2vw,16px)' }}>
            {filtered.map((ex, i) => (
              <ExCard key={ex.id} ex={ex} index={i} onClick={() => setSelectedExercise(ex)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Modal ── */}
      {selectedExercise && <ExModal ex={selectedExercise} onClose={() => setSelectedExercise(null)} />}

      {/* ── Dropdown — rendered at ROOT so z-index works above everything ── */}
      {openDropdown && (() => {
        const tf = TOP_FILTERS.find(f => f.id === openDropdown)
        if (!tf?.cats) return null
        return (
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: `${dropdownPos.top}px`, left: `${Math.min(dropdownPos.left, window.innerWidth - 236)}px`, minWidth: '220px', maxWidth: 'calc(100vw - 16px)', background: '#09090e', border: `1px solid rgba(255,255,255,0.14)`, borderRadius: '10px', boxShadow: `0 24px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05), 0 -2px 0 ${tf.color}66`, overflow: 'hidden', animation: 'dropDown 0.18s ease', zIndex: 99999, pointerEvents: 'all' }}>
            {/* All in group */}
            <button onClick={() => { setSubCat(null); setTopFilter(openDropdown!); setOpenDropdown(null) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', background: !subCat ? `${tf.color}15` : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = `${tf.color}12`}
              onMouseLeave={e => e.currentTarget.style.background = !subCat ? `${tf.color}15` : 'transparent'}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: tf.color, opacity: 0.7 }} />
              <span style={{ fontSize: '0.68rem', color: !subCat ? tf.color : 'rgba(255,255,255,0.6)', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.12em' }}>SVE {tf.label}</span>
              {!subCat && <svg style={{ marginLeft: 'auto' }} width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={tf.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
            {/* Subcategories */}
            {tf.cats.map((cat) => (
              <button key={cat} onClick={() => {
                const newSub = subCat === cat ? null : cat
                setSubCat(newSub)
                // ensure topFilter matches the open dropdown group
                if (newSub) setTopFilter(openDropdown!)
                setOpenDropdown(null)
              }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: subCat === cat ? `${getCatColor(cat)}15` : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = `${getCatColor(cat)}12`}
                onMouseLeave={e => e.currentTarget.style.background = subCat === cat ? `${getCatColor(cat)}15` : 'transparent'}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: getCatColor(cat), flexShrink: 0 }} />
                <span style={{ fontSize: '0.68rem', color: subCat === cat ? getCatColor(cat) : 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)', fontWeight: 600, letterSpacing: '0.1em' }}>{cat}</span>
                {subCat === cat && <svg style={{ marginLeft: 'auto' }} width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={getCatColor(cat)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            ))}
          </div>
        )
      })()}

      <style>{`
        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp  { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
        @keyframes dropDown { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:none } }

        /* ── Card hover ── */
        .ex-card:hover {
          border-color: rgba(255,255,255,0.18) !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06) !important;
          transform: translateY(-3px) !important;
        }

        /* ── Filter strip scrollbar hide ── */
        div::-webkit-scrollbar { display: none; }

        /* ── Modal scroll ── */
        .ex-modal-scroll::-webkit-scrollbar { width: 4px; }
        .ex-modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .ex-modal-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .ex-stats-bar { display: none !important; }
          .ex-hero-row { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
        }

        /* Filter bar: horizontally scrollable strip */
        .ex-filter-bar {
          overflow-x: auto !important;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .ex-filter-bar::-webkit-scrollbar { display: none; }
        .ex-top-filters { min-width: max-content; }

        @media (max-width: 600px) {
          .ex-top-filters button { height: 42px !important; padding: 0 12px !important; font-size: 0.58rem !important; }
        }

        /* Card grid: 1 col on small phones */
        @media (max-width: 420px) {
          .ex-card-grid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 480px) {
          .ex-card { border-radius: 8px !important; }
        }
      `}</style>
    </div>
  )
}