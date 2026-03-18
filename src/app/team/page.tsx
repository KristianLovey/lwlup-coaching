'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trophy, TrendingUp, Award, Instagram } from 'lucide-react'
import Footer from '@/app/components/Footer'

const TEAM_MEMBERS = [
  {
    name: 'Walter Smajlović', nickname: 'GICA', img: '/slike/walter-s.jpg', category: 'M-93kg',
    squat: 262.5, bench: 185, deadlift: 295, total: 735, glp: 101.89,
    highlights: ['10x Državni prvak', 'European Open 2025 - 10th place', '4+ državnih rekorda'],
    instagram: 'https://www.instagram.com/waltersmajlovic/'
  },
  {
    name: 'Petar Rendulić', nickname: 'Pero', img: '/slike/petar-r.jpg', category: 'M-83kg',
    squat: 246.5, bench: 140, deadlift: 300, total: 677.5, glp: 93.96,
    highlights: [''], instagram: 'https://www.instagram.com/rendulic2z/'
  },
  {
    name: 'Kristian Lovey', nickname: 'Kizo', img: '/slike/kristian-l.jpg', category: 'M-93kg',
    squat: 225, bench: 142.5, deadlift: 235, total: 590, glp: 79.57,
    highlights: [''], instagram: 'https://www.instagram.com/kristian.lovey/'
  },
  {
    name: 'Lara Žic', nickname: '', img: '/slike/lara-z.jpg', category: 'F-63kg',
    squat: 132.5, bench: 65, deadlift: 132.5, total: 327.5, glp: 77.23,
    highlights: [''], instagram: 'https://www.instagram.com/zic.lara/'
  },
  {
    name: 'Filip Humski', nickname: '', img: '/slike/filip-h.jpg', category: 'M-83kg',
    squat: 155, bench: 87.5, deadlift: 160, total: 402.5, glp: 57.28,
    highlights: [''], instagram: 'https://www.instagram.com/humskifilip/'
  },
  {
    name: 'Amar Kantarević', nickname: '', img: '/slike/amar-k.jpg', category: 'M-105kg',
    squat: 227.5, bench: 145, deadlift: 240, total: 612.5, glp: 77.30,
    highlights: [''], instagram: 'https://www.instagram.com/amarrr1_/'
  },
  {
    name: 'Ivan Petriček', nickname: '', img: '/slike/ivan-p.jpg', category: 'M-83kg',
    squat: 202.5, bench: 117.5, deadlift: 235, total: 547.5, glp: 74.25,
    highlights: [''], instagram: 'https://www.instagram.com/the_barbellbender/'
  },
  {
    name: 'Luka Grežina', nickname: '', img: '/slike/luka-g.jpg', category: 'M-120kg',
    squat: 285, bench: 160, deadlift: 302.5, total: 747.5, glp: 87.21,
    highlights: [''], instagram: 'https://www.instagram.com/grezinq/'
  },
  {
    name: 'Filip Pavlović', nickname: '', img: '/slike/filip-p.jpg', category: 'M-93kg',
    squat: 162.5, bench: 120, deadlift: 217.5, total: 500, glp: 68.92,
    highlights: ['Fotograf LWLUP-a'], instagram: 'https://www.instagram.com/insert.valid.name/'
  },
  {
    name: 'Daren Grgičević', nickname: '', img: '/slike/daren-g.jpg', category: 'M-93kg',
    squat: 192.5, bench: 120, deadlift: 212.5, total: 525, glp: 68.97,
    highlights: [''], instagram: 'https://www.instagram.com/daren.gspk/'
  }
]

const TEAM_STATS = [
  { label: 'AKTIVNIH ATLETA', value: '10', icon: <Trophy size={20} /> },
  { label: 'DRŽAVNIH REKORDA', value: '12+', icon: <Award size={20} /> },
  { label: 'MEĐUNARODNIH NATJECANJA', value: '6', icon: <TrendingUp size={20} /> },
  { label: 'UKUPAN TONNAGE', value: '7350+', icon: <Trophy size={20} /> }
]

// ── Scroll reveal hook ─────────────────────────────────────────────
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

