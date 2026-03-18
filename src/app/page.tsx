'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Zap } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import BigThree from '@/app/components/big_three'

// Lottie — no SSR
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

const SLIDES = [
  { src: '/slike/20251220-IMG_0729.jpg', quote: 'STRENGTH DOES NOT COME FROM THE BODY, BUT FROM THE WILL.', sub: 'Arnold Schwarzenegger' },
  { src: '/slike/20251220-IMG_0943.jpg', quote: 'THE IRON NEVER LIES TO YOU.', sub: 'Henry Rollins' },
  { src: '/slike/IMG_0063.jpg', quote: "HATE ME OR LOVE ME, YOU WATCHED. THAT'S ALL YOU COULD DO.", sub: 'Russel Orhii.' },
  { src: '/slike/IMG_1844.jpg', quote: 'JUST THE BAR.', sub: 'Crannon.' },
  { src: '/slike/IMG_1886-2.jpg', quote: 'AKO NE DIGNES P**** SI.', sub: 'Oliver Ozvačić.' },
  { src: '/slike/IMG_1890.jpg', quote: 'STVARAJ REZULTATE, NE ISPRIKE.', sub: 'Tvoj put do pobjedničkog postolja počinje ovdje.' },
]

// ── Custom SVG stat icons ──────────────────────────────────────────
const StatIcons = {
  lifters: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M1 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2" />
      <path d="M17 14a4 4 0 0 1 4 4v2" />
    </svg>
  ),
  records: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  europe: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  year: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
}

const STATS = [
  { val: '10+',  label: 'LIFTERI U SUSTAVU',   icon: StatIcons.lifters },
  { val: '12',   label: 'DRŽAVNI REKORDI',     icon: StatIcons.records },
  { val: '6',    label: 'EUROPSKA NATJECANJA', icon: StatIcons.europe  },
  { val: '2023', label: 'GODINA OSNIVANJA',    icon: StatIcons.year    },
]

const FEATURES = [
  { sym: '01', title: 'ZNANOST IZA TRENINGA',  desc: 'Nema nagađanja. Uz pomoć RPE tablica i metodološkog sastavljanja treninga, određujemo optimalne treninge za tvoj napredak.' },
  { sym: '02', title: 'ANALIZA TEHNIKE',        desc: 'Izravni povrat informacija. Tvoj video izvedbe analiziramo kako bismo eliminirali slabe točke, spriječili ozljede i unaprijedili tehniku.' },
  { sym: '03', title: 'ADAPTIVNI BLOKOVI',      desc: 'Tvoj život nije linearan, a tako nije ni trening. Radimo prilagodbe ovisno o tvom oporavku, stresu i snazi.' },
  { sym: '04', title: 'EKSPORT ZA NATJECANJE',  desc: 'Sve tvoje brojke spremne za peaking. Vizualiziraj napredak putem grafova i izvezi podatke za arhivu.' },
]

