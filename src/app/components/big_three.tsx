'use client'
import { useState, useRef, useEffect } from 'react'

const LIFT_DETAILS = {
  SQUAT: {
    img: '/slike/squat.jpg',
    orientation: 'portrait' as const,
    meta: {
      num: '01',
      sub: 'Temelj snage donjih ekstremiteta',
      muscles: 'Kvadricepsi · Gluteus · Hamstringsi',
      cue: 'Chest up. Knees out. Drive.',
    },
    points: [
      { top: '33%', left: '50%', label: 'POLOŽAJ ŠIPKE', desc: 'High bar — šipka leži na gornjem trapezu. Uspravniji torzo, duži ROM. Low bar — stražnji deltoid, manji ROM, više aktivacije posterior chaina.' },
      { top: '46%', left: '45%', label: 'BRACE & BELT', desc: 'Maksimalni intraabdominalni tlak kroz cijeli pokret. Belt nije zamjena za aktivan brace, on ga pojačava.' },
      { top: '62%', left: '44%', label: 'DUBINA & KOLJENA', desc: 'Kuk mora proći ispod vrha koljena za "good lift" prema IPF pravilima. Koljena prate smjer prstiju.' },
      { top: '76%', left: '48%', label: 'STOPALA', desc: 'Tripod foot — ravnomjerna težina kroz petu, vanjski rub i prednji dio stopala. Peta se ne smije podizati.' },
    ],
  },
  'BENCH PRESS': {
    img: '/slike/bench.jpg',
    orientation: 'landscape' as const,
    meta: {
      num: '02',
      sub: 'Horizontalni potisak s klupe',
      muscles: 'Pectoralis · Triceps · Prednji deltoid',
      cue: 'Arch. Leg drive. Stay tight.',
    },
    points: [
      { top: '26%', left: '42%', label: 'HVAT & ŠIPKA', desc: 'Širina hvata određuje kut lakta. Šipka se spušta na donji dio prsa. Zapešća ravna, ne savinuta.' },
      { top: '60%', left: '30%', label: 'LEĐA I GLAVA', desc: 'Lopatice povučene i spuštene (retraction & depression), glava na klupi tijekom cijelog pokreta - stabilna baza za potisak.' },
      { top: '50%', left: '47%', label: 'ARCH', desc: 'Luk u donjem dijelu leđa omogućava leg drive. Što je veći luk, kraći je put šipke.' },
      { top: '60%', left: '53%', label: 'GLUTEUS NA KLUPI', desc: 'Stražnjica mora ostati na klupi cijelo vrijeme — kritično za IPF pravila i prijenos sile iz nogu.' },
      { top: '80%', left: '67%', label: 'LEG DRIVE', desc: 'Stopala ravno u pod — aktivno guranje stvara lanac napetosti kroz cijelo tijelo i stabilizira lift.' },
    ],
  },
  DEADLIFT: {
    img: '/slike/deadlift.jpg',
    orientation: 'portrait' as const,
    meta: {
      num: '03',
      sub: 'Kralj lifta — totalni razvoj snage',
      muscles: 'Hamstringsi · Gluteus · Erektori · Trapezius',
      cue: 'Push floor away. Bar stays close.',
    },
    points: [
      { top: '34%', left: '30%', label: 'LOCKOUT', desc: 'Puna ekstenzija kuka i koljena. Ramena iza šipke, ne hiperekstenzija. Brada neutralno, pogled ravno.' },
      { top: '45%', left: '44%', label: 'BRACE & BELT', desc: 'Maksimalni intraabdominalni tlak od početka do kraja lifta. Belt pojačava, ali ne zamjenjuje brace.' },
      { top: '57%', left: '58%', label: 'HVAT', desc: 'Mixed grip ili hook grip za maksimalni hvat. Šipka se drži u u dlanu, ne u prstima. Šipka se samo pridržava, ne stišće se' },
      { top: '60%', left: '34%', label: 'ŠIPKA UZ TIJELO', desc: 'Šipka klizi uz potkoljenice i natkoljenice cijelim pokretom. Odmak od tijela = gubitak poluge i rizik ozljede.' },
      { top: '75%', left: '56%', label: 'STANCE', desc: 'Conventional — uži stance, ruke izvan nogu. Sumo — širi stance, ruke između nogu. Odabir ovisi o anatomiji, tehnici i dominantnijim mišićnim skupinama.' },
    ],
  },
} as const

type LiftKey = keyof typeof LIFT_DETAILS

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Shared: close button ───────────────────────────────────────────
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', padding: '6px 16px', cursor: 'pointer', fontSize: '0.58rem', letterSpacing: '0.2em', transition: '0.2s', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#fff' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
    >✕ ZATVORI</button>
  )
}

