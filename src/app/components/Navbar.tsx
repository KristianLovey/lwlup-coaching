'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ArrowRight, X } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

// Supabase u zasebnom chunku — učitava se tek ako postoji auth cookie.
const NavAuthProbe = dynamic(() => import('./NavAuthProbe'), { ssr: false })

/** Ima li uopće smisla dizati Supabase? @supabase/ssr drži sesiju u
 *  `sb-<ref>-auth-token` cookieju (može biti razlomljen na .0/.1), koji je
 *  čitljiv iz JS-a. Nema cookieja → korisnik sigurno nije prijavljen. */
function hasAuthCookie() {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').some(c => c.startsWith('sb-') && c.includes('auth-token'))
}

type NavbarProps = {
  variant?: 'transparent' | 'solid'
  backLink?: { href: string; label: string }
  simple?: boolean
}

export default function Navbar({ variant = 'transparent', backLink, simple }: NavbarProps) {
  const pathname = usePathname()
  const [scrollY, setScrollY]         = useState(0)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [homeOpen, setHomeOpen]       = useState(false)
  const [mHomeOpen, setMHomeOpen]     = useState(false) // isti dropdown, mobilna verzija
  const [loggedIn, setLoggedIn]       = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const { lang, setLang, t } = useLanguage()

  // Sekcije naslovnice → grupirane pod "HOME" dropdown; zasebne stranice ostaju top-level
  const HOME_ANCHORS: [string, string][] = [
    [t('nav.powerlifting'), '#kategorije'],
    [t('nav.about'),        '#club'],
    [t('nav.founders'),     '#coach'],
    [t('nav.system'),       '#system'],
  ]
  const PAGE_LINKS: [string, string][] = [
    [t('nav.team'),         '/team'],
    [t('nav.coaches'),      '/treneri'],
    [t('nav.competitions'), '/competitions'],
    [t('nav.records'),      '/records'],
  ]

  // resolve anchor links: on non-home pages, prepend '/'
  const resolveHref = (href: string) => {
    if (href.startsWith('#') && pathname !== '/') return '/' + href
    return href
  }

  // ── Auth state ────────────────────────────────────────────────────
  // Bez cookieja preskačemo Supabase u cijelosti; s cookiejem ga učitava
  // <NavAuthProbe/>, koji provjeri je li sesija stvarno još valjana.
  const [needsProbe, setNeedsProbe] = useState(false)
  useEffect(() => {
    if (hasAuthCookie()) setNeedsProbe(true)
    else { setLoggedIn(false); setAuthChecked(true) }
  }, [])

  // Stabilna referenca — inline arrow bi svaki render ponovno pretplaćivao probe.
  const onAuthResolve = useCallback((isLoggedIn: boolean) => {
    setLoggedIn(isLoggedIn)
    setAuthChecked(true)
  }, [])

  // ── Scroll listener ───────────────────────────────────────────────
  useEffect(() => {
    if (variant !== 'transparent') return
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [variant])

  useEffect(() => {
    const fn = () => { if (window.innerWidth > 768) setMenuOpen(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    if (!menuOpen) setMHomeOpen(false)
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    if (menuOpen) document.body.classList.add('nav-open')
    else document.body.classList.remove('nav-open')
    return () => { document.body.style.overflow = ''; document.body.classList.remove('nav-open') }
  }, [menuOpen])

  const solid = variant === 'solid' || scrollY > 80

  // ── Language toggle ───────────────────────────────────────────────
  const LangToggle = ({ mobile = false }: { mobile?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '3px', flexShrink: 0 }}>
      {(['hr', 'en'] as const).map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{
            padding: mobile ? '8px 16px' : '4px 10px',
            background: lang === l ? 'rgba(255,255,255,0.12)' : 'transparent',
            border: 'none', cursor: 'pointer',
            color: lang === l ? '#fff' : 'rgba(255,255,255,0.35)',
            fontSize: mobile ? '0.72rem' : '0.58rem',
            fontWeight: lang === l ? 800 : 600,
            letterSpacing: '0.12em',
            fontFamily: 'var(--fm)',
            borderRadius: '2px',
            transition: 'all 0.2s',
          }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )

  // ── Auth CTA button ───────────────────────────────────────────────
  const AuthCTA = ({ mobile = false }: { mobile?: boolean }) => {
    if (!authChecked) return <div style={{ width: mobile ? '100%' : '90px', height: mobile ? '56px' : '40px' }} />
    const href  = loggedIn ? '/training' : '/auth'
    const label = loggedIn ? t('nav.training') : t('nav.login')
    const isPrimary = !loggedIn

    return (
      <Link href={href} style={{ textDecoration: 'none', width: mobile ? '100%' : 'auto' }} onClick={() => setMenuOpen(false)}>
        <button className={isPrimary ? 'nav-cta-primary' : 'nav-cta-secondary'}
          style={{
            width: mobile ? '100%' : 'auto',
            padding: mobile ? '16px' : '10px 24px',
            background: isPrimary ? '#fff' : 'transparent',
            color: isPrimary ? '#000' : '#fff',
            border: isPrimary ? '1px solid #fff' : '1px solid rgba(255,255,255,0.35)',
            cursor: 'pointer',
            fontSize: mobile ? '0.85rem' : '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.18em',
            transition: 'all 0.3s',
            borderRadius: '2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            fontFamily: 'var(--fm)',
          }}>
          {label}
        </button>
      </Link>
    )
  }

  // Stavka mobilnog izbornika — i je redoslijed za stagger ulaza.
  const mobileItemStyle = (i: number): React.CSSProperties => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 'clamp(1.8rem,7vw,2.4rem)', fontFamily: 'var(--fd)', fontWeight: 700,
    letterSpacing: '0.04em', color: '#fff', textAlign: 'left',
    textDecoration: 'none', padding: '18px 0',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    opacity: menuOpen ? 1 : 0,
    transform: menuOpen ? 'translateX(0)' : 'translateX(-16px)',
    transition: `opacity 0.35s ${i * 0.06 + 0.05}s ease, transform 0.35s ${i * 0.06 + 0.05}s ease`,
  })

  return (
    <>
      {needsProbe && <NavAuthProbe onResolve={onAuthResolve} />}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: '80px',
        padding: '0 clamp(20px,5vw,60px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: solid || menuOpen ? 'rgba(19,19,23,0.98)' : 'transparent',
        borderBottom: solid || menuOpen ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        backdropFilter: solid || menuOpen ? 'blur(20px)' : 'none',
        transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)}
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#fff', zIndex: 1 }}>
          <Image src="/slike/logopng.png" alt="LWL UP" width={82} height={60}
            priority
            style={{ height: '60px', width: 'auto', transition: 'transform 0.3s' }}
            onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.1) rotate(-2deg)'}
            onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1) rotate(0deg)'}
          />
        </Link>

        {/* Desktop nav */}
        <div className="nav-desktop">
          {simple ? (
            <Link href="/"
              style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.7rem', letterSpacing: '0.2em', fontWeight: 600, transition: '0.3s', fontFamily: 'var(--fm)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >← {t('nav.home')}</Link>
          ) : backLink ? (
            <Link href={backLink.href}
              style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.2em', fontWeight: 600, transition: '0.3s', fontFamily: 'var(--fm)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >← {backLink.label}</Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
              {/* HOME — dropdown sa sekcijama naslovnice */}
              <div style={{ position: 'relative' }} onMouseEnter={() => setHomeOpen(true)} onMouseLeave={() => setHomeOpen(false)}>
                <a href={pathname === '/' ? '#top' : '/'}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', letterSpacing: '0.2em', color: homeOpen ? '#fff' : 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.3s', fontWeight: 600 }}>
                  {t('nav.home')}
                  <span style={{ display: 'inline-block', transform: homeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', fontSize: '0.6rem' }}>▾</span>
                </a>
                {/* invisible bridge so hover ne prekida dok se spušta na panel */}
                <div style={{ position: 'absolute', top: '100%', left: 0, height: '14px', width: '200px' }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 12px)', left: '-14px', minWidth: '210px', background: 'rgba(20,20,26,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', boxShadow: '0 24px 60px rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', padding: '8px', opacity: homeOpen ? 1 : 0, transform: homeOpen ? 'translateY(0)' : 'translateY(-8px)', pointerEvents: homeOpen ? 'all' : 'none', transition: 'opacity 0.22s, transform 0.22s' }}>
                  {HOME_ANCHORS.map(([label, href]) => (
                    <a key={href} href={resolveHref(href)} onClick={() => setHomeOpen(false)}
                      style={{ display: 'block', padding: '11px 14px', borderRadius: '8px', fontSize: '0.7rem', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, transition: 'all 0.18s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
                    >{label}</a>
                  ))}
                </div>
              </div>
              {PAGE_LINKS.map(([label, href]) => (
                <a key={href} href={resolveHref(href)}
                  style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'all 0.3s', fontWeight: 600 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >{label}</a>
              ))}
              <LangToggle />
              <AuthCTA />
            </div>
          )}
        </div>

        {/* Hamburger — LangToggle must be outside the <button> to avoid nested buttons */}
        <div className="nav-hamburger" style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1 }}>
          <LangToggle />
          <button aria-label={menuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'} onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '8px', display: 'flex', alignItems: 'center' }}>
            {menuOpen ? <X size={24} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '24px' }}>
                <div style={{ height: '2px', background: '#fff', width: '100%' }} />
                <div style={{ height: '2px', background: '#fff', width: '70%' }} />
                <div style={{ height: '2px', background: '#fff', width: '100%' }} />
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className="nav-mobile-menu" style={{
        position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0, zIndex: 199,
        background: '#131317', display: 'flex', flexDirection: 'column',
        padding: '32px 24px 60px', overflowY: 'auto',
        opacity: menuOpen ? 1 : 0,
        transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
        pointerEvents: menuOpen ? 'all' : 'none',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        visibility: menuOpen ? 'visible' : 'hidden',
      }}>
        <div style={{ flex: 1 }}>
          {simple ? (
            <Link href="/" onClick={() => setMenuOpen(false)} style={mobileItemStyle(0)}>
              {t('nav.home')}
              <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.2)' }}>→</span>
            </Link>
          ) : (
            <>
              {/* POČETNA — sekcije naslovnice su grupirane kao u desktop dropdownu,
                  samo se ovdje otvaraju tapom umjesto hoverom. */}
              <button onClick={() => setMHomeOpen(o => !o)}
                aria-expanded={mHomeOpen}
                style={{ ...mobileItemStyle(0), background: 'transparent', border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.07)', width: '100%', cursor: 'pointer' }}>
                {t('nav.home')}
                <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.35)', transform: mHomeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>▾</span>
              </button>
              <div style={{
                maxHeight: mHomeOpen ? '340px' : '0px', opacity: mHomeOpen ? 1 : 0, overflow: 'hidden',
                transition: 'max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.28s ease',
              }}>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.12)', margin: '4px 0 4px 3px', paddingLeft: '16px' }}>
                  {HOME_ANCHORS.map(([label, href], ai) => (
                    <a key={href} href={resolveHref(href)} onClick={() => setMenuOpen(false)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontFamily: 'var(--fm)', fontSize: '0.76rem', letterSpacing: '0.2em', fontWeight: 600,
                        color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '15px 0',
                        // zadnja nema crtu — inače se udvostruči s rubom sljedeće stavke
                        borderBottom: ai < HOME_ANCHORS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      {label}
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.18)' }}>→</span>
                    </a>
                  ))}
                </div>
              </div>

              {PAGE_LINKS.map(([label, href], i) => (
                <Link key={href} href={resolveHref(href)}
                  onClick={() => setMenuOpen(false)}
                  style={mobileItemStyle(i + 1)}>
                  {label}
                  <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.2)' }}>→</span>
                </Link>
              ))}
            </>
          )}
        </div>

        <div style={{
          marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '10px',
          opacity: menuOpen ? 1 : 0, transform: menuOpen ? 'none' : 'translateY(12px)',
          transition: `opacity 0.35s ${(PAGE_LINKS.length + 1) * 0.06 + 0.1}s, transform 0.35s ${(PAGE_LINKS.length + 1) * 0.06 + 0.1}s`,
        }}>
          {/* Auth CTA — main mobile action */}
          <AuthCTA mobile />

          {/* JOIN only when not logged in */}
          {authChecked && !loggedIn && (
            <Link href="/survey" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%', padding: '16px', background: 'transparent', color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)', fontSize: '0.85rem', fontWeight: 800,
                letterSpacing: '0.25em', cursor: 'pointer', fontFamily: 'var(--fm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                {t('nav.join')} <ArrowRight size={14} strokeWidth={3} />
              </button>
            </Link>
          )}

          {backLink && (
            <Link href={backLink.href} onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.72rem', letterSpacing: '0.2em' }}>
              ← {backLink.label}
            </Link>
          )}

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)' }}>LWL UP @ 2026</span>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)' }}>{t('nav.rights')}</span>
          </div>
        </div>
      </div>

      <style>{`
        .nav-cta-primary:hover  { background:#000 !important; color:#fff !important; border-color:rgba(255,255,255,0.5) !important; }
        .nav-cta-secondary:hover { background:rgba(255,255,255,0.08) !important; border-color:rgba(255,255,255,0.6) !important; }
        @media (min-width: 769px) { .nav-desktop { display:flex !important; } .nav-hamburger { display:none !important; } }
        @media (max-width: 768px) { nav { padding:0 20px !important; height:64px !important; } .nav-desktop { display:none !important; } .nav-hamburger { display:flex !important; } }
        :root.is-native nav { top: 0 !important; height: calc(56px + env(safe-area-inset-top)) !important; padding-top: env(safe-area-inset-top) !important; background: #131317 !important; backdrop-filter: none !important; }
        :root.is-native .nav-mobile-menu { top: calc(56px + env(safe-area-inset-top)) !important; }
      `}</style>
    </>
  )
}
