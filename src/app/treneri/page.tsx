'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Instagram } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { COACHES, COACHES_PAGE, SCREENS, type Lang } from '@/lib/coaching'

const supabase = createClient()

/**
 * Element se "otkrije" kad prvi put uđe u ekran. Skrivanje se uključuje tek u
 * pregledniku (armed), pa bez JavaScripta sadržaj ostaje vidljiv.
 */
function useReveal<T extends Element>() {
  const ref = useRef<T>(null)
  const [armed, setArmed] = useState(false)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return }
    setArmed(true)
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect() }
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, cls: armed ? (shown ? ' rv rv-in' : ' rv') : '' }
}

/** Screenshot kao prozor aplikacije u perspektivi. Bez datoteke: uredan prazan okvir. */
function ShotRow({ file, w, h, title, desc, index, soon }: {
  file: string; w: number; h: number; title: string; desc: string; index: number; soon: string
}) {
  const { ref, cls } = useReveal<HTMLDivElement>()
  const [missing, setMissing] = useState(false)
  return (
    <div ref={ref} className={`tr-row${index % 2 ? ' tr-row-flip' : ''}${cls}`}>
      <div className="tr-stage">
        <div className="tr-window">
          <div className="tr-chrome" aria-hidden><i /><i /><i /></div>
          {missing ? (
            <div className="tr-shot-empty"><span>{soon}</span></div>
          ) : (
            <Image src={`/slike/aplikacija/${file}`} alt={title} width={w} height={h} quality={75}
              sizes="(max-width: 860px) calc(100vw - 48px), 760px"
              className="tr-shot" onError={() => setMissing(true)} />
          )}
        </div>
      </div>
      <div className="tr-row-text">
        <div className="tr-num">{String(index + 1).padStart(2, '0')}</div>
        <h3 className="tr-row-title">{title}</h3>
        <p className="tr-row-desc">{desc}</p>
      </div>
    </div>
  )
}

/**
 * Svaka kartica se otkriva zasebno. Cijela mreža u jednom stupcu (mobitel) je
 * visoka par tisuća px, pa joj se prag od 18 % ne dosegne i kartice ostanu skrivene.
 */
function CoachCard({ coach, index, L, instagram }: {
  coach: (typeof COACHES)[number]; index: number; L: Lang; instagram?: string
}) {
  const { ref, cls } = useReveal<HTMLElement>()
  return (
    <article ref={ref} className={`tr-coach${cls}`} style={{ '--d': `${(index % 3) * 90}ms` } as CSSProperties}>
      <div className="tr-coach-photo">
        <Image src={coach.photo} alt={coach.name} fill sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 440px" quality={65} style={{ objectFit: 'cover' }} />
      </div>
      <div className="tr-coach-body">
        <div className="tr-coach-role">{coach.role[L]}</div>
        <h3 className="tr-coach-name">{coach.name}</h3>
        <p className="tr-coach-bio">{coach.bio[L]}</p>
        {instagram && (
          <a href={instagram} target="_blank" rel="noopener noreferrer" className="tr-coach-ig" aria-label={`${coach.name} na Instagramu`}>
            <Instagram size={14} /> INSTAGRAM
          </a>
        )}
      </div>
    </article>
  )
}

