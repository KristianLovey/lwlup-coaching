'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { MapPin, Calendar, Trophy, Users, ChevronRight, Loader2, ExternalLink } from 'lucide-react'
import Footer from '@/app/components/Footer'
import Navbar from '@/app/components/Navbar'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'

const supabase = createClient()

type Athlete = {
  id: string
  name: string
  nickname: string | null
  img: string | null
  category: string
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
  athletes?: Athlete[]
}

function useReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const NODES = 40
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 1.2 + 0.3,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })
      for (let i = 0; i < NODES; i++) {
        for (let j = i + 1; j < NODES; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - dist / 130)})`
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.7 }} />
}

const STATUS_STYLE = {
  announced: { color: '#facc15', bg: 'rgba(250,204,21,0.08)',  border: 'rgba(250,204,21,0.2)',  dot: '#facc15' },
  ongoing:   { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)',  dot: '#4ade80' },
  completed: { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', dot: 'rgba(255,255,255,0.3)' },
}

function CompetitionCard({ comp, index }: { comp: Competition; index: number }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const STATUS_LABELS = {
    announced: t('comp.status.announced'),
    ongoing:   t('comp.status.ongoing'),
    completed: t('comp.status.completed'),
  }
  const status = { ...STATUS_STYLE[comp.status], label: STATUS_LABELS[comp.status] }
  const hasAthletes = (comp.athletes?.length ?? 0) > 0
  const isUpcoming = comp.status !== 'completed'
  const daysUntil = Math.ceil((new Date(comp.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const dateStr = new Date(comp.date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      className="comp-card"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', marginBottom: '12px', transition: 'border-color 0.3s', animationDelay: `${index * 0.08}s` }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      {/* Status stripe */}
      <div style={{ height: '2px', background: status.dot, opacity: comp.status === 'completed' ? 0.25 : 0.9 }} />

      <div className="comp-card-body" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>

          {/* Left */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            {/* Status badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '4px 12px', background: status.bg, border: `1px solid ${status.border}`, marginBottom: '14px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.dot, boxShadow: comp.status === 'ongoing' ? `0 0 8px ${status.dot}` : 'none' }} />
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.25em', color: status.color, fontFamily: 'var(--fm)', fontWeight: 700 }}>{status.label}</span>
            </div>

            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.2rem, 2.5vw, 1.9rem)', color: '#fff', margin: '0 0 14px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              {comp.name}
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', marginBottom: comp.description ? '12px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                <Calendar size={13} color="rgba(255,255,255,0.3)" />{dateStr}
              </div>
              {comp.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                  <MapPin size={13} color="rgba(255,255,255,0.3)" />{comp.location}
                </div>
              )}
              {hasAthletes && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                  <Users size={13} color="rgba(255,255,255,0.3)" />{comp.athletes!.length} {t('comp.liftersCount')}
                </div>
              )}
            </div>

            {comp.description && (
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, margin: 0, maxWidth: '580px' }}>{comp.description}</p>
            )}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
            {isUpcoming && daysUntil > 0 && (
              <div style={{ textAlign: 'right', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '2.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{daysUntil}</div>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>{t('comp.days')}</div>
              </div>
            )}
            {isUpcoming && daysUntil <= 0 && comp.status === 'announced' && (
              <div style={{ padding: '8px 16px', border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.06)' }}>
                <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#4ade80', fontWeight: 700 }}>{t('comp.today')}</span>
              </div>
            )}
            {comp.status === 'completed' && comp.results_url && (
              <a href={comp.results_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#fff', color: '#000', textDecoration: 'none', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.85)'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = '#fff'}>
                <ExternalLink size={12} /> {t('comp.results')}
              </a>
            )}
            {hasAthletes && (
              <button onClick={() => setExpanded(!expanded)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.62rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
                <Users size={12} />
                {expanded ? t('comp.hide') : t('comp.lifters')}
                <ChevronRight size={11} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            )}
          </div>
        </div>

        {/* Athletes panel */}
        {expanded && hasAthletes && (
          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '20px' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.2)', marginBottom: '14px', fontFamily: 'var(--fm)' }}>
              {comp.status === 'completed' ? t('comp.athleteResults') : t('comp.athletesAt')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
              {comp.athletes!.map(athlete => (
                <div key={athlete.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', background: '#111', position: 'relative' }}>
                    <Image src={athlete.img ?? '/slike/placeholder-athlete.jpg'} alt={athlete.name}
                      fill sizes="44px" style={{ objectFit: 'cover', filter: 'grayscale(0.3)' }} loading="lazy" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {athlete.name}
                      {athlete.nickname && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: '6px', fontSize: '0.72rem' }}>"{athlete.nickname}"</span>}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{athlete.category}</div>
                    {comp.status === 'completed' && athlete.result_total && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
                        {athlete.result_place && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Trophy size={10} color={athlete.result_place === 1 ? '#facc15' : athlete.result_place === 2 ? '#94a3b8' : athlete.result_place === 3 ? '#cd7c4a' : 'rgba(255,255,255,0.25)'} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: athlete.result_place <= 3 ? '#fff' : 'rgba(255,255,255,0.4)', fontFamily: 'var(--fd)' }}>{athlete.result_place}.</span>
                          </div>
                        )}
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--fd)' }}>{athlete.result_total}kg</span>
                        {athlete.result_squat && <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)' }}>{athlete.result_squat}/{athlete.result_bench}/{athlete.result_deadlift}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CompetitionsPage() {
  const { t } = useLanguage()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'announced' | 'completed'>('all')

  const heroReveal = useReveal(0.05)

  useEffect(() => {
    const load = async () => {
      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .order('date', { ascending: true })

      if (!comps) { setLoading(false); return }

      // Single query for all competition athletes (avoids N+1)
      const compIds = comps.map(c => c.id)
      const { data: allCa } = await supabase
        .from('competition_athletes')
        .select(`
          competition_id,
          result_squat, result_bench, result_deadlift, result_total, result_place, result_notes,
          athlete:athlete_stats(id, name, nickname, img, category)
        `)
        .in('competition_id', compIds)

      // Group athletes by competition_id
      const athletesByComp: Record<string, Athlete[]> = {}
      for (const row of (allCa ?? [])) {
        const r = row as any
        if (!athletesByComp[r.competition_id]) athletesByComp[r.competition_id] = []
        athletesByComp[r.competition_id].push({
          id: r.athlete.id, name: r.athlete.name, nickname: r.athlete.nickname,
          img: r.athlete.img, category: r.athlete.category,
          result_squat: r.result_squat, result_bench: r.result_bench,
          result_deadlift: r.result_deadlift, result_total: r.result_total,
          result_place: r.result_place, result_notes: r.result_notes,
        })
      }

      const withAthletes = comps.map(comp => ({ ...comp, athletes: athletesByComp[comp.id] ?? [] }))

      setCompetitions(withAthletes as Competition[])

      // Auto-select current year
      const currentYear = new Date().getFullYear()
      const hasCurrentYear = withAthletes.some(c => new Date(c.date).getFullYear() === currentYear)
      if (hasCurrentYear) setSelectedYear(currentYear)

      setLoading(false)
    }
    load()
  }, [])

  // Extract available years from competitions
  const availableYears = Array.from(
    new Set(competitions.map(c => new Date(c.date).getFullYear()))
  ).sort((a, b) => b - a) // newest first

  // Filter competitions
  const filtered = competitions.filter(c => {
    const year = new Date(c.date).getFullYear()
    const matchYear = selectedYear === 'all' || year === selectedYear
    const matchStatus = statusFilter === 'all' || c.status === statusFilter ||
      (statusFilter === 'announced' && (c.status === 'announced' || c.status === 'ongoing'))
    return matchYear && matchStatus
  })

  // Stats for selected view
  const upcoming = filtered.filter(c => c.status !== 'completed').length
  const completed = filtered.filter(c => c.status === 'completed').length
  const totalParticipations = filtered.reduce((s, c) => s + (c.athletes?.length ?? 0), 0)

  return (
    <div style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      <div className="star-field" />
      <ParticleCanvas />

      <Navbar variant="solid" />

      {/* HERO */}
      <section style={{ paddingTop: 'clamp(80px,12vw,130px)', paddingBottom: '48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse at center top, rgba(255,255,255,0.05) 0%, transparent 70%)', zIndex: 1, pointerEvents: 'none' }} />

        <div ref={heroReveal.ref} className="comp-hero-inner" style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px,4vw,60px)' }}>
          <div style={{ opacity: heroReveal.visible ? 1 : 0, transform: heroReveal.visible ? 'none' : 'translateY(30px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>

            <div className="comp-hero-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '32px', marginBottom: '40px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.3)', marginBottom: '14px' }}>{t('comp.eyebrow')}</div>
                <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3rem, 8vw, 6.5rem)', lineHeight: 0.88, margin: 0, letterSpacing: '-0.02em' }}>
                  {t('comp.title1')}<br /><span style={{ color: 'rgba(255,255,255,0.18)' }}>{t('comp.title2')}</span>
                </h1>
              </div>

              {/* Live stats */}
              {!loading && (
                <div className="comp-stats-bar" style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                  {[
                    { val: upcoming,            label: t('comp.filter.upcoming') },
                    { val: completed,           label: t('comp.filter.completed') },
                    { val: totalParticipations, label: t('comp.appearances') },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: '16px 22px', background: '#050505', textAlign: 'center', minWidth: '76px' }}>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.9rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.22em', marginTop: '4px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Filters ── */}
            <div className="comp-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Year pills */}
              <div style={{ display: 'flex', gap: '6px', marginRight: '8px' }}>
                <button onClick={() => setSelectedYear('all')}
                  style={{ padding: '8px 18px', background: selectedYear === 'all' ? '#fff' : 'rgba(255,255,255,0.04)', color: selectedYear === 'all' ? '#000' : 'rgba(255,255,255,0.4)', border: selectedYear === 'all' ? 'none' : '1px solid rgba(255,255,255,0.1)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', cursor: 'pointer', transition: '0.2s', fontFamily: 'var(--fm)' }}
                  onMouseEnter={e => { if (selectedYear !== 'all') { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' } }}
                  onMouseLeave={e => { if (selectedYear !== 'all') { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
                  {t('comp.allYears')}
                </button>
                {availableYears.map(year => (
                  <button key={year} onClick={() => setSelectedYear(year)}
                    style={{ padding: '8px 18px', background: selectedYear === year ? '#fff' : 'rgba(255,255,255,0.04)', color: selectedYear === year ? '#000' : 'rgba(255,255,255,0.4)', border: selectedYear === year ? 'none' : '1px solid rgba(255,255,255,0.1)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', cursor: 'pointer', transition: '0.2s', fontFamily: 'var(--fm)' }}
                    onMouseEnter={e => { if (selectedYear !== year) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' } }}
                    onMouseLeave={e => { if (selectedYear !== year) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
                    {year}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />

              {/* Status filter */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {([['all', t('comp.filter.all')], ['announced', t('comp.filter.upcoming')], ['completed', t('comp.filter.completed')]] as [string,string][]).map(([f, label]) => (
                  <button key={f} onClick={() => setStatusFilter(f as any)}
                    style={{ padding: '8px 16px', background: statusFilter === f ? 'rgba(255,255,255,0.08)' : 'transparent', color: statusFilter === f ? '#fff' : 'rgba(255,255,255,0.35)', border: `1px solid ${statusFilter === f ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', transition: '0.2s', fontFamily: 'var(--fm)' }}
                    onMouseEnter={e => { if (statusFilter !== f) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' } }}
                    onMouseLeave={e => { if (statusFilter !== f) { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' } }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section style={{ padding: '8px clamp(16px,4vw,60px) 80px', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em' }}>{t('comp.loading')}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.2)' }}>
            <Trophy size={36} style={{ opacity: 0.15, marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.3em' }}>{t('comp.noResults')}</div>
          </div>
        ) : (
          <>
            {/* Year header when specific year selected */}
            {selectedYear !== 'all' && (
              <div style={{ padding: '20px 0 16px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>{selectedYear}</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3em' }}>{filtered.length} {t('comp.count')}</span>
                </div>
              </div>
            )}

            {/* Group by year if 'all' selected */}
            {selectedYear === 'all' ? (
              availableYears.map(year => {
                const yearComps = filtered.filter(c => new Date(c.date).getFullYear() === year)
                if (yearComps.length === 0) return null
                return (
                  <div key={year} style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0 12px' }}>
                      <span style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 800, color: 'rgba(255,255,255,0.08)', letterSpacing: '-0.02em', lineHeight: 1 }}>{year}</span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                      <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3em' }}>{yearComps.length} {t('comp.count')}</span>
                    </div>
                    {yearComps.map((comp, i) => <CompetitionCard key={comp.id} comp={comp} index={i} />)}
                  </div>
                )
              })
            ) : (
              filtered.map((comp, i) => <CompetitionCard key={comp.id} comp={comp} index={i} />)
            )}
          </>
        )}
      </section>

      <Footer />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .comp-card { animation: fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) backwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .comp-hero-top { gap: 20px !important; margin-bottom: 24px !important; flex-direction: column !important; align-items: flex-start !important; }
          .comp-stats-bar { width: 100%; }
          .comp-stats-bar > div { flex: 1; }
          .comp-card-body { padding: 20px 16px !important; }
        }
        @media (max-width: 600px) {
          .comp-filters { flex-direction: column !important; gap: 10px !important; }
          .comp-filters > div { flex-wrap: wrap !important; }
        }
        @media (max-width: 480px) {
          .comp-card-body { padding: 16px 14px !important; }
          .comp-card-body > div > div:last-child { align-items: flex-start !important; flex-direction: row !important; flex-wrap: wrap !important; }
        }
      `}</style>
    </div>
  )
}