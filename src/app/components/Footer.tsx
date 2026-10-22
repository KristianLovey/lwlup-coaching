'use client'
import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Instagram } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { LEGAL, legalLines, contactLabel, contactHref, phoneE164 } from '@/lib/legal'
import { EmailLink } from './EmailLink'

/**
 * Podnožje: gore stupci (klub, navigacija, klub, brojke), u sredini pojas s
 * podacima o pružatelju usluge (Zakon o elektroničkoj trgovini čl. 6 — naziv,
 * sjedište, kontakt), dolje copyright i pravila. Podaci dolaze iz legal.ts.
 */

/** Oznaka iznad stupca / bloka — isti stil svugdje u podnožju. */
function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="ft-eyebrow">{children}</div>
}

export default function Footer() {
  const { t } = useLanguage()

  const NAV: [string, string][] = [
    [t('footer.links.powerlifting'), '/#info'],
    [t('footer.links.about'),        '/#club'],
    [t('footer.links.coach'),        '/#coach'],
    [t('footer.links.system'),       '/#system'],
    [t('footer.links.training'),     '/training'],
  ]
  const CLUB: [string, string][] = [
    [t('footer.links.survey'),       '/survey'],
    [t('footer.links.competitions'), '/competitions'],
    [t('footer.links.team'),         '/team'],
  ]
  const STATS = [
    { val: '10+',  key: 'footer.stats.competitors' as const },
    { val: '12',   key: 'footer.stats.records'     as const },
    { val: '6',    key: 'footer.stats.european'    as const },
    { val: '2026', key: 'footer.stats.founded'     as const },
  ]

  return (
    <footer className="ft">

      {/* ── STUPCI ─────────────────────────────────────────────── */}
      <div className="ft-wrap ft-main">
        <div className="ft-grid">

          <div>
            <Image src="/slike/logopng.png" alt="LWL UP" width="96" height="70" style={{ display: 'block', marginBottom: '28px' }} />
            <p className="ft-desc">{t('footer.desc')}</p>
            <a href={LEGAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="LWL UP na Instagramu" className="ft-social">
              <Instagram size={15} />
            </a>
          </div>

          <nav aria-label={t('footer.nav')}>
            <Eyebrow>{t('footer.nav')}</Eyebrow>
            <div className="ft-links">
              {NAV.map(([label, href]) => <Link key={href} href={href} className="ft-link">{label}</Link>)}
            </div>
          </nav>

          <nav aria-label={t('footer.club')}>
            <Eyebrow>{t('footer.club')}</Eyebrow>
            <div className="ft-links">
              {CLUB.map(([label, href]) => <Link key={href} href={href} className="ft-link">{label}</Link>)}
            </div>
          </nav>

          <div>
            <Eyebrow>{t('footer.stats')}</Eyebrow>
            <div>
              {STATS.map((s, i) => (
                <div key={i} className="ft-stat">
                  <span className="ft-stat-val">{s.val}</span>
                  <span className="ft-stat-label">{t(s.key)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── KONTAKT I PODACI O KLUBU (ZET čl. 6) ─────────────────── */}
      <div className="ft-band">
        <div className="ft-wrap ft-contact">
          {legalLines().length > 0 && (
            <div>
              <Eyebrow>{t('footer.contact.seat')}</Eyebrow>
              {legalLines().map((line, i) => <div key={i} className="ft-value">{line}</div>)}
            </div>
          )}
          <div>
            <Eyebrow>{t('footer.contact.area')}</Eyebrow>
            <div className="ft-value">{t('footer.area')}</div>
          </div>
          {LEGAL.phone && (
            <div>
              <Eyebrow>{t('footer.contact.phone')}</Eyebrow>
              <a href={`tel:${phoneE164()}`} className="ft-value ft-value-link">{LEGAL.phone}</a>
            </div>
          )}
          <div>
            <Eyebrow>{t('footer.contact.email')}</Eyebrow>
            {LEGAL.email
              ? <EmailLink className="ft-value ft-value-link" fallback="—" />
              : <a href={contactHref()} target="_blank" rel="noopener noreferrer" className="ft-value ft-value-link">{contactLabel()}</a>}
          </div>
        </div>
      </div>

      {/* ── DONJA TRAKA ───────────────────────────────────────── */}
      <div className="ft-wrap ft-bottom">
        <span>© 2026 LWL UP POWERLIFTING · {t('footer.rights')}</span>
        <Link href="/pravila" className="ft-bottom-link">{t('footer.legal')}</Link>
        <span>{t('footer.designed')} <span style={{ color: 'rgba(255,255,255,0.8)' }}>Kristian Lovey</span></span>
      </div>

      <style>{`
        .ft { background: #131317; border-top: 1px solid rgba(255,255,255,0.09); font-family: var(--fm); }
        .ft-wrap { max-width: 1400px; margin: 0 auto; padding-left: 60px; padding-right: 60px; box-sizing: border-box; }

        .ft-main { padding-top: clamp(64px, 8vw, 104px); padding-bottom: clamp(56px, 7vw, 88px); }
        .ft-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr; gap: clamp(40px, 5vw, 80px); align-items: start; }

        .ft-eyebrow { font-size: 0.58rem; letter-spacing: 0.4em; color: rgba(255,255,255,0.55); font-weight: 700; margin-bottom: 26px; text-transform: uppercase; }
        .ft-desc { color: rgba(255,255,255,0.6); font-size: 0.86rem; line-height: 1.85; margin: 0 0 32px; max-width: 300px; }

        .ft-social { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.6); text-decoration: none; transition: border-color 0.25s, color 0.25s, background 0.25s; }
        .ft-social:hover { border-color: #fff; color: #fff; background: rgba(255,255,255,0.06); }

        .ft-links { display: flex; flex-direction: column; gap: 18px; }
        .ft-link { font-size: 0.9rem; color: rgba(255,255,255,0.6); text-decoration: none; width: fit-content; transition: color 0.25s, transform 0.25s; }
        .ft-link:hover { color: #fff; transform: translateX(5px); }

        .ft-stat { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 18px 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .ft-stat:first-child { padding-top: 0; }
        .ft-stat:last-child { border-bottom: none; }
        .ft-stat-val { font-family: var(--fd); font-size: 1.7rem; font-weight: 800; line-height: 1; color: #fff; }
        .ft-stat-label { font-size: 0.72rem; color: rgba(255,255,255,0.55); letter-spacing: 0.06em; text-align: right; }

        .ft-band { border-top: 1px solid rgba(255,255,255,0.07); border-bottom: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.015); }
        .ft-contact { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 32px 48px; padding-top: 40px; padding-bottom: 40px; }
        .ft-contact .ft-eyebrow { margin-bottom: 12px; font-size: 0.54rem; letter-spacing: 0.32em; }
        .ft-value { display: block; font-size: 0.86rem; line-height: 1.75; color: rgba(255,255,255,0.75); overflow-wrap: anywhere; }
        .ft-value-link { text-decoration: none; width: fit-content; border-bottom: 1px solid rgba(255,255,255,0.22); transition: color 0.2s, border-color 0.2s; }
        .ft-value-link:hover { color: #fff; border-bottom-color: #fff; }

        .ft-bottom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px 32px; padding-top: 28px; padding-bottom: 36px; font-size: 0.66rem; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); text-transform: uppercase; }
        .ft-bottom-link { color: rgba(255,255,255,0.6); text-decoration: none; transition: color 0.2s; }
        .ft-bottom-link:hover { color: #fff; }

        @media (max-width: 1024px) {
          .ft-grid { grid-template-columns: 1fr 1fr; }
          .ft-contact { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .ft-wrap { padding-left: 20px; padding-right: 20px; }
          .ft-grid { grid-template-columns: 1fr; gap: 48px; }
          .ft-contact { gap: 28px; }
          .ft-bottom { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 480px) {
          .ft-contact { grid-template-columns: 1fr; }
        }
      `}</style>
    </footer>
  )
}