export default function TreneriPage() {
  const { lang } = useLanguage()
  const L: Lang = lang === 'en' ? 'en' : 'hr'
  const c = COACHES_PAGE[L]

  // Instagram iz iste tablice koja puni stranicu Tim — kad se upiše tamo, pojavi se i ovdje
  const [instagram, setInstagram] = useState<Record<string, string>>({})
  useEffect(() => {
    supabase.from('lwlup_members').select('name, instagram').in('name', COACHES.map(x => x.name))
      .then(({ data, error }) => {
        if (error) { console.error('treneri: lwlup_members', error); return }
        setInstagram(Object.fromEntries(((data ?? []) as { name: string; instagram: string | null }[])
          .filter(m => m.instagram).map(m => [m.name, m.instagram as string])))
      })
  }, [])

  return (
    <div style={{ background: '#131317', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>
      <div className="star-field" />
      <Navbar variant="solid" />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="tr-wrap" style={{ paddingTop: 'clamp(140px,18vw,190px)', paddingBottom: 'clamp(56px,8vw,96px)', position: 'relative' }}>
        <div aria-hidden style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '900px', maxWidth: '100%', height: '480px', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '760px' }}>
          <div className="section-eyebrow"><span>{c.eyebrow}</span></div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3.5rem, 11vw, 8rem)', lineHeight: 1.02, margin: '0 0 24px' }}>{c.title}</h1>
          <p style={{ fontSize: 'clamp(0.95rem,1.8vw,1.08rem)', color: 'rgba(255,255,255,0.65)', maxWidth: '560px', margin: 0, lineHeight: 1.85 }}>{c.desc}</p>
        </div>
      </section>

      {/* ── SUSTAV: screenshotovi ───────────────────────────────── */}
      <section className="tr-wrap" style={{ paddingBottom: 'clamp(80px,11vw,150px)' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.09)', paddingTop: 'clamp(56px,8vw,96px)', marginBottom: 'clamp(48px,7vw,88px)' }}>
          <div className="section-eyebrow"><span>{c.appEyebrow}</span></div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.4rem,6vw,4.6rem)', lineHeight: 1.02, margin: '0 0 16px' }}>{c.appTitle}</h2>
          <p style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: '520px', lineHeight: 1.8 }}>{c.appDesc}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(72px,11vw,150px)' }}>
          {SCREENS.map((s, i) => (
            <ShotRow key={s.file} file={s.file} w={s.w} h={s.h} index={i}
              title={s.text[L].title} desc={s.text[L].desc} soon={c.shotSoon} />
          ))}
        </div>
      </section>

      {/* ── TRENERI ──────────────────────────────────────────── */}
      <section style={{ background: '#1a1a20', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="tr-wrap tr-wrap-wide" style={{ paddingTop: 'clamp(72px,10vw,130px)', paddingBottom: 'clamp(72px,10vw,130px)' }}>
          <div className="section-eyebrow"><span>{c.teamEyebrow}</span></div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.4rem,6vw,4.6rem)', lineHeight: 1.02, margin: '0 0 clamp(40px,6vw,64px)' }}>{c.teamTitle}</h2>

          <div className="tr-coaches">
            {COACHES.map((coach, i) => (
              <CoachCard key={coach.name} coach={coach} index={i} L={L} instagram={instagram[coach.name]} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="tr-wrap" style={{ paddingTop: 'clamp(80px,11vw,140px)', paddingBottom: 'clamp(80px,11vw,140px)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.6rem,7vw,5rem)', lineHeight: 1.02, margin: '0 0 16px' }}>{c.ctaTitle}</h2>
        <p style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.6)', margin: '0 auto 36px', maxWidth: '460px', lineHeight: 1.8 }}>{c.ctaDesc}</p>
        <Link href="/survey" className="tr-cta">{c.ctaBtn} <ArrowRight size={14} /></Link>
      </section>

      <Footer />

      <style>{`
        .tr-wrap { max-width: 1280px; margin: 0 auto; padding-left: clamp(20px,5vw,60px); padding-right: clamp(20px,5vw,60px); box-sizing: border-box; position: relative; }
        .tr-wrap-wide { max-width: 1400px; }

        /* ── screenshot kao prozor aplikacije u perspektivi ── */
        .tr-row { --ry: -13deg; --rx: 5deg; display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); gap: clamp(36px, 6vw, 96px); align-items: center; }
        .tr-row-flip { --ry: 13deg; grid-template-columns: minmax(0, 1fr) minmax(0, 1.65fr); }
        .tr-row-flip .tr-stage { order: 2; }
        .tr-stage { perspective: 1700px; position: relative; }
        .tr-stage::before { content: ''; position: absolute; inset: 8% 4%; background: radial-gradient(ellipse at center, rgba(255,255,255,0.09) 0%, transparent 70%); filter: blur(10px); pointer-events: none; }
        .tr-window {
          position: relative; border-radius: 12px; overflow: hidden; background: #0d0d10;
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 50px 90px -30px rgba(0,0,0,0.85), 0 20px 40px -20px rgba(0,0,0,0.6);
          transform: rotateY(var(--ry)) rotateX(var(--rx));
          transition: transform 0.9s cubic-bezier(.2,.7,.2,1), opacity 0.6s ease;
        }
        .tr-window:hover { transform: rotateY(calc(var(--ry) * 0.25)) rotateX(1deg); }
        .tr-chrome { display: flex; gap: 6px; padding: 10px 12px; background: #1b1b21; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .tr-chrome i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,0.16); }
        .tr-shot { display: block; width: 100%; height: auto; }
        .tr-shot-empty { aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center; }
        .tr-shot-empty span { font-size: 0.58rem; letter-spacing: 0.3em; font-weight: 700; color: rgba(255,255,255,0.5); }

        .tr-num { font-family: var(--fd); font-size: clamp(2.6rem, 5vw, 3.6rem); line-height: 1; color: rgba(255,255,255,0.14); margin-bottom: 18px; }
        .tr-row-title { font-family: var(--fd); font-size: clamp(1.7rem, 3vw, 2.3rem); font-weight: 700; margin: 0 0 14px; }
        .tr-row-desc { font-size: clamp(0.92rem, 1.6vw, 1rem); color: rgba(255,255,255,0.65); line-height: 1.85; margin: 0; max-width: 400px; }

        /* otkrivanje: prozor se zakrene na mjesto, tekst dođe sa strane */
        .tr-row.rv .tr-window { opacity: 0; transform: rotateY(calc(var(--ry) * 2.4)) rotateX(12deg) translateY(36px); }
        .tr-row.rv .tr-row-text { opacity: 0; transform: translateX(18px); transition: opacity 0.6s ease 0.2s, transform 0.7s cubic-bezier(.2,.7,.2,1) 0.2s; }
        .tr-row-flip.rv .tr-row-text { transform: translateX(-18px); }
        .tr-row.rv-in .tr-window { opacity: 1; transform: rotateY(var(--ry)) rotateX(var(--rx)); }
        .tr-row.rv-in .tr-window:hover { transform: rotateY(calc(var(--ry) * 0.25)) rotateX(1deg); }
        .tr-row.rv-in .tr-row-text { opacity: 1; transform: none; }

        /* ── treneri ── */
        /* Mobitel prvo: jedan stupac. Šire mreže idu samo u min-width blokove — pravila
           za centriranje zadnjeg reda imaju veću specifičnost, pa bi inače procurila
           na mobitel i napravila implicitni drugi stupac (kartice izlaze iz ekrana).
           Pravila po broju kartica (:nth-last-child), pa raspored drži i kad se trener doda/makne. */
        .tr-coaches { display: grid; grid-template-columns: minmax(0, 1fr); gap: clamp(16px, 2vw, 28px); }
        .tr-coach { background: #131317; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; min-width: 0; transition: border-color 0.3s, transform 0.5s cubic-bezier(.2,.7,.2,1), opacity 0.5s ease; }
        .tr-coach:hover { border-color: rgba(255,255,255,0.24); }
        .tr-coach.rv { opacity: 0; transform: translateY(28px); }
        .tr-coach.rv-in { opacity: 1; transform: none; }
        .tr-coach-photo { position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: #0d0d10; }
        .tr-coach-photo img { filter: grayscale(0.5) brightness(0.88); transition: filter 0.5s, transform 0.7s cubic-bezier(.2,.7,.2,1); }
        .tr-coach:hover .tr-coach-photo img { filter: grayscale(0) brightness(1); transform: scale(1.04); }
        .tr-coach-body { padding: 26px 24px 28px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .tr-coach-role { font-size: 0.58rem; letter-spacing: 0.28em; font-weight: 700; color: rgba(255,255,255,0.55); text-transform: uppercase; }
        .tr-coach-name { font-family: var(--fd); font-size: clamp(1.6rem, 2.2vw, 1.95rem); font-weight: 700; margin: 0; line-height: 1.05; }
        .tr-coach-bio { margin: 2px 0 0; font-size: 0.92rem; line-height: 1.75; color: rgba(255,255,255,0.65); }
        .tr-coach-ig { margin-top: auto; padding-top: 14px; display: inline-flex; align-items: center; gap: 8px; font-size: 0.58rem; letter-spacing: 0.22em; font-weight: 700; color: rgba(255,255,255,0.6); text-decoration: none; width: fit-content; transition: color 0.2s; }
        .tr-coach-ig:hover { color: #fff; }

        .tr-cta { display: inline-flex; align-items: center; gap: 10px; padding: 16px 34px; background: #fff; color: #000; text-decoration: none; font-size: 0.74rem; letter-spacing: 0.2em; font-weight: 800; transition: transform 0.25s, box-shadow 0.25s; }
        .tr-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,255,255,0.18); }

        /* 2 + 2 + 1: mreža od 4 stupca, svaka kartica zauzima 2; zadnja sama centrirana */
        @media (min-width: 561px) {
          .tr-coaches { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .tr-coach { grid-column: span 2; }
          .tr-coach:nth-child(odd):last-child { grid-column: 2 / span 2; }
        }
        /* 3 + 2: mreža od 6 stupaca; drugi red centriran, kartice u redu ulaze jedna za drugom */
        @media (min-width: 1101px) {
          .tr-coaches { grid-template-columns: repeat(6, minmax(0, 1fr)); }
          .tr-coach:nth-child(odd):last-child { grid-column: span 2; }
          .tr-coach:nth-child(3n+1):nth-last-child(2) { grid-column: 2 / span 2; }
          .tr-coach:nth-child(3n+1):last-child { grid-column: 3 / span 2; }
          .tr-coach { transition-delay: var(--d, 0ms); }
        }
        @media (max-width: 860px) {
          .tr-row, .tr-row-flip { --ry: -6deg; --rx: 3deg; grid-template-columns: 1fr; gap: 28px; }
          .tr-row-flip .tr-stage { order: 0; }
          .tr-row.rv .tr-row-text, .tr-row-flip.rv .tr-row-text { transform: translateY(14px); }
        }
        /* puna širina: kvadratna slika umjesto 4:5, da kartica ne bude visoka cijeli ekran */
        @media (max-width: 560px) {
          .tr-coach-photo { aspect-ratio: 1 / 1; }
          .tr-coach-photo img { object-position: 50% 30%; }
          .tr-coach-body { padding: 22px 20px 24px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tr-row.rv .tr-window, .tr-row.rv .tr-row-text, .tr-coach.rv { opacity: 1 !important; transform: none !important; transition: none !important; }
          .tr-window, .tr-window:hover { transform: none !important; }
        }
      `}</style>
    </div>
  )
}
