'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import BigThree from '@/app/components/big_three'
import { useLanguage } from '@/context/LanguageContext'


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

type FounderData = { name: string; nickname: string | null; img: string; imgLeft: boolean; role: string; bio: string; achievements: string[] }

function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <button aria-label="Scroll to top" className="scroll-to-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 500, width: '48px', height: '48px', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.8)', transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)', pointerEvents: visible ? 'auto' : 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
    </button>
  )
}

function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number, lastT = 0, paused = false

    const NODES = window.innerWidth < 768 ? 16 : 28
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }))

    const draw = (t: number) => {
      if (paused) return
      animId = requestAnimationFrame(draw)
      if (t - lastT < 33) return
      lastT = t
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > canvas.width) n.vx *= -1; if (n.y < 0 || n.y > canvas.height) n.vy *= -1 })
      for (let i = 0; i < NODES; i++) for (let j = i + 1; j < NODES; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 160) { ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - dist / 160)})`; ctx.lineWidth = 0.7; ctx.stroke() }
      }
      nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill() })
    }

    const resume = () => { if (paused) { paused = false; animId = requestAnimationFrame(draw) } }
    const pause  = () => { paused = true; cancelAnimationFrame(animId) }

    // Pause when tab is hidden
    const onVisibility = () => document.hidden ? pause() : resume()
    document.addEventListener('visibilitychange', onVisibility)

    // Pause when user scrolls well past the hero — canvas becomes invisible behind content
    const onScroll = () => window.scrollY > window.innerHeight * 1.5 ? pause() : resume()
    window.addEventListener('scroll', onScroll, { passive: true })

    animId = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
    }
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

function FounderRow({ founder, index }: { founder: FounderData; index: number }) {
  const { ref, visible } = useReveal()
  const imgLeft = founder.imgLeft
  return (
    <div ref={ref} className={`founder-row${imgLeft ? '' : ' founder-row-reverse'}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(30px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)', transitionDelay: `${index * 0.1}s` }}>
      <div className="founder-img-wrap">
        <Image src={founder.img} alt={founder.name} fill className="founder-img"
          style={{ objectFit: 'cover', objectPosition: 'top center', filter: 'brightness(0.85) grayscale(0.15)', transition: 'transform 0.8s' }} sizes="50vw" />
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
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.48)', marginBottom: '14px', fontFamily: 'var(--fm)' }}>{founder.role}</div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem, 3.5vw, 3.2rem)', lineHeight: 0.92, marginBottom: founder.nickname ? '8px' : '24px', letterSpacing: '-0.01em' }}>{founder.name}</h2>
          {founder.nickname && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.48)', letterSpacing: '0.15em', marginBottom: '24px', fontStyle: 'italic' }}>"{founder.nickname}"</div>}
          <div style={{ width: '36px', height: '2px', background: '#fff', marginBottom: '24px', opacity: 0.7 }} />
          <p style={{ color: 'rgba(255,255,255,0.62)', lineHeight: 1.85, fontSize: '0.92rem', marginBottom: '28px', maxWidth: '460px' }}>{founder.bio}</p>
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
  const { t } = useLanguage()

  const STATS = [
    { val: '10+',  label: t('home.stats.lifters'),  icon: StatIcons.lifters },
    { val: '12',   label: t('home.stats.records'),  icon: StatIcons.records },
    { val: '6',    label: t('home.stats.european'), icon: StatIcons.europe  },
    { val: '2023', label: t('home.stats.founded'),  icon: StatIcons.year    },
  ]
  const FEATURES = [
    { sym: '01', title: t('home.f1.title'), desc: t('home.f1.desc') },
    { sym: '02', title: t('home.f2.title'), desc: t('home.f2.desc') },
    { sym: '03', title: t('home.f3.title'), desc: t('home.f3.desc') },
    { sym: '04', title: t('home.f4.title'), desc: t('home.f4.desc') },
    { sym: '05', title: t('home.f5.title'), desc: t('home.f5.desc') },
    { sym: '06', title: t('home.f6.title'), desc: t('home.f6.desc') },
  ]
  const FOUNDERS: FounderData[] = [
    { name: 'WALTER SMAJLOVIĆ', nickname: 'Gica', img: '/slike/walter.png',  imgLeft: true,
      role: t('home.f.role0'), bio: t('home.f.bio0'),
      achievements: [t('home.f.ach0.0'), t('home.f.ach0.1'), t('home.f.ach0.2'), t('home.f.ach0.3')] },
    { name: 'LUKA GREŽINA',     nickname: null,   img: '/slike/luka-g.jpg',  imgLeft: false,
      role: t('home.f.role1'), bio: t('home.f.bio1'),
      achievements: [t('home.f.ach1.0'), t('home.f.ach1.1'), t('home.f.ach1.2'), t('home.f.ach1.3')] },
  ]
  const AGE_CATS = [
    { key: 'home.cat.cadets'  as const, age: '14 – 18', color: '#60a5fa' },
    { key: 'home.cat.juniors' as const, age: '19 – 23', color: '#a78bfa' },
    { key: 'home.cat.open'    as const, age: '24 – 39', color: '#e2e8f0' },
    { key: 'home.cat.m1'      as const, age: '40 – 49', color: '#facc15' },
    { key: 'home.cat.m2'      as const, age: '50 – 59', color: '#fb923c' },
    { key: 'home.cat.m3plus'  as const, age: '60+',     color: '#f87171' },
  ]

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
      <Navbar variant="solid" />
      <ScrollToTop />

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', height: '100svh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden' }}>
        {SLIDES.map((s, i) => (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === slide ? 1 : 0, transition: 'opacity 1.5s ease-in-out', zIndex: 0 }}>
            <Image src={s.src} alt="" fill priority={i === 0} quality={50}
              style={{ objectFit: 'cover', filter: 'brightness(0.25) saturate(0.7)', transform: i === slide ? 'scale(1.05)' : 'scale(1)', transition: 'transform 8s ease-out' }}
              sizes="100vw" />
          </div>
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(5,5,5,0.5) 100%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, #050505 100%)', zIndex: 1 }} />

        {/* Main content — starts below navbar with breathing room */}
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(20px,5vw,60px)', paddingTop: 'clamp(90px,16vh,160px)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} className="hero-content">
          <div style={{ opacity: ready ? 1 : 0, transform: ready ? 'none' : 'translateY(40px)', transition: 'all 1.2s cubic-bezier(.16,1,.3,1)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '680px' }}>

            {/* Big headline */}
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(4.2rem, 10vw, 9.5rem)', lineHeight: 0.88, marginBottom: '24px', marginTop: 0, letterSpacing: '-0.02em' }}>
              <span className="hero-outline" style={{ display: 'block' }}>LWL UP</span>
              <span style={{ display: 'block', color: '#fff' }}>YOUR GAME.</span>
            </h1>

            {/* Description */}
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.88rem,1.8vw,1rem)', lineHeight: 1.8, marginBottom: '28px', maxWidth: '480px' }}>
              {t('home.hero.desc')}
            </p>

            {/* CTA gumbi */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '14px', width: '100%', maxWidth: '480px' }} className="hero-btns">
              <Link href="/survey" style={{ textDecoration: 'none', flex: 1 }}>
                <button className="btn-primary-cta" style={{ width: '100%', padding: '16px 24px', background: '#fff', color: '#000', border: 'none', fontSize: 'clamp(0.58rem, 1.6vw, 0.72rem)', fontWeight: 800, letterSpacing: '0.2em', cursor: 'pointer', fontFamily: 'var(--fm)', display: 'block', whiteSpace: 'nowrap' as const, transition: 'all 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  {t('home.hero.cta1')}
                </button>
              </Link>
              <Link href="/training" style={{ textDecoration: 'none', flex: 1, display: 'flex', minHeight: '44px' }}>
                <button className="btn-secondary-cta" style={{ width: '100%', padding: '14px 24px', background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', fontSize: 'clamp(0.58rem, 1.6vw, 0.72rem)', fontWeight: 600, letterSpacing: '0.2em', cursor: 'pointer', fontFamily: 'var(--fm)', display: 'block', whiteSpace: 'nowrap' as const, transition: 'all 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  {t('home.hero.cta2')}
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quote — bottom right, absolutely positioned */}
        <div style={{ position: 'absolute', bottom: 'clamp(52px,8vh,80px)', right: 'clamp(20px,5vw,60px)', zIndex: 3, textAlign: 'right', maxWidth: 'clamp(220px,28vw,380px)', opacity: ready ? 1 : 0, transition: 'opacity 1.8s 0.5s' }}>
          <p style={{ fontSize: 'clamp(0.65rem,1.3vw,0.8rem)', color: 'rgba(255,255,255,0.62)', fontStyle: 'italic', lineHeight: 1.6, margin: 0, transition: 'all 0.8s' }}>
            &ldquo;{SLIDES[slide].quote}&rdquo;
          </p>
          <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: 'clamp(0.52rem,0.9vw,0.6rem)', letterSpacing: '0.28em', textTransform: 'uppercase' as const, marginTop: '6px', marginBottom: 0 }}>
            — {SLIDES[slide].sub}
          </p>
        </div>

        {/* Slideshow dots — bottom right, above quote */}
        <div style={{ position: 'absolute', bottom: 'clamp(30px,5vh,40px)', right: 'clamp(20px,5vw,60px)', display: 'flex', gap: '8px', zIndex: 3 }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => goSlide(i)} style={{ cursor: 'pointer', width: i === slide ? 24 : 7, height: 3, background: i === slide ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.6s' }} />
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
              <div style={{ fontSize: 'clamp(0.5rem,1.5vw,0.65rem)', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.6)', transition: 'color 0.4s' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ BIG THREE ═════════════════════════════════════════════ */}
      <BigThree />


      {/* ══ KATEGORIJE ═══════════════════════════════════════════ */}
      <section id="kategorije" style={{ background: '#04040a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 'clamp(48px,7vw,88px)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: '28px', height: '2px', background: 'rgba(255,255,255,0.6)' }} />
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.42em', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--fm)', fontWeight: 700 }}>{t('home.cats.eyebrow')}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,6vw,5rem)', lineHeight: 0.9, marginBottom: '20px' }}>
              {t('home.cats.title1')}<br /><span style={{ opacity: 0.4 }}>{t('home.cats.title2')}</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.82rem,2vw,0.95rem)', maxWidth: '540px', lineHeight: 1.9, marginTop: '16px' }}>
              {t('home.cats.desc')}
            </p>
          </div>

          {/* Two-column layout: Dobne | Težinske */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(32px,5vw,80px)' }} className="cats-two-col">

            {/* Left: Dobne kategorije */}
            <div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.38em', color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>{t('home.cats.age')}</div>
              <div>
                {AGE_CATS.map((cat, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '7px', height: '7px', background: '#fff', flexShrink: 0, opacity: 0.75 }} />
                        <span style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1rem,2.2vw,1.3rem)', letterSpacing: '0.04em', color: '#fff' }}>{t(cat.key)}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', fontFamily: 'var(--fm)', fontWeight: 600 }}>{cat.age} {t('home.cats.years')}</span>
                    </div>
                    {i < AGE_CATS.length - 1 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Težinske kategorije */}
            <div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.38em', color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>TEŽINSKE KATEGORIJE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(16px,3vw,32px)' }}>
                {[
                  { label: t('home.cats.men'),   cats: ['-59','-66','-74','-83','-93','-105','-120','+120'] },
                  { label: t('home.cats.women'), cats: ['-47','-52','-57','-63','-69','-76','-84','+84'] },
                ].map(g => (
                  <div key={g.label}>
                    <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '12px' }}>{g.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {g.cats.map((kg, i) => (
                        <div key={kg}>
                          <div style={{ padding: '9px 0', fontSize: 'clamp(0.82rem,1.8vw,0.95rem)', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--fm)', fontWeight: 600, letterSpacing: '0.04em' }}>
                            {kg} kg
                          </div>
                          {i < g.cats.length - 1 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div style={{ marginTop: 'clamp(32px,5vw,56px)', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '4px', height: '4px', background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.52)', letterSpacing: '0.14em', fontFamily: 'var(--fm)' }}>
              {t('home.cats.note')}
            </span>
          </div>

        </div>
      </section>

      {/* ══ ABOUT CLUB ════════════════════════════════════════════ */}
      <section id="club" style={{ padding: 'clamp(80px,12vw,180px) clamp(20px,5vw,60px)', maxWidth: '1400px', margin: '0 auto' }}>
        <div ref={clubReveal.ref} style={{ opacity: clubReveal.visible ? 1 : 0, transform: clubReveal.visible ? 'none' : 'translateY(30px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="club-grid">
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3rem,8vw,6rem)', lineHeight: 0.9, marginBottom: 'clamp(20px,4vw,40px)' }}>
                {t('home.about.title1')}<br /><span style={{ color: 'rgba(255,255,255,0.3)' }}>{t('home.about.title2')}</span>
              </h2>
              <p style={{ fontSize: 'clamp(0.9rem,2.5vw,1.2rem)', lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
                {t('home.about.desc')}
              </p>
              <div className="club-info-cards">
                {([['home.about.community.title', 'home.about.community.desc'], ['home.about.expertise.title', 'home.about.expertise.desc']] as const).map(([tk, dk]) => (
                  <div key={tk} className="info-card" style={{ cursor: 'pointer', transition: '0.3s' }}>
                    <h3 style={{ color: '#fff', fontSize: 'clamp(0.95rem,2vw,1.1rem)', marginBottom: '8px', fontWeight: 700 }}>{t(tk)}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(0.8rem,1.8vw,0.9rem)' }}>{t(dk)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="club-images">
              <div style={{ height: 'clamp(200px,35vw,400px)', overflow: 'hidden', borderRadius: '4px', marginTop: 'clamp(0px,4vw,40px)', position: 'relative' }}>
                <Image src="/slike/IMG_1844.jpg" fill style={{ objectFit: 'cover', transition: '0.8s' }} alt="Club" className="club-img" sizes="40vw" />
              </div>
              <div style={{ height: 'clamp(200px,35vw,400px)', overflow: 'hidden', borderRadius: '4px', position: 'relative' }}>
                <Image src="/slike/IMG_1890.jpg" fill style={{ objectFit: 'cover', transition: '0.8s' }} alt="Club" className="club-img" sizes="40vw" />
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
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.42)', marginBottom: '14px', fontFamily: 'var(--fm)' }}>{t('home.founders.eyebrow')}</div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,6vw,5.5rem)', lineHeight: 0.88, margin: 0, letterSpacing: '-0.0em' }}>
                {t('home.founders.title')}
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 'clamp(0.8rem,2vw,0.9rem)', lineHeight: 1.8, maxWidth: '380px', marginBottom: '8px' }}>
              {t('home.founders.desc')}
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
      <section id="system" style={{ background: '#050508', padding: 'clamp(80px,12vw,150px) clamp(20px,5vw,60px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div ref={systemReveal.ref} style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'clamp(48px,8vw,88px)', opacity: systemReveal.visible ? 1 : 0, transform: systemReveal.visible ? 'none' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: '28px', height: '2px', background: 'rgba(255,255,255,0.4)' }} />
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.42em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontWeight: 700 }}>{t('home.system.eyebrow')}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,6vw,5rem)', lineHeight: 0.9 }}>{t('home.system.title')}</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{ background: '#08080f', padding: 'clamp(28px,3.5vw,44px) clamp(20px,3vw,32px)', border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', transition: '0.4s cubic-bezier(.16,1,.3,1)', position: 'relative', overflow: 'hidden', opacity: systemReveal.visible ? 1 : 0, transform: systemReveal.visible ? 'none' : 'translateY(40px)', transitionDelay: `${i * 0.08}s`, transitionDuration: '0.7s' }}>
                {/* Top border */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.18)' }} />
                {/* Number */}
                <div style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontFamily: 'var(--fd)', color: 'rgba(255,255,255,0.06)', marginBottom: '16px', lineHeight: 1, transition: 'color 0.4s' }}>{f.sym}</div>
                <h3 style={{ fontSize: 'clamp(0.82rem,1.8vw,1rem)', letterSpacing: '0.1em', marginBottom: '14px', color: '#fff', fontWeight: 700 }}>{f.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(0.78rem,1.6vw,0.85rem)', lineHeight: 1.85 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════ */}
      <section style={{ height: 'clamp(60vh,80vh,80vh)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          <Image src="/slike/IMG_1886-2.jpg" fill quality={40} style={{ objectFit: 'cover', filter: 'brightness(0.15) grayscale(1)', animation: 'slowZoom 20s ease-in-out infinite alternate' }} alt="Legacy" sizes="100vw" />
        </div>
        <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
          <h2 className="cta-glow-text" style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3rem,12vw,12rem)', lineHeight: 0.85, marginBottom: 'clamp(24px,4vw,40px)' }}>
            {t('home.cta.title')}
          </h2>
          <Link href="/survey" style={{ textDecoration: 'none' }}>
            <button className="btn-cta-final" style={{ padding: 'clamp(16px,2.5vw,25px) clamp(32px,6vw,80px)', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.6)', fontSize: 'clamp(0.75rem,2.5vw,1rem)', fontWeight: 900, letterSpacing: '0.3em', cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'var(--fm)', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <span style={{ position: 'relative', zIndex: 2 }}>{t('home.cta.btn')}</span>
            </button>
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        /* ══ HERO OUTLINED TEXT ══════════════════════════════════ */
        .hero-outline {
          color: transparent;
          -webkit-text-stroke: 2px #fff;
          text-stroke: 2px #fff;
        }

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
          will-change: filter;
          animation: textGlow 3s ease-in-out infinite;
        }

        /* ══ HOVER OSTALO ═════════════════════════════════════════ */
        .info-card:hover h4 { color: rgba(255,255,255,0.7) !important; }
        .founder-img:hover  { transform: scale(1.04) !important; }
        .club-img:hover     { transform: scale(1.05) !important; }
        .feature-card:hover { transform: translateY(-5px) !important; border-color: rgba(255,255,255,0.14) !important; box-shadow: 0 8px 32px rgba(255,255,255,0.04); }
        .feature-card:hover > div:first-child { opacity: 1 !important; }
        .feature-card:hover > div:nth-child(2) { color: rgba(255,255,255,0.14) !important; }

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
        .features-grid    { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(12px,2vw,24px); }

        /* ══ KEYFRAMES ════════════════════════════════════════════ */
        @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.08); } }
        @keyframes textGlow {
          0%,100% { filter: drop-shadow(0 0 40px rgba(255,255,255,0.08)); }
          50%      { filter: drop-shadow(0 0 60px rgba(255,255,255,0.2)) drop-shadow(0 0 120px rgba(255,255,255,0.1)); }
        }

        /* ══ MOBILE ═══════════════════════════════════════════════ */
        @media (max-width: 768px) {
          .hero-content    { align-items: center !important; text-align: center; padding-bottom: 120px !important; }
          .hero-content h1 { font-size: clamp(3.2rem,12vw,5rem) !important; margin-bottom: 20px !important; }
          .hero-content p  { font-size: 0.9rem !important; margin-bottom: 24px !important; }
          .hero-btns       { justify-content: center; flex-direction: column !important; gap: 10px !important; }
          .hero-btns a     { flex: unset !important; width: 100% !important; }
          .cats-two-col    { grid-template-columns: 1fr !important; }
          .founder-row { grid-template-columns: 1fr !important; min-height: unset; }
          .founder-row-reverse .founder-img-wrap { order: 1; }
          .founder-row-reverse .founder-text-wrap { order: 2; }
          .founder-img-wrap { min-height: 280px; }
          .founder-text-wrap { border-left: none !important; border-right: none !important; border-top: 1px solid rgba(255,255,255,0.07); }
          .club-grid       { grid-template-columns: 1fr !important; gap: 24px !important; }
          .club-images     { grid-template-columns: 1fr 1fr !important; }
          .club-images > div { height: 140px !important; margin-top: 0 !important; }
          .club-info-cards { grid-template-columns: 1fr !important; }
          .features-grid   { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .stats-grid      { grid-template-columns: 1fr 1fr !important; }
          .stats-grid > div:nth-child(2) { border-right: none !important; }
          .stats-grid > div:nth-child(3) { border-top: 1px solid rgba(255,255,255,0.1); }
          .stats-grid > div:nth-child(4) { border-top: 1px solid rgba(255,255,255,0.1); border-right: none !important; }
        }
        @media (max-width: 480px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .hero-content { padding: 0 16px 120px !important; padding-top: clamp(80px,14vh,120px) !important; }
        }
      `}</style>
    </div>
  )
}