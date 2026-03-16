'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Zap, Shield, Target, Award } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'

const SLIDES = [
  { src: '/slike/20251220-IMG_0729.jpg', quote: 'DISCIPLINA JE MOST IZMEĐU CILJA I USPJEHA.', sub: 'Dosljednost pobjeđuje talent svaki put.' },
  { src: '/slike/20251220-IMG_0943.jpg', quote: 'SNAGA SE NE MJERI SAMO KILOGRAMIMA.', sub: 'Gradi karakter kroz svaki teški set.' },
  { src: '/slike/IMG_0063.jpg', quote: 'VAŠA JEDINA KONKURENCIJA STE VI OD JUČER.', sub: 'Postani najbolja verzija sebe.' },
  { src: '/slike/IMG_1844.jpg', quote: 'BOL JE PRIVREMENA, PONOS JE VJEČAN.', sub: 'Svako ponavljanje te približava vrhu.' },
  { src: '/slike/IMG_1886-2.jpg', quote: 'NE POSTOJE PREČACI DO ISTINSKE SNAGE.', sub: 'Samo rad, znoj i precizno programiranje.' },
  { src: '/slike/IMG_1890.jpg', quote: 'STVARAJ REZULTATE, NE ISPRIKE.', sub: 'Tvoj put do pobjedničkog postolja počinje ovdje.' },
]

const STATS = [
  { val: '10+', label: 'ATLETA U SUSTAVU', icon: <Target size={18} /> },
  { val: '12', label: 'DRŽAVNIH REKORDA', icon: <Award size={18} /> },
  { val: '6', label: 'EUROPSKA NATJECANJA', icon: <Zap size={18} /> },
  { val: '2023', label: 'TRADICIJA SNAGE', icon: <Shield size={18} /> },
]

const FEATURES = [
  { sym: '01', title: 'ZNANOST IZA TRENINGA', desc: 'Nema nagađanja. Koristimo RPE skale i periodizaciju temeljenu na znanosti za maksimalni hipertrofijski i neurološki transfer snage.' },
  { sym: '02', title: 'ANALIZA TEHNIKE', desc: 'Direct feedback sustav. Tvoj video izvedbe analiziramo do detalja kako bismo eliminirali slabe točke i spriječili ozljede.' },
  { sym: '03', title: 'ADAPTIVNI BLOKOVI', desc: 'Tvoj život nije linearan, pa nije ni trening. Sustav se prilagođava tvom oporavku, stresu i snazi.' },
  { sym: '04', title: 'EKSPORT ZA NATJECANJE', desc: 'Sve tvoje brojke spremne za peaking. Vizualiziraj napredak kroz grafove i izvezi podatke za arhivu.' },
]

