'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'

type NavbarProps = {
  variant?: 'transparent' | 'solid'
  backLink?: { href: string; label: string }
  simple?: boolean
}

export default function Navbar({ variant = 'transparent', backLink, simple }: NavbarProps) {
  const pathname = usePathname()
  const [scrollY, setScrollY]         = useState(0)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [loggedIn, setLoggedIn]       = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const { lang, setLang, t } = useLanguage()

  const NAV_LINKS: [string, string][] = [
    [t('nav.powerlifting'), '#kategorije'],
    [t('nav.about'),        '#club'],
    [t('nav.founders'),     '#coach'],
    [t('nav.system'),       '#system'],
    [t('nav.team'),         '/team'],
    [t('nav.competitions'), '/competitions'],
    [t('nav.records'),      '/records'],
  ]

  // resolve anchor links: on non-home pages, prepend '/'
  const resolveHref = (href: string) => {
    if (href.startsWith('#') && pathname !== '/') return '/' + href
    return href
  }

  // ── Auth state ────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user)
      setAuthChecked(true)
    })
    return () => subscription.unsubscribe()
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

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: '80px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,5vw,60px)',
        background: solid || menuOpen ? 'rgba(5,5,5,0.98)' : 'transparent',
        borderBottom: solid || menuOpen ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        backdropFilter: solid || menuOpen ? 'blur(20px)' : 'none',
        transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)}
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#fff', zIndex: 1 }}>
          <img src="/slike/logopng.png" alt="LWL UP"
            style={{ height: '60px', width: 'auto', transition: 'transform 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(-2deg)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
              {NAV_LINKS.map(([label, href]) => (
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
          <button onClick={() => setMenuOpen(o => !o)}
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
      <div style={{
        position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0, zIndex: 199,
        background: '#050505', display: 'flex', flexDirection: 'column',
        padding: '32px 24px 60px', overflowY: 'auto',
        opacity: menuOpen ? 1 : 0,
        transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
        pointerEvents: menuOpen ? 'all' : 'none',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        visibility: menuOpen ? 'visible' : 'hidden',
      }}>
        <div style={{ flex: 1 }}>
          {simple ? (
            <Link href="/" onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 'clamp(1.8rem,7vw,2.4rem)', fontFamily: 'var(--fd)', fontWeight: 700,
                letterSpacing: '0.04em', color: '#fff', textDecoration: 'none', padding: '18px 0',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateX(0)' : 'translateX(-16px)',
                transition: 'opacity 0.35s 0.05s ease, transform 0.35s 0.05s ease',
              }}>
              {t('nav.home')}
              <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.2)' }}>→</span>
            </Link>
          ) : (
            NAV_LINKS.map(([label, href], i) => {
              const resolved = resolveHref(href)
              const isAnchor = resolved.startsWith('/#') || resolved.startsWith('#')
              const itemStyle: React.CSSProperties = {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 'clamp(1.8rem,7vw,2.4rem)', fontFamily: 'var(--fd)', fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#fff',
                textDecoration: 'none', padding: '18px 0',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateX(0)' : 'translateX(-16px)',
                transition: `opacity 0.35s ${i * 0.06 + 0.05}s ease, transform 0.35s ${i * 0.06 + 0.05}s ease`,
              }
              const inner = (
                <>
                  {label}
                  <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.2)' }}>→</span>
                </>
              )
              return isAnchor ? (
                <a key={href} href={resolved}
                  onClick={() => setMenuOpen(false)}
                  style={itemStyle}>
                  {inner}
                </a>
              ) : (
                <Link key={href} href={resolved}
                  onClick={() => setMenuOpen(false)}
                  style={itemStyle}>
                  {inner}
                </Link>
              )
            })
          )}
        </div>

        <div style={{
          marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '10px',
          opacity: menuOpen ? 1 : 0, transform: menuOpen ? 'none' : 'translateY(12px)',
          transition: `opacity 0.35s ${NAV_LINKS.length * 0.06 + 0.1}s, transform 0.35s ${NAV_LINKS.length * 0.06 + 0.1}s`,
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
      `}</style>
    </>
  )
}
