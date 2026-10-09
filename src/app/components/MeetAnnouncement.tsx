'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Trophy, X, ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

// 15. državno prvenstvo za seniore (HPLS). Dani su iz službenog rasporeda: pet–ned 6.–8.11.2026.
const MEET = {
  url: 'https://www.hpls-powerlifting.hr/2026/10/15-drzavno-prvenstvo-za-seniore/',
  // Oznaka nestaje sama nakon zadnjeg dana natjecanja (studeni je CET, +01:00)
  hideAfter: new Date('2026-11-09T00:00:00+01:00').getTime(),
  lifters: [
    'Lara Žic', 'Antonela Mahnet', 'Tara Petrović', 'Sara Magaš', 'Maria Magdalena Goričanec',
    'Nenad Novak', 'Marko Maketić', 'Kristian Lövey', 'Walter Smajlović', 'Matija Pongrac',
  ],
}

/** Oznaka kraj logotipa na naslovnici: svake 3 s zavibrira, klik otvara najavu. */
export default function MeetAnnouncement() {
  const { t } = useLanguage()
  // Datum se provjerava tek na klijentu: stranica je statički generirana pri buildu,
  // pa bi provjera na serveru ostala "zamrznuta" na trenutku builda.
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setActive(Date.now() < MEET.hideAfter) }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    const badge = badgeRef.current
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      badge?.focus()
    }
  }, [open])

  if (!active) return null

  return (
    <>
      <button ref={badgeRef} type="button" aria-label={t('meet.open')} aria-haspopup="dialog"
        className={`meet-badge${seen ? '' : ' meet-badge-buzz'}`}
        onClick={() => { setOpen(true); setSeen(true) }}>
        <span className="meet-dot" />
        <Trophy size={13} strokeWidth={2.2} />
        <span className="meet-badge-text">{t('meet.badge')}</span>
      </button>

      {/* Portal: nav ima backdrop-filter, pa bi position:fixed unutar njega bio
          ograničen na traku navigacije umjesto na cijeli ekran. */}
      {open && createPortal(
        <div className="meet-scrim" onClick={() => setOpen(false)}>
          <div className="meet-panel" role="dialog" aria-modal="true" aria-labelledby="meet-title" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="meet-dot" />
                <span style={{ fontSize: '0.58rem', letterSpacing: '0.4em', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{t('meet.eyebrow')}</span>
              </div>
              <button ref={closeRef} type="button" aria-label={t('meet.close')} onClick={() => setOpen(false)} className="meet-close">
                <X size={18} />
              </button>
            </div>

            <h2 id="meet-title" style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2rem,7vw,2.9rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 14px', color: '#fff' }}>
              {t('meet.title')}
            </h2>
            <p style={{ fontSize: '0.8rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{t('meet.when')}</p>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '26px 0 22px' }} />

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.4em', fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>{t('meet.lifters')}</span>
              <span style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{MEET.lifters.length}</span>
            </div>
            <ul className="meet-list">
              {MEET.lifters.map(name => (
                <li key={name}>
                  <span style={{ width: '4px', height: '4px', background: '#fff', opacity: 0.4, flexShrink: 0 }} />
                  {name}
                </li>
              ))}
            </ul>

            <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.6)', margin: '24px 0 22px' }}>{t('meet.info')}</p>

            <a href={MEET.url} target="_blank" rel="noopener noreferrer" className="meet-cta">
              {t('meet.cta')} <ArrowUpRight size={15} strokeWidth={2.4} />
            </a>
          </div>
        </div>,
        document.body,
      )}

      <style>{`
        .meet-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 7px 13px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.05);
          color: #fff; font-family: var(--fm); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.22em;
          cursor: pointer; transition: border-color 0.25s, background 0.25s;
          -webkit-tap-highlight-color: transparent;
        }
        .meet-badge:hover, .meet-badge:focus-visible { border-color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.1); }
        /* Vibracija traje ~0.5 s, zatim mirovanje do iduće (ciklus 3 s) */
        .meet-badge-buzz { animation: meet-buzz 3s ease-in-out 1s infinite; }
        .meet-badge-buzz:hover { animation-play-state: paused; }
        @keyframes meet-buzz {
          0%, 18%, 100% { transform: translateX(0) rotate(0); }
          2%  { transform: translateX(-2px) rotate(-6deg); }
          4%  { transform: translateX(2px) rotate(6deg); }
          6%  { transform: translateX(-2px) rotate(-5deg); }
          8%  { transform: translateX(2px) rotate(5deg); }
          10% { transform: translateX(-1px) rotate(-3deg); }
          12% { transform: translateX(1px) rotate(3deg); }
          14% { transform: translateX(0) rotate(-1deg); }
        }
        .meet-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          background: #ef3535; box-shadow: 0 0 10px rgba(239,53,53,0.6);
          animation: meet-dot 1.8s ease-in-out infinite;
        }
        @keyframes meet-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }

        .meet-scrim {
          position: fixed; inset: 0; z-index: 4000;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(6px);
          display: grid; place-items: center; padding: 20px;
          animation: meet-fade 0.25s ease;
        }
        .meet-panel {
          box-sizing: border-box; width: 100%; max-width: 460px; max-height: calc(100svh - 40px); overflow-y: auto;
          background: #16161b; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
          padding: clamp(24px,5vw,36px); font-family: var(--fm); color: #fff;
          animation: meet-in 0.45s cubic-bezier(0.16,1,0.3,1);
        }
        .meet-close {
          background: none; border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7);
          width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: border-color 0.2s, color 0.2s; flex-shrink: 0;
        }
        .meet-close:hover, .meet-close:focus-visible { border-color: #fff; color: #fff; }
        .meet-list {
          list-style: none; margin: 0; padding: 0;
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px;
        }
        .meet-list li { display: flex; align-items: center; gap: 10px; font-size: 0.86rem; color: rgba(255,255,255,0.82); line-height: 1.35; }
        .meet-cta {
          box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 16px 20px; background: #fff; color: #000; text-decoration: none;
          font-size: 0.7rem; font-weight: 800; letter-spacing: 0.2em; transition: background 0.25s, color 0.25s;
        }
        .meet-cta:hover, .meet-cta:focus-visible { background: #000; color: #fff; box-shadow: inset 0 0 0 1px #fff; }
        @keyframes meet-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes meet-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }

        @media (max-width: 480px) {
          .meet-badge-text { display: none; }
          .meet-badge { padding: 8px 11px; }
          .meet-list { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .meet-badge-buzz, .meet-dot, .meet-scrim, .meet-panel { animation: none; }
        }
      `}</style>
    </>
  )
}