// ── Canvas particle background ─────────────────────────────────────
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
    const NODES = 45
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
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
          if (dist < 140) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.05 * (1 - dist / 140)})`; ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill() })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.5 }} />
}

export default function TeamPage() {
  const [filter, setFilter] = useState('ALL')
  const [hoveredMember, setHoveredMember] = useState<number | null>(null)

  const heroReveal = useReveal(0.05)
  const statsReveal = useReveal(0.1)
  const gridReveal = useReveal(0.03)
  const ctaReveal = useReveal(0.1)

  const filteredMembers = TEAM_MEMBERS.filter(m => {
    if (filter === 'ALL') return true
    if (filter === 'MEN') return m.category.startsWith('M-')
    if (filter === 'WOMEN') return m.category.startsWith('F-')
    return true
  })

  return (
    <div style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      <ParticleCanvas />

      {/* ══ NAVBAR ══════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '80px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 60px', background: 'rgba(5,5,5,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none', color: '#fff' }}>
          <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '60px', width: 'auto', transition: 'transform 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        </Link>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.2em', transition: '0.3s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <ArrowLeft size={16} /> NATRAG
        </Link>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section style={{ paddingTop: '160px', paddingBottom: '80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Top glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '900px', height: '500px', background: 'radial-gradient(ellipse at center top, rgba(255,255,255,0.05) 0%, transparent 70%)', zIndex: 1, pointerEvents: 'none' }} />

        <div ref={heroReveal.ref} style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '0 60px' }}>
          <div style={{ opacity: heroReveal.visible ? 1 : 0, transform: heroReveal.visible ? 'none' : 'translateY(35px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ fontSize: '0.8rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '20px' }}>UPOZNAJ</div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(4rem, 10vw, 8rem)', lineHeight: 0.9, marginBottom: '30px' }}>
              LWLUP<br />
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>TEAM</span>
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)', maxWidth: '700px', margin: '0 auto 60px', lineHeight: 1.8 }}>
              Naši atleti su srce i duša LWL UP-a. Od nacionalnih prvaka do europskih natjecatelja, svaki član donosi jedinstvenu predanost i neumornu želju za napretkom.
            </p>

            {/* Filter buttons — identični originalu */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '60px' }}>
              {['ALL', 'MEN', 'WOMEN'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '12px 30px',
                  background: filter === f ? '#fff' : 'transparent',
                  color: filter === f ? '#000' : 'rgba(255,255,255,0.5)',
                  border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.2em', cursor: 'pointer', transition: '0.3s'
                }}
                  onMouseEnter={e => { if (filter !== f) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={e => { if (filter !== f) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' } }}
                >
                  {f === 'ALL' ? 'SVI' : f === 'MEN' ? 'MUŠKARCI' : 'ŽENE'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ TEAM STATS ══════════════════════════════════════════ */}
      <section style={{ background: '#0a0a0a', padding: '80px 60px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
        <div ref={statsReveal.ref} style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
          {TEAM_STATS.map((stat, i) => (
            <div key={i} className="team-stat-card" style={{
              textAlign: 'center', padding: '40px 20px',
              border: '1px solid rgba(255,255,255,0.05)', background: '#050505', transition: '0.4s',
              opacity: statsReveal.visible ? 1 : 0,
              transform: statsReveal.visible ? 'none' : 'translateY(25px)',
              transitionDelay: `${i * 0.08}s`, transitionDuration: '0.7s',
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.99)', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '3.5rem', marginBottom: '10px' }}>{stat.value}</div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.25em', color: 'rgba(255, 255, 255, 1)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TEAM GRID ═══════════════════════════════════════════ */}
      <section style={{ padding: '120px 60px', maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div ref={gridReveal.ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '40px' }}>
          {filteredMembers.map((member, i) => (
            <div
              key={i}
              className="member-card"
              onMouseEnter={() => setHoveredMember(i)}
              onMouseLeave={() => setHoveredMember(null)}
              style={{
                position: 'relative', background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', cursor: 'pointer',
                transition: '0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: hoveredMember === i ? 'translateY(-10px)' : 'translateY(0)',
                borderColor: hoveredMember === i ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                opacity: gridReveal.visible ? 1 : 0,
                animationDelay: `${(i % 3) * 0.12}s`,
              }}
            >
              {/* IMAGE — identično originalu */}
              <div style={{ height: '400px', overflow: 'hidden', position: 'relative', background: '#000' }}>
                <img
                  src={member.img} alt={member.name}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: 'grayscale(0.5) brightness(0.7)',
                    transform: hoveredMember === i ? 'scale(1.1)' : 'scale(1)',
                    transition: '0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onError={e => { e.currentTarget.src = '/slike/placeholder-athlete.jpg' }}
                />
                {member.nickname && (
                  <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.8)', padding: '8px 20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', fontWeight: 700 }}>"{member.nickname}"</span>
                  </div>
                )}
              </div>

              {/* INFO — identično originalu */}
              <div style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: '5px', letterSpacing: '0.05em' }}>{member.name}</h3>
                    <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)' }}>{member.category}</div>
                  </div>
                  {member.instagram && member.instagram !== '#' && (
                    <a href={member.instagram} target="_blank" style={{ color: 'rgba(255,255,255,0.3)', transition: '0.3s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                </div>

                {member.total > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '25px', padding: '25px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>SQUAT</div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', color: '#fff' }}>{member.squat}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>BENCH</div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', color: '#fff' }}>{member.bench}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>DEAD</div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', color: '#fff' }}>{member.deadlift}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>TOTAL</div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '2.5rem', color: '#fff' }}>{member.total}<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)', marginLeft: '8px' }}>kg</span></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>GLP</div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>{member.glp}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>PODACI USKORO DOSTUPNI</div>
                  </div>
                )}

                {member.highlights.length > 0 && (
                  <div>
                    {member.highlights.map((h, idx) => h && (
                      <div key={idx} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', paddingLeft: '15px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: '8px', width: '4px', height: '4px', background: 'rgba(255,255,255,0.3)' }} />
                        {h}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════════ */}
      <section style={{ padding: '120px 60px', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div ref={ctaReveal.ref} style={{ opacity: ctaReveal.visible ? 1 : 0, transform: ctaReveal.visible ? 'none' : 'translateY(30px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3rem, 8vw, 6rem)', marginBottom: '30px', lineHeight: 0.9 }}>
            POSTANI DIO<br />
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>TIMA</span>
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.5)', maxWidth: '600px', margin: '0 auto 50px', lineHeight: 1.8 }}>
            Tražiš zajednicu koja te razumije i sistem koji radi? Pridruži se LWLUP-u.
          </p>
          <Link href="/survey" style={{ textDecoration: 'none' }}>
            <button className="join-button" style={{
              padding: '20px 60px', background: '#fff', color: '#666363', border: 'none',
              fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.25em', cursor: 'pointer',
              transition: '0.4s', position: 'relative', overflow: 'hidden'
            }}>
              <span style={{ position: 'relative', zIndex: 2 }}>Postani član</span>
            </button>
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&display=swap');
        :root { --fm: 'Space Grotesk', sans-serif; --fd: 'Space Grotesk', sans-serif; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #050505; color: #fff; }
        ::selection { background: #fff; color: #000; }

        .team-stat-card:hover {
          background: rgba(255,255,255,0.03) !important;
          transform: translateY(-5px);
          border-color: rgba(255,255,255,0.15) !important;
        }

        .member-card {
          animation: fadeInUp 0.75s cubic-bezier(0.16,1,0.3,1) backwards;
        }
        .member-card:nth-child(1)  { animation-delay: 0.05s; }
        .member-card:nth-child(2)  { animation-delay: 0.15s; }
        .member-card:nth-child(3)  { animation-delay: 0.25s; }
        .member-card:nth-child(4)  { animation-delay: 0.05s; }
        .member-card:nth-child(5)  { animation-delay: 0.15s; }
        .member-card:nth-child(6)  { animation-delay: 0.25s; }
        .member-card:nth-child(7)  { animation-delay: 0.05s; }
        .member-card:nth-child(8)  { animation-delay: 0.15s; }
        .member-card:nth-child(9)  { animation-delay: 0.25s; }
        .member-card:nth-child(10) { animation-delay: 0.05s; }

        .join-button::before {
          content: '';
          position: absolute; inset: 0;
          background: #000;
          transform: scaleX(0); transform-origin: right;
          transition: transform 0.5s; z-index: 1;
        }
        .join-button:hover::before { transform: scaleX(1); transform-origin: left; }
        .join-button:hover { box-shadow: 0 10px 40px rgba(255,255,255,0.2); }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}