const LIFT_DETAILS = {
  // IMG_1882.jpg — atleta s šipkom stoji uspravno, centriran u kadru
  SQUAT: {
    img: '/slike/squat.jpg',
    points: [
      { top: '25%', left: '50%', label: 'POLOŽAJ ŠIPKE', desc: 'High bar — šipka leži na gornjem trapezijusu. Uspravniji torzo, duži ROM. Low bar — stražnji deltoid, manji ROM, više aktivacije stražnje lančane.' },
      { top: '46%', left: '50%', label: 'BRACE & BELT', desc: 'Maksimalni intraabdominalni tlak kroz cijeli descent i ascent. Belt nije zamjena za aktivan brace — pojačava ga.' },
      { top: '67%', left: '46%', label: 'DUBINA & KOLJENA', desc: 'Kuk mora proći ispod vrha koljena za valjan lift prema IPF pravilima. Koljena prate smjer prstiju.' },
      { top: '88%', left: '48%', label: 'STOPALA', desc: 'Tripod foot — ravnomjerna težina kroz petu, vanjski rub i prednji dio. Peta ne smije se podizati.' }
    ]
  },
  // IMG_1904.jpg — atleta leži horizontalno na klupi, bench press
  // Slika je landscape, atleta zauzima sredinu od ~15% do ~90% visine
  'BENCH PRESS': {
    img: '/slike/bench.jpg',
    points: [
      { top: '20%', left: '38%', label: 'HVAT & ŠIPKA', desc: 'Širina hvata određuje kut lakta. Šipka se spušta na donji dio prsa. Zapešća ravna, ne savinuta.' },
      { top: '42%', left: '26%', label: 'GORNJA LEĐA', desc: 'Lopatice povučene i spuštene (retraction & depression) — stabilna baza za potisak. Smanjuje ROM.' },
      { top: '50%', left: '42%', label: 'ARCH', desc: 'Luk u donjem dijelu leđa omogućava leg drive. Što je veći luk, kraći je put šipke.' },
      { top: '58%', left: '56%', label: 'GLUTEUS NA KLUPI', desc: 'Stražnjica mora ostati na klupi cijelo vrijeme — kritično za IPF pravila i prijenos sile iz nogu.' },
      { top: '78%', left: '72%', label: 'LEG DRIVE', desc: 'Stopala ravno u pod — aktivno guranje stvara lanac napetosti kroz cijelo tijelo i stabilizira lift.' },
    ]
  },
  // IMG_2006.jpg — atleta u lockoutu deadlifta, centriran, portretna slika
  DEADLIFT: {
    img: '/slike/deadlift.jpg',
    points: [
      { top: '22%', left: '38%', label: 'LOCKOUT', desc: 'Puna ekstenzija kuka i koljena. Ramena iza šipke, ne hiperprekstenzija. Brada neutralno.' },
      { top: '40%', left: '42%', label: 'BRACE & BELT', desc: 'Maksimalni intraabdominalni tlak od početka do kraja lifta. Belt pojačava ali ne zamjenjuje brace.' },
      { top: '57%', left: '45%', label: 'HVAT', desc: 'Mixed grip ili hook grip za maksimalan grip. Šipka drži se u proksimalnoj palmarnoj brazdi, ne u prstima.' },
      { top: '68%', left: '44%', label: 'ŠIPKA UZ TIJELO', desc: 'Šipka klizi uz potkoljenice i natkoljenice cijeli put gore. Odmak od tijela = gubitak poluge i rizik ozljede.' },
      { top: '87%', left: '44%', label: 'STANCE', desc: 'Conventional — uži stance, ruke izvan nogu. Sumo — širi stance, ruke između nogu. Odabir ovisi o anatomiji.' }
    ]
  }
}

// ── Canvas Network Background ──────────────────────────────────────
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const NODES = 60
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })

      // Draw connections
      for (let i = 0; i < NODES; i++) {
        for (let j = i + 1; j < NODES; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 160) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / 160)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }} />
}

