'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Zap } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import BigThree from '@/app/components/big_three'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

const SLIDES = [
  { src: '/slike/20251220-IMG_0729.jpg', quote: 'STRENGTH DOES NOT COME FROM THE BODY, BUT FROM THE WILL.', sub: 'Arnold Schwarzenegger' },
  { src: '/slike/20251220-IMG_0943.jpg', quote: 'THE IRON NEVER LIES TO YOU.', sub: 'Henry Rollins' },
  { src: '/slike/IMG_0063.jpg', quote: "HATE ME OR LOVE ME, YOU WATCHED. THAT'S ALL YOU COULD DO.", sub: 'Russel Orhii.' },
  { src: '/slike/IMG_1844.jpg', quote: 'JUST THE BAR.', sub: 'Crannon.' },
  { src: '/slike/IMG_1886-2.jpg', quote: 'AKO NE DIGNES P**** SI.', sub: 'Oliver Ozvačić.' },
  { src: '/slike/IMG_1890.jpg', quote: 'STVARAJ REZULTATE, NE ISPRIKE.', sub: 'Tvoj put do pobjedničkog postolja počinje ovdje.' },
]

const StatIcons = {
  lifters: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M1 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2" /><path d="M17 14a4 4 0 0 1 4 4v2" /></svg>),
  records: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>),
  europe: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>),
  year: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>),
}

const STATS = [
  { val: '10+',  label: 'LIFTERI',              icon: StatIcons.lifters },
  { val: '12',   label: 'DRŽAVNI REKORDI',      icon: StatIcons.records },
  { val: '6',    label: 'EUROPSKA NATJECANJA',  icon: StatIcons.europe  },
  { val: '2023', label: 'OSNOVANO',             icon: StatIcons.year    },
]

const FEATURES = [
  { sym: '01', title: 'ZNANOST IZA TRENINGA',   desc: 'Nema nagađanja. Uz pomoć RPE tablica i metodološkog sastavljanja treninga, određujemo optimalne treninge za tvoj napredak.' },
  { sym: '02', title: 'ANALIZA TEHNIKE',         desc: 'Izravni povrat informacija. Tvoj video izvedbe analiziramo kako bismo eliminirali slabe točke, spriječili ozljede i unaprijedili tehniku.' },
  { sym: '03', title: 'ADAPTIVNI BLOKOVI',       desc: 'Tvoj život nije linearan, a tako nije ni trening. Radimo prilagodbe ovisno o tvom oporavku, stresu i snazi.' },
  { sym: '04', title: 'EKSPORT ZA NATJECANJE',   desc: 'Sve tvoje brojke spremne za peaking. Vizualiziraj napredak putem grafova i izvezi podatke za arhivu.' },
]

const FOUNDERS = [
  {
    name: 'WALTER SMAJLOVIĆ',
    role: 'GLAVNI TRENER & SUOSNIVAČ',
    nickname: 'Gica',
    img: '/slike/walter.png',
    bio: 'Walter Smajlović izgradio je LWL UP na temeljima beskompromisnog rada. Zahvaljujući svom višegodišnjem iskustvu u kompetitivnom powerliftingu, razvio je sustav koji uklanja pogreške i maksimizira snagu svakog pojedinca.',
    achievements: ['Powerlifting trener & višestruki državni prvak', '10x Državni prvak, 4+ državnih rekorda', 'European Open 2025 – 10. mjesto', 'Mentor za 10+ aktivnih natjecatelja'],
    imgLeft: true,
  },
  {
    name: 'LUKA GREŽINA',
    role: 'PODPREDSJEDNIK & SUOSNIVAČ',
    nickname: null,
    img: '/slike/luka-g.jpg',
    bio: 'Luka Grežina jedan je od stupova LWL UP-a. Uz ulogu podpredsjednika, aktivni je natjecatelj i trener koji svakodnevno prenosi znanje i iskustvo na mlađe generacije liftera u klubu.',
    achievements: ['2x Državni prvak u M-120kg kategoriji', 'Aktivni natjecatelj i trener', 'Total: 747.5kg | GLP: 87.21', 'Suosnivač LWL UP-a 2023. godine'],
    imgLeft: false,
  },
]

function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const [animData, setAnimData] = useState<object | null>(null)
  const lottieRef = useRef<any>(null)
  
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      onMouseEnter={() => lottieRef.current?.play()} onMouseLeave={() => lottieRef.current?.stop()}
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 500, width: '48px', height: '48px', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.8)', transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)', pointerEvents: visible ? 'auto' : 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      {animData ? <Lottie lottieRef={lottieRef} animationData={animData} loop autoplay={false} style={{ width: '28px', height: '28px' }} /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>}
    </button>
  )
}

