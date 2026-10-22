'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Instagram } from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { COACHES, COACHES_PAGE, SCREENS, type Lang } from '@/lib/coaching'

const supabase = createClient()

type Member = {
  name: string; nickname: string | null; category: string | null
  squat: string | null; bench: string | null; deadlift: string | null
  total: string | null; glp: string | null; instagram: string | null; highlights: string[] | null
}

const kg = (v: string | null) => (v != null && Number(v) > 0 ? String(Math.round(Number(v) * 10) / 10) : null)

/**
 * Screenshot iz public/slike/aplikacija/. Ide kroz next/image, pa preglednik
 * dobije WebP/AVIF u veličini koja mu treba. Ako datoteke nema, uredan okvir
 * umjesto slomljene slike.
 */
function Shot({ file, w, h, alt, soon }: { file: string; w: number; h: number; alt: string; soon: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) {
    return (
      <div className="tr-shot-empty" role="img" aria-label={alt}>
        <span>{soon}</span>
      </div>
    )
  }
  return (
    <Image src={`/slike/aplikacija/${file}`} alt={alt} width={w} height={h} quality={75}
      sizes="(max-width: 820px) calc(100vw - 80px), 620px"
      className="tr-shot" onError={() => setMissing(true)} />
  )
}

export default function TreneriPage() {
  const { lang } = useLanguage()
  const L: Lang = lang === 'en' ? 'en' : 'hr'
  const c = COACHES_PAGE[L]

  // Brojke trenera iz iste tablice koja puni stranicu Tim — ništa se ne prepisuje ručno
  const [members, setMembers] = useState<Record<string, Member>>({})
  useEffect(() => {
    supabase.from('lwlup_members')
      .select('name, nickname, category, squat, bench, deadlift, total, glp, instagram, highlights')
      .in('name', COACHES.map(x => x.name))
      .then(({ data, error }) => {
        if (error) { console.error('treneri: lwlup_members', error); return }
        setMembers(Object.fromEntries(((data ?? []) as Member[]).map(m => [m.name, m])))
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
          <p style={{ fontSize: 'clamp(0.95rem,1.8vw,1.08rem)', color: 'rgba(255,255,255,0.65)', maxWidth: '580px', margin: 0, lineHeight: 1.85 }}>{c.desc}</p>
        </div>
      </section>

      {/* ── APLIKACIJA: screenshotovi s opisima ───────────────── */}
      <section className="tr-wrap" style={{ paddingBottom: 'clamp(72px,10vw,140px)' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.09)', paddingTop: 'clamp(56px,8vw,96px)', marginBottom: 'clamp(40px,6vw,72px)' }}>
          <div className="section-eyebrow"><span>{c.appEyebrow}</span></div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.4rem,6vw,4.6rem)', lineHeight: 1.02, margin: '0 0 16px' }}>{c.appTitle}</h2>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: '520px', lineHeight: 1.8 }}>{c.appDesc}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(56px,9vw,120px)' }}>
          {SCREENS.map((s, i) => {
            const t = s.text[L]
            return (
              <div key={s.file} className={`tr-row${i % 2 ? ' tr-row-flip' : ''}`}>
                <div className="tr-shot-wrap"><Shot file={s.file} w={s.w} h={s.h} alt={t.title} soon={c.shotSoon} /></div>
                <div className="tr-row-text">
                  <div className="tr-num">{String(i + 1).padStart(2, '0')}</div>
                  <h3 className="tr-row-title">{t.title}</h3>
                  <p className="tr-row-desc">{t.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── TRENERI ──────────────────────────────────────────── */}
      <section style={{ background: '#1a1a20', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="tr-wrap" style={{ paddingTop: 'clamp(72px,10vw,130px)', paddingBottom: 'clamp(72px,10vw,130px)' }}>
          <div className="section-eyebrow"><span>{c.teamEyebrow}</span></div>
          <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.4rem,6vw,4.6rem)', lineHeight: 1.02, margin: '0 0 clamp(40px,6vw,64px)' }}>{c.teamTitle}</h2>

          <div className="tr-coaches">
            {COACHES.map(coach => {
              const m = members[coach.name]
              const lifts = m ? [['S', kg(m.squat)], ['B', kg(m.bench)], ['D', kg(m.deadlift)]].filter(([, v]) => v) as [string, string][] : []
              return (
                <article key={coach.name} className="tr-coach">
                  <div className="tr-coach-photo">
                    <Image src={coach.photo} alt={coach.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw" quality={65} style={{ objectFit: 'cover' }} />
                  </div>
                  <div className="tr-coach-body">
                    <div className="tr-coach-role">{coach.role[L]}</div>
                    <h3 className="tr-coach-name">{coach.name}</h3>
                    {m?.nickname && <div className="tr-coach-nick">„{m.nickname}”</div>}

                    {m && (kg(m.total) || m.category) && (
                      <div className="tr-coach-stats">
                        {kg(m.total) && <div><span className="tr-stat-val">{kg(m.total)}<small> kg</small></span><span className="tr-stat-lbl">{c.total}</span></div>}
                        {m.glp && Number(m.glp) > 0 && <div><span className="tr-stat-val">{Number(m.glp).toFixed(1)}</span><span className="tr-stat-lbl">GLP</span></div>}
                        {m.category && <div><span className="tr-stat-val">{m.category.replace(/kg$/i, '')}</span><span className="tr-stat-lbl">KAT.</span></div>}
                      </div>
                    )}

                    {lifts.length > 0 && (
                      <div className="tr-coach-lifts" aria-label={c.best}>
                        {lifts.map(([k, v]) => <span key={k}><b>{k}</b> {v}</span>)}
                      </div>
                    )}

                    {m?.highlights && m.highlights.length > 0 && (
                      <ul className="tr-coach-hl">
                        {m.highlights.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    )}

                    {m?.instagram && (
                      <a href={m.instagram} target="_blank" rel="noopener noreferrer" className="tr-coach-ig" aria-label={`${coach.name} na Instagramu`}>
                        <Instagram size={13} /> INSTAGRAM
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
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
        .tr-wrap { max-width: 1200px; margin: 0 auto; padding-left: clamp(20px,5vw,60px); padding-right: clamp(20px,5vw,60px); box-sizing: border-box; position: relative; }

        /* screenshotovi: slika i opis u izmjeničnim redovima */
        .tr-row { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: clamp(32px, 6vw, 96px); align-items: center; }
        .tr-row-flip .tr-shot-wrap { order: 2; }
        .tr-shot-wrap { display: flex; justify-content: center; padding: clamp(20px, 3vw, 36px); background: radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 70%), #17171c; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
        .tr-shot { display: block; width: 100%; height: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 24px 60px rgba(0,0,0,0.55); }
        .tr-shot-empty { width: min(100%, 300px); aspect-ratio: 9 / 16; display: flex; align-items: center; justify-content: center; border-radius: 14px; border: 1px dashed rgba(255,255,255,0.18); background: rgba(255,255,255,0.02); }
        .tr-shot-empty span { font-size: 0.58rem; letter-spacing: 0.3em; font-weight: 700; color: rgba(255,255,255,0.5); text-align: center; padding: 0 16px; }
        .tr-num { font-family: var(--fd); font-size: clamp(2.6rem, 5vw, 3.6rem); line-height: 1; color: rgba(255,255,255,0.14); margin-bottom: 18px; }
        .tr-row-title { font-family: var(--fd); font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 700; margin: 0 0 14px; letter-spacing: 0.01em; }
        .tr-row-desc { font-size: clamp(0.9rem, 1.6vw, 1rem); color: rgba(255,255,255,0.62); line-height: 1.85; margin: 0; max-width: 420px; }

        /* treneri */
        .tr-coaches { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: clamp(16px, 2vw, 24px); }
        .tr-coach { background: #131317; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; transition: border-color 0.3s, transform 0.3s; }
        .tr-coach:hover { border-color: rgba(255,255,255,0.22); transform: translateY(-4px); }
        .tr-coach-photo { position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: #0d0d10; }
        .tr-coach-photo img { filter: grayscale(0.55) brightness(0.85); transition: filter 0.5s, transform 0.6s cubic-bezier(.16,1,.3,1); }
        .tr-coach:hover .tr-coach-photo img { filter: grayscale(0) brightness(1); transform: scale(1.04); }
        .tr-coach-body { padding: 22px 20px 24px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .tr-coach-role { font-size: 0.56rem; letter-spacing: 0.28em; font-weight: 700; color: rgba(255,255,255,0.55); text-transform: uppercase; }
        .tr-coach-name { font-family: var(--fd); font-size: 1.45rem; font-weight: 700; margin: 0; line-height: 1.1; }
        .tr-coach-nick { font-size: 0.78rem; color: rgba(255,255,255,0.55); margin-top: -4px; }
        .tr-coach-stats { display: flex; gap: 18px; padding: 14px 0; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); margin-top: 6px; }
        .tr-coach-stats > div { display: flex; flex-direction: column; gap: 4px; }
        .tr-stat-val { font-family: var(--fd); font-size: 1.25rem; font-weight: 700; line-height: 1; }
        .tr-stat-val small { font-size: 0.6rem; color: rgba(255,255,255,0.55); font-family: var(--fm); }
        .tr-stat-lbl { font-size: 0.5rem; letter-spacing: 0.24em; color: rgba(255,255,255,0.5); font-weight: 700; }
        .tr-coach-lifts { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.78rem; color: rgba(255,255,255,0.7); font-variant-numeric: tabular-nums; }
        .tr-coach-lifts b { color: rgba(255,255,255,0.5); font-weight: 700; margin-right: 2px; }
        .tr-coach-hl { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .tr-coach-hl li { font-size: 0.76rem; color: rgba(255,255,255,0.65); line-height: 1.5; padding-left: 14px; position: relative; }
        .tr-coach-hl li::before { content: ''; position: absolute; left: 0; top: 0.6em; width: 6px; height: 1px; background: rgba(255,255,255,0.5); }
        .tr-coach-ig { margin-top: auto; padding-top: 12px; display: inline-flex; align-items: center; gap: 7px; font-size: 0.56rem; letter-spacing: 0.22em; font-weight: 700; color: rgba(255,255,255,0.6); text-decoration: none; width: fit-content; transition: color 0.2s; }
        .tr-coach-ig:hover { color: #fff; }

        .tr-cta { display: inline-flex; align-items: center; gap: 10px; padding: 16px 34px; background: #fff; color: #000; text-decoration: none; font-size: 0.74rem; letter-spacing: 0.2em; font-weight: 800; transition: transform 0.25s, box-shadow 0.25s; }
        .tr-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,255,255,0.18); }

        @media (max-width: 1100px) { .tr-coaches { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 820px) {
          .tr-row { grid-template-columns: 1fr; }
          .tr-row-flip .tr-shot-wrap { order: 0; }
        }
        @media (max-width: 520px) { .tr-coaches { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