// ── Scroll reveal hook ─────────────────────────────────────────────
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
  const [activeLift, setActiveLift] = useState<keyof typeof LIFT_DETAILS | null>(null)
  const [hoveredHotspot, setHoveredHotspot] = useState<number | null>(null)

  const statsReveal = useReveal()
  const clubReveal = useReveal()
  const coachReveal = useReveal()
  const systemReveal = useReveal()
  const bigThreeReveal = useReveal()

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

      <NetworkCanvas />

      <Navbar variant="transparent" />

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {SLIDES.map((s, i) => (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === slide ? 1 : 0, transition: 'opacity 1.5s ease-in-out', zIndex: 0 }}>
            <img src={s.src} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'brightness(0.25) saturate(0.7)',
              transform: i === slide ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 8s ease-out'
            }} />
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

            {/* CTA buttons */}
            <div className="hero-cta-row" style={{ display: 'flex', gap: '16px', marginTop: '50px' }}>
              <Link href="/survey" style={{ textDecoration: 'none' }}>
                <button className="cta-primary" style={{
                  padding: '22px 60px', background: '#fff', color: '#000', border: '1px solid #fff',
                  fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.25em', cursor: 'pointer',
                  transition: 'all 0.35s', position: 'relative', overflow: 'hidden',
                  fontFamily: 'var(--fm)',
                }}>
                  <span style={{ position: 'relative', zIndex: 2 }}>ZAPOČNI TRANSFORMACIJU</span>
                </button>
              </Link>
              <Link href="/training" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '22px 40px', background: 'transparent', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', fontWeight: 700,
                  letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.3s',
                  fontFamily: 'var(--fm)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
                >
                  TRENING →
                </button>
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
            <div key={i} className="stat-card" style={{
              padding: '80px 40px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              transition: 'all 0.4s', cursor: 'pointer',
              opacity: statsReveal.visible ? 1 : 0,
              transform: statsReveal.visible ? 'none' : 'translateY(30px)',
              transitionDelay: `${i * 0.1}s`,
              transitionDuration: '0.7s',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '15px', display: 'flex', justifyContent: 'center' }} className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ fontFamily: 'var(--fd)', fontSize: '4.5rem', lineHeight: 1, marginBottom: '10px' }}>{s.val}</div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ MODAL ZA DETALJE LIFTA ════════════════════════════════ */}
      {activeLift && (
        <div className="modal-outer" style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(20px)', animation: 'fadeIn 0.3s ease' }}
          onClick={() => setActiveLift(null)}>
          <div className="modal-inner" style={{ width: '100%', maxWidth: '1080px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden', boxShadow: '0 60px 120px rgba(0,0,0,0.7)', animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}>

            {/* ── LEFT: slika s hotspotima ── */}
            <div className="modal-img-side" style={{ position: 'relative', background: '#000', overflow: 'auto' }}>
              <img src={LIFT_DETAILS[activeLift].img}
                style={{ 
                  width: '100%', height: 'auto', display: 'block', opacity: 0.8,
                  objectPosition: activeLift === 'BENCH PRESS' ? 'center center' : 'center top',
                }}
                alt={activeLift}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.88) 100%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 70%, #0a0a0a 100%)' }} />

              {LIFT_DETAILS[activeLift].points.map((p, i) => (
                <div key={i} style={{ position: 'absolute', top: p.top, left: p.left, transform: 'translate(-50%, -50%)', zIndex: 3 }}
                  onMouseEnter={() => setHoveredHotspot(i)} onMouseLeave={() => setHoveredHotspot(null)}>
                  <div className="hotspot" style={{ transform: hoveredHotspot === i ? 'scale(1.3)' : 'scale(1)', transition: '0.3s' }}>
                    <div className="hotspot-core" />
                    <div className="hotspot-ring" />
                    <div className="hotspot-label" style={{ opacity: hoveredHotspot === i ? 1 : 0, transform: hoveredHotspot === i ? 'translate(-50%, 8px)' : 'translate(-50%, 0)' }}>{p.label}</div>
                  </div>
                </div>
              ))}

              <div style={{ position: 'absolute', bottom: '32px', left: '36px', zIndex: 4 }}>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>TEHNIČKA ANALIZA</div>
                <div className="modal-lift-name" style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.8rem, 4vw, 4.2rem)', fontWeight: 700, lineHeight: 0.9, textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>{activeLift}</div>
              </div>
            </div>

            {/* ── RIGHT: panel s listom ── */}
            <div className="modal-text-side" style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, height: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>KLJUČNE TOČKE</div>
                <button onClick={() => setActiveLift(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', padding: '6px 14px', cursor: 'pointer', fontSize: '0.58rem', letterSpacing: '0.2em', transition: '0.2s', fontFamily: 'var(--fm)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                >✕ ZATVORI</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {LIFT_DETAILS[activeLift].points.map((p, i) => (
                  <div key={i}
                    onMouseEnter={() => setHoveredHotspot(i)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                    style={{
                      padding: '20px 28px', transition: 'all 0.2s', cursor: 'default',
                      borderBottom: i < LIFT_DETAILS[activeLift].points.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      background: hoveredHotspot === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                      opacity: hoveredHotspot === null || hoveredHotspot === i ? 1 : 0.3,
                      display: 'flex', gap: '14px', alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, marginTop: '2px', background: hoveredHotspot === i ? '#fff' : 'transparent', border: `1px solid ${hoveredHotspot === i ? '#fff' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: hoveredHotspot === i ? '#000' : 'rgba(255,255,255,0.35)', transition: 'all 0.2s' }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: '0.63rem', letterSpacing: '0.22em', fontWeight: 700, color: hoveredHotspot === i ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: '6px', transition: 'color 0.2s', fontFamily: 'var(--fm)' }}>{p.label}</div>
                      <p style={{ fontSize: '0.75rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.38)', margin: 0, fontWeight: 300 }}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ BIG THREE ═════════════════════════════════════════════ */}
      <section id="info" style={{ padding: '150px 60px', background: '#080808' }}>
        <div ref={bigThreeReveal.ref} style={{ maxWidth: '1400px', margin: '0 auto', opacity: bigThreeReveal.visible ? 1 : 0, transform: bigThreeReveal.visible ? 'none' : 'translateY(40px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="big-three-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '80px' }}>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '6rem', lineHeight: 0.9 }}>THE BIG<br /><span style={{ color: 'rgba(255,255,255,0.3)' }}>THREE</span></h2>
            <p style={{ maxWidth: '400px', color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}>Kliknite na disciplinu za dubinsku tehničku analizu i biomehaničke ključne točke.</p>
          </div>
          <div className="big-three-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '25px', height: '600px' }}>
            {(['SQUAT', 'BENCH PRESS', 'DEADLIFT'] as const).map((lift, idx) => (
              <div key={lift} onClick={() => setActiveLift(lift)} className="lift-card" style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', animationDelay: `${idx * 0.15}s` }}>
                <img src={LIFT_DETAILS[lift].img} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) brightness(0.4)', transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s' }} className="lift-img" alt={lift} />
                <div className="lift-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)', transition: '0.6s' }} />
                <div style={{ position: 'absolute', bottom: '40px', left: '40px', zIndex: 2 }}>
                  <div className="lift-title" style={{ fontFamily: 'var(--fd)', fontSize: '2.8rem', letterSpacing: '0.05em', transition: '0.4s' }}>{lift}</div>
                  <div className="lift-cta" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', transition: '0.4s', opacity: 0.7 }}>
                    <div className="cta-line" style={{ width: '30px', height: '1px', background: '#fff', transition: '0.4s' }} />
                    <span style={{ fontSize: '0.7rem', letterSpacing: '0.3em', fontWeight: 700 }}>ISTRAŽI TEHNIKU</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT CLUB ════════════════════════════════════════════ */}
      <section id="club" style={{ padding: '180px 60px', maxWidth: '1400px', margin: '0 auto' }}>
        <div ref={clubReveal.ref} className="club-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '100px', alignItems: 'center', opacity: clubReveal.visible ? 1 : 0, transform: clubReveal.visible ? 'none' : 'translateX(-40px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ position: 'relative' }}>
            <div className="club-section-num" style={{ position: 'absolute', top: '-60px', left: '-40px', fontSize: '12rem', fontFamily: 'var(--fd)', color: 'rgba(255,255,255,0.03)', zIndex: -1 }}>01</div>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '6rem', lineHeight: 0.9, marginBottom: '40px' }}>
              STVORENI<br /><span style={{ color: 'rgba(255,255,255,0.3)' }}>U ŽELJEZU</span>
            </h2>
            <p style={{ fontSize: '1.2rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', marginBottom: '30px', maxWidth: '600px' }}>
              LWL UP nije samo klub. To je zajednica snage gdje se anatomija tijela susreće s nepokolebljivom voljom. Od osnutka 2023., podigli smo standarde powerliftinga u regiji.
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
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', fontWeight: 700 }}>HEAD COACH & OSNIVAČ</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '20px' }}>PREDSTAVNIK KLUBA</div>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '4.5rem', lineHeight: 1, marginBottom: '30px' }}>THE MAN<br />BEHIND THE BAR</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.9, fontSize: '1.1rem', marginBottom: '30px' }}>
              Walter Smajlović je izgradio LWLUP na temeljima beskompromisnog rada. S višegodišnjim iskustvom u kompetitivnom powerliftingu, Walter je razvio sustav koji eliminira nagađanje i maksimizira snagu svakog pojedinca.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {['Certified Powerlifting Coach', 'Višestruki državni prvak i međunarodni natjecatelj', 'Mentor za 10+ aktivnih atleta', 'Nadimak: Gica'].map((item, i) => (
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
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '5rem', marginBottom: '20px' }}>DIGITALNI COACHING</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>VAŠ TRENER U VAŠEM DŽEPU, 24/7.</p>
          </div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{
                background: '#050505', padding: '50px 30px', border: '1px solid rgba(255,255,255,0.05)',
                transition: '0.4s cubic-bezier(.16,1,.3,1)', position: 'relative', overflow: 'hidden',
                opacity: systemReveal.visible ? 1 : 0,
                transform: systemReveal.visible ? 'none' : 'translateY(40px)',
                transitionDelay: `${i * 0.1}s`,
                transitionDuration: '0.7s',
              }}>
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
            BECOME<br /> A LEGACY
          </h2>
          <Link href="/survey" style={{ textDecoration: 'none' }}>
            <button className="cta-final-button" style={{
              padding: '25px 80px', background: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.6)',
              fontSize: '1rem', fontWeight: 900, letterSpacing: '0.3em', cursor: 'pointer',
              transition: '0.4s', position: 'relative', overflow: 'hidden',
              fontFamily: 'var(--fm)',
            }}>
              <span style={{ position: 'relative', zIndex: 2 }}>PRIDRUŽI SE TIMU</span>
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

        /* CTA PRIMARY hover - outline style, no blackout */
        .cta-primary:hover {
          background: transparent !important;
          color: #fff !important;
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(255,255,255,0.15);
        }

        /* STATS */
        .stat-card:hover { background: rgba(255,255,255,0.03); transform: translateY(-5px); }
        .stat-card:hover .stat-icon { color: #fff !important; transform: scale(1.2); }
        .stat-card:hover .stat-value { text-shadow: 0 0 20px rgba(255,255,255,0.3); }

        /* LIFT CARDS */
        .lift-card { animation: fadeInUp 0.8s ease-out backwards; }
        .lift-card:hover .lift-img { transform: scale(1.08); filter: grayscale(0) brightness(0.6) !important; }
        .lift-card:hover .lift-overlay { background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%) !important; }
        .lift-card:hover .lift-title { transform: translateX(10px); }
        .lift-card:hover .lift-cta { opacity: 1 !important; }
        .lift-card:hover .cta-line { width: 60px !important; }

        /* HOTSPOTS */
        .hotspot { position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
        .hotspot-core { width: 8px; height: 8px; background: #fff; border-radius: 50%; z-index: 2; box-shadow: 0 0 15px rgba(255,255,255,0.8); }
        .hotspot-ring { position: absolute; width: 100%; height: 100%; border: 1px solid #fff; border-radius: 50%; animation: pulse 2s infinite; }
        .hotspot-label { position: absolute; top: 100%; left: 50%; white-space: nowrap; font-size: 0.6rem; letter-spacing: 0.2em; color: #fff; margin-top: 10px; transition: 0.3s; pointer-events: none; background: rgba(0,0,0,0.8); padding: 5px 10px; border: 1px solid rgba(255,255,255,0.2); }

        /* CLUB */
        .club-image:hover .club-img { transform: scale(1.1); }
        .info-card:hover { transform: translateY(-5px); }

        /* COACH */
        .coach-image-wrapper:hover .coach-img { transform: scale(1.05); }
        .coach-badge:hover { transform: translateY(-5px); }
        .achievement-item:hover { transform: translateX(10px); color: #fff !important; }

        /* FEATURES */
        .feature-card:hover { transform: translateY(-10px); border-color: rgba(255,255,255,0.2) !important; background: #080808 !important; }
        .feature-card:hover .feature-number { color: rgba(255,255,255,0.15) !important; transform: scale(1.2); }

        /* CTA FINAL - outline, white fill on hover */
        .cta-final-button::before { content: ''; position: absolute; inset: 0; background: #fff; transform: scaleX(0); transform-origin: right; transition: transform 0.5s; z-index: 1; }
        .cta-final-button:hover::before { transform: scaleX(1); transform-origin: left; }
        .cta-final-button:hover { color: #000 !important; border-color: #fff; }
        .cta-final-button:hover span { color: #000; }

        /* FOOTER */

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.1); } }
        @keyframes textGlow { 0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.1); } 50% { text-shadow: 0 0 60px rgba(255,255,255,0.3); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }

        /* ══════════════════════════════════════════
           MOBILE — sve ispod 768px
        ══════════════════════════════════════════ */
        @media (max-width: 768px) {

          /* ── Navbar ── */
          nav { padding: 0 20px !important; height: 64px !important; }
          .nav-links { display: none !important; }

          /* ── Hero ── */
          section[style*="height: '100vh'"] { height: 100svh !important; }

          /* ── Stats: 2x2 grid ── */
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stat-card { padding: 40px 20px !important; }
          .stat-card:nth-child(2) { border-right: none !important; }
          .stat-card:nth-child(3) { border-right: 1px solid rgba(255,255,255,0.1) !important; }

          /* ── Big Three: 1 stupac ── */
          .big-three-grid { grid-template-columns: 1fr !important; height: auto !important; gap: 16px !important; }
          .big-three-header { flex-direction: column !important; gap: 20px !important; align-items: flex-start !important; }
          .big-three-header h2 { font-size: 3.5rem !important; }
          .big-three-header p { max-width: 100% !important; }
          .lift-card { height: 280px !important; }

          /* ── Modal: full screen ── */
          .modal-outer { padding: 0 !important; align-items: flex-end !important; }
          .modal-inner {
            grid-template-columns: 1fr !important;
            max-height: 95svh !important;
            border-radius: 12px 12px 0 0 !important;
            overflow-y: auto !important;
          }
          .modal-img-side { height: 55vw !important; min-height: 220px !important; max-height: 320px !important; }
          .modal-text-side { padding: 24px 20px !important; max-height: none !important; position: static !important; height: auto !important; }
          .modal-lift-name { font-size: 2.2rem !important; }

          /* ── Club section ── */
          .club-grid { grid-template-columns: 1fr !important; gap: 40px !important; padding: 80px 20px !important; }
          .club-img-grid { grid-template-columns: 1fr 1fr !important; }
          .club-img-grid > div { height: 220px !important; margin-top: 0 !important; }
          .club-section-num { display: none !important; }

          /* ── Coach section ── */
          .coach-grid { grid-template-columns: 1fr !important; gap: 40px !important; padding: 80px 20px !important; }
          .coach-badge { left: 16px !important; right: 16px !important; padding: 12px 20px !important; }
          .coach-badge div:first-child { font-size: 1.1rem !important; }

          /* ── System / Features: 1 stupac ── */
          .features-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .system-section { padding: 80px 20px !important; }

          /* ── CTA ── */
          .cta-final-button { padding: 20px 40px !important; font-size: 0.8rem !important; }

          /* ── Footer ── */
          .footer-inner { flex-direction: column !important; gap: 40px !important; padding: 60px 20px !important; }
          .footer-nav-row { gap: 40px !important; }

          /* ── General padding ── */
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }

        /* ══════════════════════════════════════════
           SMALL MOBILE — ispod 480px
        ══════════════════════════════════════════ */
        @media (max-width: 480px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stat-card { padding: 30px 12px !important; }
          .stat-value { font-size: 3rem !important; }

          .hero-cta-row { flex-direction: column !important; align-items: center !important; width: 100% !important; }
          .hero-cta-row a, .hero-cta-row button { width: 100% !important; text-align: center !important; justify-content: center !important; }

          .modal-inner { max-height: 100svh !important; border-radius: 0 !important; }
          .modal-img-side { height: 50vw !important; }

          .club-img-grid > div { height: 160px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}