function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!; let animId: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const NODES = 50
    const nodes = Array.from({ length: NODES }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.5 + 0.5 }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > canvas.width) n.vx *= -1; if (n.y < 0 || n.y > canvas.height) n.vy *= -1 })
      for (let i = 0; i < NODES; i++) for (let j = i + 1; j < NODES; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 160) { ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - dist / 160)})`; ctx.lineWidth = 0.7; ctx.stroke() }
      }
      nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill() })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.9 }} />
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const fallback = setTimeout(() => setVisible(true), 900)
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); clearTimeout(fallback) } },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    )
    if (ref.current) obs.observe(ref.current)
    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [])
  return { ref, visible }
}

function FounderRow({ founder, index }: { founder: typeof FOUNDERS[0]; index: number }) {
  const { ref, visible } = useReveal()
  const imgLeft = founder.imgLeft
  return (
    <div ref={ref} className={`founder-row${imgLeft ? '' : ' founder-row-reverse'}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(30px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)', transitionDelay: `${index * 0.1}s` }}>
      <div className="founder-img-wrap">
        <img src={founder.img} alt={founder.name} className="founder-img"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', filter: 'brightness(0.85) grayscale(0.15)', transition: 'transform 0.8s' }} />
        <div style={{ position: 'absolute', inset: 0, background: imgLeft ? 'linear-gradient(to bottom right, transparent 65%, #0a0a0a 100%)' : 'linear-gradient(to bottom left, transparent 65%, #0a0a0a 100%)' }} />
        <div style={{ position: 'absolute', bottom: '20px', left: imgLeft ? '24px' : 'auto', right: !imgLeft ? '24px' : 'auto', fontFamily: 'var(--fd)', fontSize: 'clamp(3rem,6vw,6rem)', fontWeight: 800, color: 'rgba(255,255,255,0.06)', lineHeight: 1, userSelect: 'none' }}>
          0{index + 1}
        </div>
      </div>
      <div className="founder-text-wrap">
        <div style={{ position: 'absolute', top: '-10px', right: imgLeft ? '16px' : 'auto', left: !imgLeft ? '16px' : 'auto', fontFamily: 'var(--fd)', fontSize: 'clamp(6rem,12vw,14rem)', fontWeight: 800, color: 'rgba(255,255,255,0.025)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
          0{index + 1}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', fontFamily: 'var(--fm)' }}>{founder.role}</div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem, 3.5vw, 3.2rem)', lineHeight: 0.92, marginBottom: founder.nickname ? '8px' : '24px', letterSpacing: '-0.01em' }}>{founder.name}</h2>
          {founder.nickname && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: '24px', fontStyle: 'italic' }}>"{founder.nickname}"</div>}
          <div style={{ width: '36px', height: '2px', background: '#fff', marginBottom: '24px', opacity: 0.7 }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.85, fontSize: '0.92rem', marginBottom: '28px', maxWidth: '460px' }}>{founder.bio}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {founder.achievements.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: 'rgba(255,255,255,0.7)' }}>
                <div style={{ width: '4px', height: '4px', background: '#fff', flexShrink: 0, marginTop: '8px', opacity: 0.4 }} />
                <span style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const [slide, setSlide] = useState(0)
  const [ready, setReady] = useState(false)
  const timerRef = useRef<any>(null)
  const statsReveal  = useReveal()
  const clubReveal   = useReveal()
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
      <div className="star-field" />
      <NetworkCanvas />
      <Navbar variant="transparent" />
      <ScrollToTop />

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {SLIDES.map((s, i) => (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === slide ? 1 : 0, transition: 'opacity 1.5s ease-in-out', zIndex: 0 }}>
            <img src={s.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.25) saturate(0.7)', transform: i === slide ? 'scale(1.05)' : 'scale(1)', transition: 'transform 8s ease-out' }} />
          </div>
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(5,5,5,0.5) 100%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, #050505 100%)', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(40px)', transition: 'all 1.2s cubic-bezier(.16,1,.3,1)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '600px' }}>
            <img src="/slike/logopng.png" alt="LWL UP Logo" style={{ width: 'clamp(180px, 50vw, 480px)', height: 'auto', marginBottom: '28px', filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.15))' }} />

            {/* Quote — ograničena širina da ne prelama prerano */}
            <div style={{ width: '100%', maxWidth: '520px' }}>
              <p style={{ fontSize: 'clamp(0.85rem, 2.8vw, 1.4rem)', color: '#fff', fontStyle: 'italic', letterSpacing: '0.02em', fontWeight: 300, marginBottom: '8px', transition: 'all 0.8s', lineHeight: 1.55 }}>
                "{SLIDES[slide].quote}"
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.58rem, 1.8vw, 0.72rem)', letterSpacing: '0.38em', textTransform: 'uppercase', marginBottom: '0' }}>
                — {SLIDES[slide].sub}
              </p>
            </div>

            {/* CTA gumbi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '40px', width: '100%', maxWidth: '300px' }}>
              <Link href="/survey" style={{ textDecoration: 'none' }}>
                <button className="btn-primary-cta" style={{ width: '100%', padding: '17px 24px', background: '#fff', color: '#000', border: '1px solid #fff', fontSize: 'clamp(0.68rem, 2.2vw, 0.85rem)', fontWeight: 800, letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.35s', fontFamily: 'var(--fm)' }}>
                  ZAPOČNI TRANSFORMACIJU
                </button>
              </Link>
              <Link href="/training" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary-cta" style={{ width: '100%', padding: '15px 24px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: 'clamp(0.68rem, 2.2vw, 0.85rem)', fontWeight: 700, letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'var(--fm)' }}>
                  TRENING →
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Slideshow dots */}
        <div style={{ position: 'absolute', bottom: '32px', display: 'flex', gap: '8px', zIndex: 3 }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => goSlide(i)} style={{ cursor: 'pointer', width: i === slide ? 24 : 7, height: 3, background: i === slide ? '#fff' : 'rgba(255,255,255,0.2)', transition: 'all 0.6s' }} />
          ))}
        </div>
      </section>

      {/* ══ STATS ═════════════════════════════════════════════════ */}
      <section style={{ background: '#050505', position: 'relative', zIndex: 10 }}>
        <div ref={statsReveal.ref} style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid rgba(255,255,255,0.1)' }} className="stats-grid">
          {STATS.map((s, i) => (
            <div key={i} className="stat-card"
              style={{ padding: 'clamp(40px,6vw,80px) clamp(16px,3vw,40px)', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: 'pointer', opacity: statsReveal.visible ? 1 : 0, transform: statsReveal.visible ? 'none' : 'translateY(30px)', transition: `opacity 0.7s ${i * 0.1}s, transform 0.7s ${i * 0.1}s, background 0.4s, border-color 0.4s` }}>
              <div className="stat-icon" style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '16px', display: 'flex', justifyContent: 'center', transition: 'color 0.4s' }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2rem,6vw,4.5rem)', lineHeight: 1, marginBottom: '10px' }}>{s.val}</div>
              <div style={{ fontSize: 'clamp(0.5rem,1.5vw,0.65rem)', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.4)', transition: 'color 0.4s' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ BIG THREE ═════════════════════════════════════════════ */}
      <BigThree />


      {/* ══ KATEGORIJE ═══════════════════════════════════════════ */}
      <section id="kategorije" style={{ background: '#050505', borderTop: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,80px)' }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.25)', marginBottom: '14px', fontFamily: 'var(--fm)' }}>POWERLIFTING NATJECANJA</div>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,6vw,5rem)', lineHeight: 0.9, marginBottom: '20px' }}>KATEGORIJE<br /><span style={{ color: 'rgba(255,255,255,0.2)' }}>NATJECANJA</span></h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.82rem,2vw,0.95rem)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.8 }}>
              Natjecatelji se raspoređuju prema spolu, dobi i tjelesnoj težini — svaki ima jednake uvjete za borbu za vrh.
            </p>
          </div>

          {/* Dobne kategorije */}
          <div style={{ marginBottom: 'clamp(40px,6vw,72px)' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.3)', marginBottom: '20px', fontFamily: 'var(--fm)', textAlign: 'center' }}>DOBNE KATEGORIJE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { name: 'KADETI',     age: '14–18 god.', color: '#60a5fa' },
                { name: 'JUNIORI',    age: '19–23 god.', color: '#a78bfa' },
                { name: 'OPEN',       age: '24–39 god.', color: '#f0f0f0' },
                { name: 'MASTERS 1',  age: '40–49 god.', color: '#facc15' },
                { name: 'MASTERS 2',  age: '50–59 god.', color: '#fb923c' },
                { name: 'MASTERS 3+', age: '60+ god.',   color: '#f87171' },
              ].map((cat, i) => (
                <div key={i} style={{ padding: 'clamp(18px,3vw,28px) clamp(12px,2vw,20px)', background: '#06060a', textAlign: 'center', transition: 'background 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#101014'}
                  onMouseLeave={e => e.currentTarget.style.background = '#06060a'}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1rem,2vw,1.3rem)', color: cat.color, marginBottom: '6px', letterSpacing: '0.03em' }}>{cat.name}</div>
                  <div style={{ fontSize: 'clamp(0.62rem,1.5vw,0.72rem)', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>{cat.age}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Težinske kategorije */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(16px,3vw,32px)' }} className="cat-weight-grid">
            {/* Muške */}
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#06060a' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', background: '#60a5fa', borderRadius: '50%' }} />
                <span style={{ fontSize: '0.62rem', letterSpacing: '0.35em', color: '#60a5fa', fontFamily: 'var(--fm)', fontWeight: 700 }}>MUŠKARCI</span>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['-59','-66','-74','-83','-93','-105','-120','+120'].map(kg => (
                  <div key={kg} style={{ padding: '6px 14px', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)', fontSize: 'clamp(0.7rem,1.8vw,0.82rem)', color: '#93c5fd', fontFamily: 'var(--fm)', fontWeight: 600, letterSpacing: '0.05em' }}>{kg} kg</div>
                ))}
              </div>
            </div>
            {/* Ženske */}
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#06060a' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', background: '#f472b6', borderRadius: '50%' }} />
                <span style={{ fontSize: '0.62rem', letterSpacing: '0.35em', color: '#f472b6', fontFamily: 'var(--fm)', fontWeight: 700 }}>ŽENE</span>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['-47','-52','-57','-63','-69','-76','-84','+84'].map(kg => (
                  <div key={kg} style={{ padding: '6px 14px', background: 'rgba(244,114,182,0.07)', border: '1px solid rgba(244,114,182,0.15)', fontSize: 'clamp(0.7rem,1.8vw,0.82rem)', color: '#f9a8d4', fontFamily: 'var(--fm)', fontWeight: 600, letterSpacing: '0.05em' }}>{kg} kg</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', fontFamily: 'var(--fm)' }}>
            KATEGORIJE PO IPF STANDARDU · SVAKA KOMBINACIJA DOBI I KATEGORIJE = ZASEBNO NATJECANJE
          </div>
        </div>
      </section>

      {/* ══ ABOUT CLUB ════════════════════════════════════════════ */}
      <section id="club" style={{ padding: 'clamp(80px,12vw,180px) clamp(20px,5vw,60px)', maxWidth: '1400px', margin: '0 auto' }}>
        <div ref={clubReveal.ref} style={{ opacity: clubReveal.visible ? 1 : 0, transform: clubReveal.visible ? 'none' : 'translateY(30px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="club-grid">
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3rem,8vw,6rem)', lineHeight: 0.9, marginBottom: 'clamp(20px,4vw,40px)' }}>
                STVORENI<br /><span style={{ color: 'rgba(255,255,255,0.3)' }}>U ŽELJEZU</span>
              </h2>
              <p style={{ fontSize: 'clamp(0.9rem,2.5vw,1.2rem)', lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
                LWL UP nije samo klub — to je zajednica snage u kojoj natjecatelji ruše granice ljudskog potencijala. Klub su 2023. godine osnovali Walter Smajlović i Luka Grežina radi okupljanja ljudi s istim ciljem; postići što veći total. Od tada podižemo standarde powerliftinga u Hrvatskoj.
              </p>
              <div className="club-info-cards">
                {[['Zajednica', 'Treniramo zajedno, natječemo se zajedno, rastemo zajedno.'], ['Stručnost', 'Svaka serija ima svrhu. Svaki postotak je izračunat.']].map(([t, d]) => (
                  <div key={t} className="info-card" style={{ cursor: 'pointer', transition: '0.3s' }}>
                    <h4 style={{ color: '#fff', fontSize: 'clamp(0.95rem,2vw,1.1rem)', marginBottom: '8px' }}>{t}</h4>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.8rem,1.8vw,0.9rem)' }}>{d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="club-images">
              <div style={{ height: 'clamp(200px,35vw,400px)', overflow: 'hidden', borderRadius: '4px', marginTop: 'clamp(0px,4vw,40px)' }}>
                <img src="/slike/IMG_1844.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.8s' }} alt="Club" className="club-img" />
              </div>
              <div style={{ height: 'clamp(200px,35vw,400px)', overflow: 'hidden', borderRadius: '4px' }}>
                <img src="/slike/IMG_1890.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.8s' }} alt="Club" className="club-img" />
              </div>
            </div>
          </div>
        </div>
      </section>

      

      {/* ══ FOUNDERS ══════════════════════════════════════════════ */}
      <section id="coach" style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(60px,10vw,100px) clamp(20px,5vw,60px) clamp(40px,6vw,60px)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.25)', marginBottom: '14px', fontFamily: 'var(--fm)' }}>OSNIVAČI KLUBA</div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,6vw,5.5rem)', lineHeight: 0.88, margin: 0, letterSpacing: '-0.0em' }}>
                LJUDI IZA <br /><span style={{ color: 'rgba(255,255,255,0.2)', marginTop: '6px', display: 'inline-block' }}>ŠIPKE</span>
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.8rem,2vw,0.9rem)', lineHeight: 1.8, maxWidth: '380px', marginBottom: '8px' }}>
              LWL UP počinje s dvojicom natjecatelja koji su 2023. godine odlučili da Hrvatska zaslužuje bolji powerlifting.
            </p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {FOUNDERS.map((founder, i) => (
            <div key={founder.name} style={{ borderBottom: i < FOUNDERS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <FounderRow founder={founder} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* ══ SYSTEM ════════════════════════════════════════════════ */}
      <section id="system" style={{ background: '#0a0a0a', padding: 'clamp(80px,12vw,150px) clamp(20px,5vw,60px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div ref={systemReveal.ref} style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(48px,8vw,100px)', opacity: systemReveal.visible ? 1 : 0, transform: systemReveal.visible ? 'none' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,7vw,5rem)', marginBottom: '16px' }}>ONLINE COACHING</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', fontSize: 'clamp(0.6rem,2vw,0.85rem)' }}>TRENER U VAŠEM DŽEPU, 24/7.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{ background: '#050505', padding: 'clamp(28px,4vw,50px) clamp(20px,3vw,30px)', border: '1px solid rgba(255,255,255,0.05)', transition: '0.4s cubic-bezier(.16,1,.3,1)', position: 'relative', overflow: 'hidden', opacity: systemReveal.visible ? 1 : 0, transform: systemReveal.visible ? 'none' : 'translateY(40px)', transitionDelay: `${i * 0.1}s`, transitionDuration: '0.7s' }}>
                <div style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', fontFamily: 'var(--fd)', color: 'rgba(255,255,255,0.05)', position: 'absolute', top: '10px', right: '16px', transition: 'color 0.4s' }}>{f.sym}</div>
                <h3 style={{ fontSize: 'clamp(0.85rem,2vw,1.2rem)', letterSpacing: '0.1em', marginBottom: '16px', color: '#fff' }}>{f.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.78rem,1.8vw,0.85rem)', lineHeight: 1.8 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════ */}
      <section style={{ height: 'clamp(60vh,80vh,80vh)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          <img src="/slike/IMG_1886-2.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.15) grayscale(1)', animation: 'slowZoom 20s ease-in-out infinite alternate' }} alt="Legacy" />
        </div>
        <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
          <h2 className="cta-glow-text" style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3rem,12vw,12rem)', lineHeight: 0.85, marginBottom: 'clamp(24px,4vw,40px)' }}>
            OSTAVI<br />SVOJ TRAG
          </h2>
          <Link href="/survey" style={{ textDecoration: 'none' }}>
            <button className="btn-cta-final" style={{ padding: 'clamp(16px,2.5vw,25px) clamp(32px,6vw,80px)', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.6)', fontSize: 'clamp(0.75rem,2.5vw,1rem)', fontWeight: 900, letterSpacing: '0.3em', cursor: 'pointer', transition: 'all 0.4s', fontFamily: 'var(--fm)', position: 'relative', overflow: 'hidden' }}>
              <span style={{ position: 'relative', zIndex: 2 }}>PRIDRUŽI SE TIMU</span>
            </button>
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        /* ══ STAT CARDS — hover s osvjetljenjem ══════════════════ */
        .stat-card {
          transition: background 0.35s, transform 0.35s;
        }
        .stat-card:hover {
          background: rgba(255,255,255,0.04) !important;
          transform: translateY(-4px);
        }
        .stat-card:hover .stat-icon {
          color: rgba(255,255,255,0.6) !important;
        }
        .stat-card:hover > div:last-child {
          color: rgba(255,255,255,0.65) !important;
        }

        /* ══ HERO BUTTONS ═════════════════════════════════════════ */
        .btn-primary-cta:hover {
          background: #000 !important;
          color: #fff !important;
          border-color: rgba(255,255,255,0.5) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(255,255,255,0.1);
        }
        .btn-secondary-cta:hover {
          border-color: rgba(255,255,255,0.7) !important;
          background: rgba(255,255,255,0.06) !important;
          transform: translateY(-2px);
        }

        /* ══ FOOTER CTA ═══════════════════════════════════════════ */
        .btn-cta-final::before {
          content: '';
          position: absolute; inset: 0;
          background: #fff;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
          z-index: 1;
        }
        .btn-cta-final:hover::before { transform: scaleX(1); transform-origin: left; }
        .btn-cta-final:hover { color: #000 !important; border-color: #fff !important; box-shadow: 0 0 60px rgba(255,255,255,0.15); }
        .btn-cta-final:hover span { color: #000; }

        /* ══ GLOW TEXT ════════════════════════════════════════════ */
        .cta-glow-text {
          text-shadow: 0 0 40px rgba(255,255,255,0.08);
          animation: textGlow 3s ease-in-out infinite;
        }

        /* ══ HOVER OSTALO ═════════════════════════════════════════ */
        .info-card:hover h4 { color: rgba(255,255,255,0.7) !important; }
        .founder-img:hover  { transform: scale(1.04) !important; }
        .club-img:hover     { transform: scale(1.05) !important; }
        .feature-card:hover { transform: translateY(-6px) !important; border-color: rgba(255,255,255,0.15) !important; }

        /* ══ GRID LAYOUTS ═════════════════════════════════════════ */
        .founder-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 560px;
        }
        .founder-row-reverse .founder-img-wrap { order: 2; }
        .founder-row-reverse .founder-text-wrap { order: 1; }
        .founder-img-wrap  { position: relative; overflow: hidden; min-height: 400px; }
        .founder-text-wrap {
          padding: clamp(40px,7vw,80px) clamp(24px,5vw,72px);
          background: #0a0a0a;
          display: flex; flex-direction: column; justify-content: center;
          position: relative; overflow: hidden;
          border-left: 1px solid rgba(255,255,255,0.07);
        }
        .founder-row-reverse .founder-text-wrap { border-left: none; border-right: 1px solid rgba(255,255,255,0.07); }

        .club-grid        { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: clamp(40px,6vw,100px); align-items: center; }
        .club-info-cards  { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(16px,3vw,30px); margin-top: clamp(24px,4vw,50px); }
        .club-images      { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(10px,2vw,20px); }
        .features-grid    { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(12px,2vw,30px); }

        /* ══ KEYFRAMES ════════════════════════════════════════════ */
        @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.08); } }
        @keyframes textGlow {
          0%,100% { text-shadow: 0 0 40px rgba(255,255,255,0.08), 0 0 80px rgba(255,255,255,0.03); }
          50%      { text-shadow: 0 0 60px rgba(255,255,255,0.2), 0 0 120px rgba(255,255,255,0.1), 0 0 200px rgba(255,255,255,0.05); }
        }

        /* ══ MOBILE ═══════════════════════════════════════════════ */
        @media (max-width: 768px) {
          .cat-weight-grid { grid-template-columns: 1fr !important; }
          .founder-row { grid-template-columns: 1fr !important; min-height: unset; }
          .founder-row-reverse .founder-img-wrap { order: 1; }
          .founder-row-reverse .founder-text-wrap { order: 2; }
          .founder-img-wrap { min-height: 280px; }
          .founder-text-wrap { border-left: none !important; border-right: none !important; border-top: 1px solid rgba(255,255,255,0.07); }
          .club-grid       { grid-template-columns: 1fr !important; gap: 32px !important; }
          .club-images     { grid-template-columns: 1fr 1fr !important; }
          .club-info-cards { grid-template-columns: 1fr !important; }
          .features-grid   { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .stats-grid      { grid-template-columns: 1fr 1fr !important; }
          .stats-grid > div:nth-child(2) { border-right: none !important; }
          .stats-grid > div:nth-child(3) { border-top: 1px solid rgba(255,255,255,0.1); }
          .stats-grid > div:nth-child(4) { border-top: 1px solid rgba(255,255,255,0.1); border-right: none !important; }
        }
        @media (max-width: 480px) {
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}