// ── Scroll-to-top with Lottie ──────────────────────────────────────
function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [animData, setAnimData] = useState<object | null>(null)
  const lottieRef = useRef<any>(null)

  useEffect(() => {
    fetch('/animations/scroll-top.json')
      .then(r => r.json())
      .then(setAnimData)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleEnter = () => {
    setHovered(true)
    lottieRef.current?.play()
  }
  const handleLeave = () => {
    setHovered(false)
    lottieRef.current?.stop()
  }

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      title="Natrag na vrh"
      style={{
        position: 'fixed', bottom: '40px', right: '40px', zIndex: 500,
        width: '52px', height: '52px',
        background: '#fff', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(12px)',
        transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s',
        pointerEvents: visible ? 'auto' : 'none',
        boxShadow: hovered ? '0 10px 36px rgba(255,255,255,0.25)' : '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      {animData ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={animData}
          loop={true}
          autoplay={false}
          style={{ width: '30px', height: '30px' }}
        />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
    </button>
  )
}

// ── Canvas network background ──────────────────────────────────────
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const NODES = 60
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
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
          if (dist < 160) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - dist / 160)})`; ctx.lineWidth = 0.7; ctx.stroke()
          }
        }
      }
      nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill() })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} id="network-canvas" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.9 }} />
}

// ── Scroll reveal ──────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

export default function Landing() {
  const [slide, setSlide] = useState(0)
  const [ready, setReady] = useState(false)
  const timerRef = useRef<any>(null)

  const statsReveal  = useReveal()
  const clubReveal   = useReveal()
  const coachReveal  = useReveal()
  const systemReveal = useReveal()

  useEffect(() => {
    setReady(true)
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 6000)
    return () => clearInterval(timerRef.current)
  }, [])

  const goSlide = (i: number) => {
    setSlide(i)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 6000)
  }

  return (
    <div style={{ background: '#050505', color: '#fff', overflowX: 'hidden', fontFamily: 'var(--fm)', position: 'relative' }}>

      {/* Static CSS star field — visible even when canvas is loading */}
      <div className="star-field" />
      <NetworkCanvas />
      <Navbar variant="transparent" />
      <ScrollToTop />

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {SLIDES.map((s, i) => (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === slide ? 1 : 0, transition: 'opacity 1.5s ease-in-out', zIndex: 0 }}>
            <img src={s.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.25) saturate(0.7)', transform: i === slide ? 'scale(1.05)' : 'scale(1)', transition: 'transform 8s ease-out' }} />
          </div>
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(5,5,5,0.5) 100%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, #050505 100%)', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(40px)', transition: 'all 1.2s cubic-bezier(.16,1,.3,1)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <img src="/slike/logopng.png" alt="LWLUP Logo" style={{ width: 'clamp(280px, 40vw, 550px)', height: 'auto', marginBottom: '30px', filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.15))' }} />
            <div style={{ maxWidth: '850px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)', color: '#fff', fontStyle: 'italic', letterSpacing: '0.02em', fontWeight: 300, marginBottom: '10px', transition: 'all 0.8s' }}>
                "{SLIDES[slide].quote}"
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
                {SLIDES[slide].sub}
              </p>
            </div>
            <div className="hero-cta-row" style={{ display: 'flex', gap: '16px', marginTop: '50px' }}>
              <Link href="/survey" style={{ textDecoration: 'none' }}>
                <button className="cta-primary" style={{ padding: '22px 60px', background: '#fff', color: '#000', border: '1px solid #fff', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.25em', cursor: 'pointer', transition: 'all 0.35s', position: 'relative', overflow: 'hidden', fontFamily: 'var(--fm)' }}>
                  <span style={{ position: 'relative', zIndex: 2 }}>ZAPOČNI TRANSFORMACIJU</span>
                </button>
              </Link>
              <Link href="/training" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '22px 40px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'var(--fm)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
                >TRENING →</button>
              </Link>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '50px', display: 'flex', gap: '10px', zIndex: 3 }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => goSlide(i)} style={{ cursor: 'pointer', width: i === slide ? 30 : 8, height: 3, background: i === slide ? '#fff' : 'rgba(255,255,255,0.2)', transition: 'all 0.6s' }} />
          ))}
        </div>
      </section>

      {/* ══ STATS ═════════════════════════════════════════════════ */}
      <section style={{ background: '#050505', position: 'relative', zIndex: 10 }}>
        <div ref={statsReveal.ref} className="stat-grid" style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {STATS.map((s, i) => (
            <div key={i} className="stat-card" style={{ padding: '80px 40px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.1)' : 'none', transition: 'all 0.4s', cursor: 'pointer', opacity: statsReveal.visible ? 1 : 0, transform: statsReveal.visible ? 'none' : 'translateY(30px)', transitionDelay: `${i * 0.1}s`, transitionDuration: '0.7s' }}>
              <div className="stat-icon" style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                {s.icon}
              </div>
              <div className="stat-value" style={{ fontFamily: 'var(--fd)', fontSize: '4.5rem', lineHeight: 1, marginBottom: '10px' }}>{s.val}</div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ BIG THREE ═════════════════════════════════════════════ */}
      <BigThree />

      {/* ══ ABOUT CLUB ════════════════════════════════════════════ */}
      <section id="club" style={{ padding: '180px 60px', maxWidth: '1400px', margin: '0 auto' }}>
        <div ref={clubReveal.ref} className="club-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '100px', alignItems: 'center', opacity: clubReveal.visible ? 1 : 0, transform: clubReveal.visible ? 'none' : 'translateX(-40px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ position: 'relative' }}>
            <div className="club-section-num" style={{ position: 'absolute', top: '-60px', left: '-40px', fontSize: '12rem', fontFamily: 'var(--fd)', color: 'rgba(255,255,255,0.03)', zIndex: -1 }}>01</div>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '6rem', lineHeight: 0.9, marginBottom: '40px' }}>
              STVORENI<br /><span style={{ color: 'rgba(255,255,255,0.3)' }}>U ŽELJEZU</span>
            </h2>
            <p style={{ fontSize: '1.2rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', marginBottom: '30px', maxWidth: '600px' }}>
              LWL UP nije samo klub- to je zajednica snage u kojoj natjecatelji ruše granice ljudskog potencijala. Klub su 2023. godine osnovali Walter Smajlović i Luka Grežina radi okupljanja ljudi s istim ciljem; postićišto veći total. Od tada podižemo standarde powerliftinga u Hrvatskoj.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '50px' }}>
              {[['Zajednica', 'Treniramo zajedno, natječemo se zajedno, rastemo zajedno.'], ['Stručnost', 'Svaka serija ima svrhu. Svaki postotak je izračunat.']].map(([t, d]) => (
                <div key={t} className="info-card" style={{ transition: '0.3s', cursor: 'pointer' }}>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '10px' }}>{t}</h4>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="club-img-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="club-image" style={{ height: '400px', overflow: 'hidden', borderRadius: '4px', marginTop: '40px' }}>
              <img src="/slike/IMG_1844.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.8s' }} className="club-img" alt="Club" />
            </div>
            <div className="club-image" style={{ height: '400px', overflow: 'hidden', borderRadius: '4px' }}>
              <img src="/slike/IMG_1890.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.8s' }} className="club-img" alt="Club" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ COACH ═════════════════════════════════════════════════ */}
      <section id="coach" style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '150px 60px' }}>
        <div ref={coachReveal.ref} className="coach-grid" style={{ maxWidth: '1300px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '100px', alignItems: 'center', opacity: coachReveal.visible ? 1 : 0, transform: coachReveal.visible ? 'none' : 'translateX(40px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ position: 'relative' }}>
            <div className="coach-image-wrapper" style={{ overflow: 'hidden', borderRadius: '4px' }}>
              <img src="/slike/walter.png" alt="Walter Smajlović" style={{ width: '100%', height: 'auto', filter: 'brightness(0.9) grayscale(0.2)', transition: 'transform 0.8s' }} className="coach-img" />
            </div>
            <div className="coach-badge" style={{ position: 'absolute', bottom: '20px', left: '20px', background: '#fff', color: '#000', padding: '15px 30px', transition: '0.4s' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 900 }}>WALTER SMAJLOVIĆ</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', fontWeight: 700 }}>GLAVNI TRENER & OSNIVAČ</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '20px' }}>PREDSTAVNIK KLUBA</div>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '4.5rem', lineHeight: 1, marginBottom: '30px' }}>ČOVJEK<br />IZA ŠIPKE</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.9, fontSize: '1.1rem', marginBottom: '30px' }}>
              Walter Smajlović izgradio je LWL UP na temeljima beskompromisnog rada. Zahvaljujući svom višegodišnjem iskustvu u kompetitivnom powerliftingu, Walter je razvio sustav koji uklanja pogreške i maksimizira snagu svakog pojedinca.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {['Powerlifting trener', 'Višestruki državni prvak i međunarodni natjecatelj', 'Mentor za 10+ aktivnih natjecatelja', 'Nadimak: Gica'].map((item, i) => (
                <div key={i} className="achievement-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'rgba(255,255,255,0.8)', transition: '0.3s' }}>
                  <Zap size={14} color="#fff" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SYSTEM ════════════════════════════════════════════════ */}
      <section id="system" className="system-section" style={{ background: '#0a0a0a', padding: '150px 0' }}>
        <div ref={systemReveal.ref} style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '100px', opacity: systemReveal.visible ? 1 : 0, transform: systemReveal.visible ? 'none' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '5rem', marginBottom: '20px' }}>ONLINE COACHING</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>TRENER U VAŠEM DŽEPU, 24/7.</p>
          </div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{ background: '#050505', padding: '50px 30px', border: '1px solid rgba(255,255,255,0.05)', transition: '0.4s cubic-bezier(.16,1,.3,1)', position: 'relative', overflow: 'hidden', opacity: systemReveal.visible ? 1 : 0, transform: systemReveal.visible ? 'none' : 'translateY(40px)', transitionDelay: `${i * 0.1}s`, transitionDuration: '0.7s' }}>
                <div className="feature-number" style={{ fontSize: '3rem', fontFamily: 'var(--fd)', color: 'rgba(255,255,255,0.05)', position: 'absolute', top: '10px', right: '20px', transition: '0.4s' }}>{f.sym}</div>
                <h3 style={{ fontSize: '1.2rem', letterSpacing: '0.1em', marginBottom: '20px', color: '#fff' }}>{f.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', lineHeight: 1.8 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════ */}
      <section style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          <img src="/slike/IMG_1886-2.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.15) grayscale(1)', animation: 'slowZoom 20s ease-in-out infinite alternate' }} alt="Legacy" />
        </div>
        <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3.5rem, 15vw, 12rem)', lineHeight: 0.8, marginBottom: '40px', animation: 'textGlow 3s ease-in-out infinite' }}>
            OSTAVI<br /> SVOJ TRAG
          </h2>
          <Link href="/survey" style={{ textDecoration: 'none' }}>
            <button className="cta-final-button" style={{ padding: '25px 80px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.6)', fontSize: '1rem', fontWeight: 900, letterSpacing: '0.3em', cursor: 'pointer', transition: '0.4s', position: 'relative', overflow: 'hidden', fontFamily: 'var(--fm)' }}>
              <span style={{ position: 'relative', zIndex: 2 }}>PRIDRUŽI SE TIMU</span>
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}