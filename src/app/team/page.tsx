'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp, Award, Instagram, Loader2 } from 'lucide-react'
import Footer from '@/app/components/Footer'
import Navbar from '@/app/components/Navbar'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'

const supabase = createClient()

type AthleteStat = {
  id: string
  name: string
  nickname: string | null
  img: string | null
  category: string
  squat: number
  bench: number
  deadlift: number
  total: number
  glp: number
  highlights: string[] | null
  instagram: string | null
  display_order: number
}

const GL_PARAMS = {
  male:   { a: 1199.72839, b: 1025.18162, c: 0.00921 },
  female: { a: 610.32796,  b: 1045.59282, c: 0.03048 },
}
function calcGL(total: number, bw: number, sex: 'male' | 'female' = 'male'): number {
  if (!total || !bw) return 0
  const { a, b, c } = GL_PARAMS[sex]
  const denom = a - b * Math.exp(-c * bw)
  if (denom <= 0) return 0
  return Math.round((total * 100 / denom) * 100) / 100
}

function normName(s: string | null | undefined) {
  if (!s) return ''
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function glpTier(glp: number): { label: string; color: string } {
  if (glp >= 115) return { label: 'MONSTER',      color: '#ff4444' }
  if (glp >= 100) return { label: 'ELITE',         color: '#c0a060' }
  if (glp >= 90)  return { label: 'PROFESSIONAL',  color: '#8888ff' }
  if (glp >= 80)  return { label: 'ADVANCED',      color: '#44cc88' }
  if (glp >= 70)  return { label: 'INTERMEDIATE',  color: '#aaaaaa' }
  return                  { label: 'BEGINNER',      color: 'rgba(255,255,255,0.4)' }
}

function useReveal(threshold = 0.08) {
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
    const NODES = 55
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.4,
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
          if (dist < 150) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - dist / 150)})`
            ctx.lineWidth = 0.6; ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.85 }} />
}

export default function TeamPage() {
  const { t } = useLanguage()
  const [filter, setFilter] = useState('ALL')
  const [hoveredMember, setHoveredMember] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<AthleteStat[]>([])
  const [loading, setLoading] = useState(true)

  const heroReveal  = useReveal(0.05)
  const statsReveal = useReveal(0.1)
  const ctaReveal   = useReveal(0.1)

  useEffect(() => {
    const load = async () => {
      const [profilesRes, statsRes] = await Promise.all([
        supabase.from('profiles')
          .select('id, full_name, role, current_squat_1rm, current_bench_1rm, current_deadlift_1rm, body_weight, weight_class, sex')
          .neq('role', 'admin')
          .order('full_name'),
        supabase.from('athlete_stats').select('*').eq('is_active', true),
      ])

      // Build lookup: normalized name → athlete_stats row
      const statsMap = new Map<string, any>()
      for (const s of (statsRes.data ?? [])) {
        statsMap.set(normName(s.name), s)
      }

      const findStats = (fullName: string) => {
        const key = normName(fullName)
        if (statsMap.has(key)) return statsMap.get(key)
        // Fallback: match by last word (surname)
        const surname = key.split(' ').pop() ?? ''
        for (const [k, v] of statsMap.entries()) {
          if (k.split(' ').pop() === surname) return v
        }
        return null
      }

      // Track which athlete_stats rows are matched to a profile
      const matchedStatIds = new Set<string>()

      const fromProfiles: AthleteStat[] = (profilesRes.data ?? []).map((p: any) => {
        const s = findStats(p.full_name)
        if (s) matchedStatIds.add(s.id)
        const squat    = (p.current_squat_1rm    ?? s?.squat    ?? 0) as number
        const bench    = (p.current_bench_1rm     ?? s?.bench    ?? 0) as number
        const deadlift = (p.current_deadlift_1rm  ?? s?.deadlift ?? 0) as number
        const total    = squat + bench + deadlift
        const bw       = (p.body_weight ?? 0) as number
        const sex      = (p.sex ?? 'male') as 'male' | 'female'
        const wclass   = p.weight_class ?? s?.category ?? ''
        const cat      = wclass ? `${sex === 'female' ? 'F' : 'M'}-${wclass.replace(/^-/, '')}` : (s?.category ?? '')

        return {
          id:            p.id,
          name:          p.full_name ?? s?.name ?? '',
          nickname:      s?.nickname   ?? null,
          img:           s?.img        ?? null,
          category:      cat,
          squat,
          bench,
          deadlift,
          total,
          glp:           calcGL(total, bw, sex),
          highlights:    s?.highlights ?? null,
          instagram:     s?.instagram  ?? null,
          display_order: s?.display_order ?? 99,
        }
      })

      // Add athlete_stats entries that have no matching profile
      const fromStatsOnly: AthleteStat[] = (statsRes.data ?? [])
        .filter((s: any) => !matchedStatIds.has(s.id))
        .map((s: any) => {
          const squat    = (s.squat    ?? 0) as number
          const bench    = (s.bench    ?? 0) as number
          const deadlift = (s.deadlift ?? 0) as number
          const total    = squat + bench + deadlift
          return {
            id:            s.id,
            name:          s.name ?? '',
            nickname:      s.nickname   ?? null,
            img:           s.img        ?? null,
            category:      s.category   ?? '',
            squat,
            bench,
            deadlift,
            total,
            glp:           s.glp ?? 0,
            highlights:    s.highlights ?? null,
            instagram:     s.instagram  ?? null,
            display_order: s.display_order ?? 99,
          }
        })

      const merged = [...fromProfiles, ...fromStatsOnly]
      merged.sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))
      setAthletes(merged)
      setLoading(false)
    }
    load()
  }, [])

  const filteredMembers = athletes.filter(m => {
    if (filter === 'ALL')   return true
    if (filter === 'MEN')   return m.category.startsWith('M-')
    if (filter === 'WOMEN') return m.category.startsWith('F-')
    return true
  })

  const totalAthletes = athletes.length
  const maxTotal = athletes.length > 0 ? Math.max(...athletes.map(a => a.total)) : 0
  const combinedTotal = athletes.reduce((s, a) => s + a.total, 0)
  const topGlp = athletes.length > 0 ? Math.max(...athletes.map(a => a.glp)) : 0

  const TEAM_STATS = [
    { label: t('team.stats.athletes'), value: String(totalAthletes),                icon: <Trophy size={20} /> },
    { label: t('team.stats.bestTotal'), value: `${maxTotal}kg`,                     icon: <Award size={20} /> },
    { label: t('team.stats.combined'), value: `${combinedTotal.toLocaleString()}kg`, icon: <TrendingUp size={20} /> },
    { label: t('team.stats.glp'),      value: String(topGlp),                       icon: <Trophy size={20} /> },
  ]

  return (
    <div style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      <div className="star-field" />
      <ParticleCanvas />

      <Navbar variant="solid" />

      {/* HERO */}
      <section style={{ paddingTop: '160px', paddingBottom: '80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '900px', height: '500px', background: 'radial-gradient(ellipse at center top, rgba(255,255,255,0.06) 0%, transparent 70%)', zIndex: 1, pointerEvents: 'none' }} />
        <div ref={heroReveal.ref} className="team-hero-inner" style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '0 60px' }}>
          <div style={{ opacity: heroReveal.visible ? 1 : 0, transform: heroReveal.visible ? 'none' : 'translateY(35px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>{t('team.eyebrow')}</div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(4rem, 10vw, 8rem)', lineHeight: 0.9, marginBottom: '30px' }}>
              LWL UP<br /><span style={{ color: 'rgba(255,255,255,0.25)' }}>TEAM</span>
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.65)', maxWidth: '700px', margin: '0 auto 60px', lineHeight: 1.85, fontWeight: 300 }}>
              {t('team.desc')}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '60px' }}>
              {([['ALL', t('team.filter.all')], ['MEN', t('team.filter.men')], ['WOMEN', t('team.filter.women')]] as [string,string][]).map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '11px 30px', background: filter === f ? '#fff' : 'rgba(255,255,255,0.04)', color: filter === f ? '#000' : 'rgba(255,255,255,0.55)', border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.2em', cursor: 'pointer', transition: '0.25s', fontFamily: 'var(--fm)' }}
                  onMouseEnter={e => { if (filter !== f) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={e => { if (filter !== f) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' } }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: '#0a0a0a', padding: '80px 60px', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }}>
        <div ref={statsReveal.ref} className="team-stats-grid" style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.08)' }}>
          {TEAM_STATS.map((stat, i) => (
            <div key={i} className="team-stat-card" style={{ textAlign: 'center', padding: '48px 20px', background: '#0a0a0a', transition: 'all 0.4s', opacity: statsReveal.visible ? 1 : 0, transform: statsReveal.visible ? 'none' : 'translateY(25px)', transitionDelay: `${i * 0.08}s`, transitionDuration: '0.7s' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '3.5rem', marginBottom: '10px', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.28em', color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* GRID — FIX: bez ref/opacity JS logike, samo CSS animacija */}
      <section style={{ padding: '120px 60px', maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em' }}>{t('team.loading')}</span>
          </div>
        ) : (
          <div className="team-members-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
            {filteredMembers.map((member, i) => (
              <div
                key={member.id}
                className="member-card"
                onMouseEnter={() => setHoveredMember(member.id)}
                onMouseLeave={() => setHoveredMember(null)}
                style={{
                  position: 'relative',
                  background: '#0a0a0a',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s',
                  transform: hoveredMember === member.id ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
                  boxShadow: hoveredMember === member.id ? '0 20px 60px rgba(0,0,0,0.6)' : '0 2px 12px rgba(0,0,0,0.3)',
                  zIndex: hoveredMember === member.id ? 2 : 1,
                  animationDelay: `${i * 0.06}s`,
                }}
              >
                {/* IMAGE */}
                <div style={{ height: '400px', overflow: 'hidden', position: 'relative', background: '#000' }}>
                  {member.img ? (
                    <img
                      src={member.img}
                      alt={member.name}
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: hoveredMember === member.id ? 'grayscale(0.2) brightness(0.75)' : 'grayscale(0.6) brightness(0.6)', transform: hoveredMember === member.id ? 'scale(1.08)' : 'scale(1)', transition: '0.8s cubic-bezier(0.16,1,0.3,1)' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #0d0d0d 0%, #060606 100%)' }}>
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity="0.12">
                        <circle cx="40" cy="28" r="16" fill="#fff" />
                        <path d="M8 72c0-17.673 14.327-32 32-32s32 14.327 32 32" fill="#fff" />
                      </svg>
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 60%)' }} />
                  {member.nickname && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.85)', padding: '6px 16px', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                      <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', fontWeight: 700 }}>"{member.nickname}"</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.7)', padding: '4px 12px', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{member.category}</span>
                  </div>
                </div>

                {/* INFO */}
                <div style={{ padding: '28px 28px 32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.7rem', margin: 0, letterSpacing: '0.04em', color: '#fff', lineHeight: 1 }}>{member.name}</h3>
                    {member.instagram && (
                      <a href={member.instagram} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'rgba(255,255,255,0.3)', transition: '0.25s', flexShrink: 0, marginTop: '4px' }}
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#fff'}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)'}>
                        <Instagram size={18} />
                      </a>
                    )}
                  </div>

                  {member.total > 0 ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        {[['SQUAT', member.squat], ['BENCH', member.bench], ['DEADLIFT', member.deadlift]].map(([label, val], li) => (
                          <div key={li} style={{ padding: '16px 0', borderRight: li < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none', paddingLeft: li > 0 ? '16px' : '0', paddingRight: li < 2 ? '16px' : '0' }}>
                            <div style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{label}</div>
                            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.7rem', color: '#fff', lineHeight: 1 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: (member.highlights?.filter(Boolean).length ?? 0) > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>TOTAL</div>
                          <div style={{ fontFamily: 'var(--fd)', fontSize: '2.4rem', color: '#fff', lineHeight: 1 }}>
                            {member.total}<span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', marginLeft: '6px' }}>kg</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <div style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>GLP</div>
                          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>{member.glp}</div>
                          {member.glp > 0 && (() => { const t = glpTier(member.glp); return (
                            <div style={{ fontSize: '0.5rem', letterSpacing: '0.18em', color: t.color, fontWeight: 700, marginTop: '4px' }}>{t.label}</div>
                          )})()}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '36px 0', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em' }}>{t('team.noData')}</div>
                    </div>
                  )}

                  {(member.highlights?.filter(Boolean).length ?? 0) > 0 && (
                    <div style={{ paddingTop: '14px' }}>
                      {member.highlights?.filter(Boolean).map((h, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginBottom: '7px' }}>
                          <div style={{ width: '4px', height: '4px', background: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                          {h}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section style={{ padding: '120px 60px', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div ref={ctaReveal.ref} style={{ opacity: ctaReveal.visible ? 1 : 0, transform: ctaReveal.visible ? 'none' : 'translateY(30px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3rem, 8vw, 6rem)', marginBottom: '30px', lineHeight: 0.9 }}>
            {t('team.cta.title1')}<br /><span style={{ color: 'rgba(255,255,255,0.25)' }}>{t('team.cta.title2')}</span>
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto 50px', lineHeight: 1.85, fontWeight: 300 }}>
            {t('team.cta.desc')}
          </p>
          <Link href="/survey" style={{ textDecoration: 'none' }}>
            <button className="join-button" style={{ padding: '20px 60px', background: '#fff', color: '#000', border: 'none', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.25em', cursor: 'pointer', transition: '0.4s', position: 'relative', overflow: 'hidden', fontFamily: 'var(--fm)' }}>
              <span style={{ position: 'relative', zIndex: 2 }}>{t('team.cta.btn')}</span>
            </button>
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .team-stat-card:hover {
          background: rgba(255,255,255,0.04) !important;
          transform: translateY(-5px);
        }

        .member-card {
          animation: fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) backwards;
        }

        .join-button::before {
          content: '';
          position: absolute; inset: 0;
          background: #000;
          transform: scaleX(0); transform-origin: right;
          transition: transform 0.5s; z-index: 1;
        }
        .join-button:hover::before { transform: scaleX(1); transform-origin: left; }
        .join-button:hover { color: #fff !important; box-shadow: 0 10px 40px rgba(255,255,255,0.2); }
        .join-button:hover span { color: #fff; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          nav { padding: 0 20px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; padding-top: 60px !important; padding-bottom: 60px !important; }
          .team-hero-inner { padding: 0 20px !important; }
          .team-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .team-stat-card { padding: 28px 12px !important; }
          .team-stat-card div[style*="3.5rem"] { font-size: 2.2rem !important; }
          .team-members-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
        }
        @media (max-width: 480px) {
          .team-hero-inner { padding: 0 16px !important; }
          section { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>
    </div>
  )
}