// ── Shared: points list ────────────────────────────────────────────
function PointsList({ lift, hoveredHotspot, setHoveredHotspot }: {
  lift: LiftKey
  hoveredHotspot: number | null
  setHoveredHotspot: (i: number | null) => void
}) {
  const points = LIFT_DETAILS[lift].points
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {points.map((p, i) => (
        <div
          key={i}
          onMouseEnter={() => setHoveredHotspot(i)}
          onMouseLeave={() => setHoveredHotspot(null)}
          style={{
            padding: '18px 28px', transition: 'all 0.2s', cursor: 'default',
            borderBottom: i < points.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            background: hoveredHotspot === i ? 'rgba(255,255,255,0.04)' : 'transparent',
            opacity: hoveredHotspot === null || hoveredHotspot === i ? 1 : 0.3,
            display: 'flex', gap: '14px', alignItems: 'flex-start',
          }}
        >
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, marginTop: '2px', background: hoveredHotspot === i ? '#fff' : 'transparent', border: `1px solid ${hoveredHotspot === i ? '#fff' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: hoveredHotspot === i ? '#000' : 'rgba(255,255,255,0.35)', transition: 'all 0.2s' }}>
            {i + 1}
          </div>
          <div>
            <div style={{ fontSize: '0.63rem', letterSpacing: '0.22em', fontWeight: 700, color: hoveredHotspot === i ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: '6px', transition: 'color 0.2s', fontFamily: 'var(--fm)' }}>
              {p.label}
            </div>
            <p style={{ fontSize: '0.75rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.38)', margin: 0, fontWeight: 300 }}>
              {p.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Lift name tag (consistent across both modal types) ─────────────
function LiftNameTag({ lift }: { lift: LiftKey }) {
  return (
    <div style={{ zIndex: 4 }}>
      <div style={{ fontSize: '0.55rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>
        TEHNIČKA ANALIZA
      </div>
      <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.6rem,4vw,4rem)', fontWeight: 800, lineHeight: 0.88, letterSpacing: '-0.02em', textShadow: '0 4px 32px rgba(0,0,0,0.8)', color: '#fff' }}>
        {lift}
      </div>
    </div>
  )
}

// ── PORTRAIT modal (Squat / Deadlift) — image left, list right ────
function PortraitModal({ lift, hoveredHotspot, setHoveredHotspot, onClose }: {
  lift: LiftKey
  hoveredHotspot: number | null
  setHoveredHotspot: (i: number | null) => void
  onClose: () => void
}) {
  return (
    <div
      style={{ width: '100%', maxWidth: '1000px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden', boxShadow: '0 60px 120px rgba(0,0,0,0.8)', animation: 'slideUp 0.45s cubic-bezier(0.16,1,0.3,1)', maxHeight: '90vh' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Left: image */}
      <div className="modal-img-side" style={{ position: 'relative', background: '#000', overflowY: 'auto' }}>
        <img
          src={LIFT_DETAILS[lift].img}
          style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.85 }}
          alt={lift}
        />
        {/* Gradients */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.92) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 65%, #0a0a0a 100%)' }} />

        {/* Hotspots */}
        {LIFT_DETAILS[lift].points.map((p, i) => (
          <div
            key={i}
            style={{ position: 'absolute', top: p.top, left: p.left, transform: 'translate(-50%, -50%)', zIndex: 3 }}
            onMouseEnter={() => setHoveredHotspot(i)}
            onMouseLeave={() => setHoveredHotspot(null)}
          >
            <div className="hotspot" style={{ transform: hoveredHotspot === i ? 'scale(1.3)' : 'scale(1)', transition: '0.3s' }}>
              <div className="hotspot-core" />
              <div className="hotspot-ring" />
              <div className="hotspot-label" style={{ opacity: hoveredHotspot === i ? 1 : 0, transform: hoveredHotspot === i ? 'translate(-50%, 8px)' : 'translate(-50%, 0)' }}>
                {p.label}
              </div>
            </div>
          </div>
        ))}

        {/* Lift name bottom-left */}
        <div style={{ position: 'absolute', bottom: '32px', left: '36px', zIndex: 4 }}>
          <LiftNameTag lift={lift} />
        </div>
      </div>

      {/* Right: points list */}
      <div className="modal-text-side" style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.07)', height: '90vh' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>KLJUČNE TOČKE</div>
          <CloseBtn onClick={onClose} />
        </div>
        <PointsList lift={lift} hoveredHotspot={hoveredHotspot} setHoveredHotspot={setHoveredHotspot} />
      </div>
    </div>
  )
}

// ── LANDSCAPE modal (Bench Press) — image top, list bottom ────────
function LandscapeModal({ lift, hoveredHotspot, setHoveredHotspot, onClose }: {
  lift: LiftKey
  hoveredHotspot: number | null
  setHoveredHotspot: (i: number | null) => void
  onClose: () => void
}) {
  return (
    <div
      style={{ width: '100%', maxWidth: '900px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 60px 120px rgba(0,0,0,0.8)', animation: 'slideUp 0.45s cubic-bezier(0.16,1,0.3,1)', maxHeight: '90vh' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Top: image */}
      <div style={{ position: 'relative', background: '#000', flexShrink: 0 }}>
        <img
          src={LIFT_DETAILS[lift].img}
          style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.85 }}
          alt={lift}
        />
        {/* Gradients */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.88) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.15) 100%)' }} />

        {/* Hotspots */}
        {LIFT_DETAILS[lift].points.map((p, i) => (
          <div
            key={i}
            style={{ position: 'absolute', top: p.top, left: p.left, transform: 'translate(-50%, -50%)', zIndex: 3 }}
            onMouseEnter={() => setHoveredHotspot(i)}
            onMouseLeave={() => setHoveredHotspot(null)}
          >
            <div className="hotspot" style={{ transform: hoveredHotspot === i ? 'scale(1.3)' : 'scale(1)', transition: '0.3s' }}>
              <div className="hotspot-core" />
              <div className="hotspot-ring" />
              <div className="hotspot-label" style={{ opacity: hoveredHotspot === i ? 1 : 0, transform: hoveredHotspot === i ? 'translate(-50%, 8px)' : 'translate(-50%, 0)' }}>
                {p.label}
              </div>
            </div>
          </div>
        ))}

        {/* Lift name + close — bottom bar over image */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <LiftNameTag lift={lift} />
          <CloseBtn onClick={onClose} />
        </div>
      </div>

      {/* Bottom: points list — scrollable horizontal row */}
      <div style={{ overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {LIFT_DETAILS[lift].points.map((p, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredHotspot(i)}
              onMouseLeave={() => setHoveredHotspot(null)}
              style={{
                padding: '20px 20px', transition: 'all 0.2s', cursor: 'default',
                borderRight: i < LIFT_DETAILS[lift].points.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: hoveredHotspot === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                opacity: hoveredHotspot === null || hoveredHotspot === i ? 1 : 0.3,
              }}
            >
              {/* Number */}
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: hoveredHotspot === i ? '#fff' : 'transparent', border: `1px solid ${hoveredHotspot === i ? '#fff' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.52rem', fontWeight: 800, color: hoveredHotspot === i ? '#000' : 'rgba(255,255,255,0.35)', transition: 'all 0.2s', marginBottom: '12px' }}>
                {i + 1}
              </div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', fontWeight: 700, color: hoveredHotspot === i ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: '8px', transition: 'color 0.2s', fontFamily: 'var(--fm)', lineHeight: 1.3 }}>
                {p.label}
              </div>
              <p style={{ fontSize: '0.72rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.35)', margin: 0, fontWeight: 300 }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BigThree() {
  const [activeLift, setActiveLift] = useState<LiftKey | null>(null)
  const [hoveredHotspot, setHoveredHotspot] = useState<number | null>(null)
  const { ref, visible } = useReveal()

  const close = () => { setActiveLift(null); setHoveredHotspot(null) }

  return (
    <>
      {/* ══ SECTION ════════════════════════════════════════════════ */}
      <section id="info" style={{ padding: '150px 0 120px', background: '#080808', overflow: 'hidden' }}>
        <div
          ref={ref}
          style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 60px', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(40px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* ── Powerlifting opis ──────────────────────────────── */}
          <div style={{ marginTop: '80px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '72px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.5em', color: 'rgba(255, 255, 255, 0.49)', marginBottom: '20px', fontFamily: 'var(--fm)' }}>ŠTO JE POWERLIFTING?</div>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2rem,3.5vw,3.2rem)', fontWeight: 800, lineHeight: 0.9, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
                SPORT<br /><span style={{ color: 'rgba(255,255,255,0.22)' }}>APSOLUTNE SNAGE</span>
              </h3>
              <p style={{ fontSize: '1.15rem', lineHeight: 1.85, color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 300 }}>
                Powerlifting je sport u kojemu se natjecatelji bore za što veći ukupni  <em style={{ color: 'rgba(255,255,255,0.75)', fontStyle: 'normal' }}>total.</em> To je zbroj tri discipline: čučanj, bench press i mrtvo dizanje. Svaki natjecatelj ima tri pokušaja po liftu, a pobjeđuje onaj koji podigne najveću ukupnu težinu u svojoj kategoriji, tvz. total. Kako bi se pokušaj smatrao "good liftom", natjecatelj mora zadovljiti minimalno 2 od 3 sudca i tako postići barem 2 "white lighta". U suprotnom, pokušaj je "no lift", bez obzira na to koliko je težak bio.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { num: '01', title: 'PRIJE SVEGA, TEHNIKA', desc: 'Svaki lift mora biti izveden prema strogim IPF pravilima — dubina čučnja, pauza na klupi, lockout u mrtvom, itd.' },
                { num: '02', title: 'KATEGORIJE PO TEŽINI', desc: 'Natjecatelji se dijele prema tjelesnoj težini i spolu, s posebnim kategorijama za mlade, seniore i veterane.' },
                { num: '03', title: 'TOTAL KAO MJERA', desc: 'Jedan loš lift može srušiti cijelo natjecanje. Strategija odabira kilaže jednako je bitna kao i sama snaga.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '20px', padding: '20px 0', borderBottom: i < 2 ? '1px solid rgba(255, 255, 255, 0.45)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'rgba(255, 255, 255, 0.47)', fontFamily: 'var(--fd)', fontWeight: 800, paddingTop: '3px', flexShrink: 0 }}>{item.num}</div>
                  <div>
                    <div style={{ fontSize: '0.68rem', letterSpacing: '0.25em', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '6px', fontFamily: 'var(--fm)' }}>{item.title}</div>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 300 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />

          {/* Header */}
          <div className="big-three-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '72px' }}>
            <div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.2)', marginBottom: '16px', fontFamily: 'var(--fm)' }}>DISCIPLINA / TEHNIKA</div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3.5rem,6vw,6rem)', lineHeight: 0.88, margin: 0 }}>
                SBD<br /><span style={{ color: 'rgba(255,255,255,0.18)' }}>LIFTS</span>
              </h2>
            </div>
            <p style={{ maxWidth: '320px', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', lineHeight: 1.8, textAlign: 'right' }}>
              Kliknite na disciplinu za dubinsku tehničku analizu i biomehaničke ključne točke.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {(Object.keys(LIFT_DETAILS) as LiftKey[]).map((lift, idx) => {
              const { meta } = LIFT_DETAILS[lift]
              return (
                <div
                  key={lift}
                  onClick={() => setActiveLift(lift)}
                  className="bt-card"
                  style={{ display: 'grid', gridTemplateColumns: '80px 1fr 340px', alignItems: 'stretch', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', overflow: 'hidden', animationDelay: `${idx * 0.12}s` }}
                >
                  <div className="bt-num-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '48px 0' }}>
                    <span className="bt-num" style={{ fontFamily: 'var(--fd)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.15)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{meta.num}</span>
                  </div>
                  <div style={{ padding: '48px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
                    <div>
                      <div style={{ fontSize: '0.58rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', marginBottom: '12px', fontFamily: 'var(--fm)', textTransform: 'uppercase' }}>{meta.sub}</div>
                      <div className="bt-lift-name" style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.8rem,4vw,4.5rem)', fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.02em', color: '#fff' }}>{lift}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', fontFamily: 'var(--fm)' }}>{meta.muscles}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.1em', fontStyle: 'italic', fontFamily: 'var(--fm)' }}>"{meta.cue}"</span>
                      </div>
                    </div>
                    <div className="bt-explore" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px' }}>
                      <div className="bt-explore-line" style={{ height: '1px', background: '#fff' }} />
                      <span style={{ fontSize: '0.65rem', letterSpacing: '0.35em', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>ISTRAŽI TEHNIKU</span>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>→</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <img src={LIFT_DETAILS[lift].img} alt={lift} className="bt-img" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: lift === 'BENCH PRESS' ? 'center 30%' : 'center top', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #0a0a0a 0%, rgba(10,10,10,0.15) 40%, transparent 100%)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
                    <div style={{ position: 'absolute', bottom: '24px', right: '24px', fontFamily: 'var(--fd)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>{lift}</div>
                  </div>
                </div>
              )
            })}
          </div>

          

        </div>
      </section>

      {/* ══ MODAL ══════════════════════════════════════════════════ */}
      {activeLift && (
        <div
          className="modal-outer"
          style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(20px)', animation: 'fadeIn 0.25s ease' }}
          onClick={close}
        >
          {LIFT_DETAILS[activeLift].orientation === 'portrait' ? (
            <PortraitModal
              lift={activeLift}
              hoveredHotspot={hoveredHotspot}
              setHoveredHotspot={setHoveredHotspot}
              onClose={close}
            />
          ) : (
            <LandscapeModal
              lift={activeLift}
              hoveredHotspot={hoveredHotspot}
              setHoveredHotspot={setHoveredHotspot}
              onClose={close}
            />
          )}
        </div>
      )}
    </>
  )
}