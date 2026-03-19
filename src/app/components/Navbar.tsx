'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'

type NavbarProps = {
  variant?: 'transparent' | 'solid'
  backLink?: { href: string; label: string }
}

const NAV_LINKS: [string, string][] = [
  ['POWERLIFTING', '#info'],
  ['O KLUBU',      '#club'],
  ['OSNIVAČ',      '#coach'],
  ['SUSTAV',       '#system'],
  ['TIM',          '/team'],
  ['NATJECANJA',   '/competitions'],
]

export default function Navbar({ variant = 'transparent', backLink }: NavbarProps) {
  const [scrollY, setScrollY]   = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (variant !== 'transparent') return
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const solid = variant === 'solid' || scrollY > 80

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: '80px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 60px',
        background: solid || menuOpen ? 'rgba(5,5,5,0.98)' : 'transparent',
        borderBottom: solid || menuOpen ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        backdropFilter: solid || menuOpen ? 'blur(20px)' : 'none',
        transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)}
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#fff', zIndex: 1 }}>
          <img src="/slike/logopng.png" alt="LWLUP"
            style={{ height: '60px', width: 'auto', transition: 'transform 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(-2deg)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
          />
        </Link>

        {/* Desktop right */}
        <div className="nav-desktop">
          {backLink ? (
            <Link href={backLink.href}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.2em', fontWeight: 600, transition: '0.3s', fontFamily: 'var(--fm)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >← {backLink.label}</Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              {NAV_LINKS.map(([label, href]) => (
                <a key={label} href={href}
                  style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'all 0.3s', fontWeight: 600 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >{label}</a>
              ))}
              <Link href="/survey" style={{ textDecoration: 'none' }}>
                <button
                  style={{ padding: '12px 28px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', transition: 'all 0.3s', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--fm)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)' }}
                >PRIDRUŽI SE <ArrowRight size={14} strokeWidth={3} /></button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '8px', zIndex: 1 }}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile full-screen menu */}
      <div style={{
        position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0, zIndex: 199,
        background: '#050505',
        display: 'flex', flexDirection: 'column',
        padding: '32px 24px 60px',
        overflowY: 'auto',
        opacity: menuOpen ? 1 : 0,
        pointerEvents: menuOpen ? 'all' : 'none',
        transition: 'opacity 0.25s ease',
        visibility: menuOpen ? 'visible' : 'hidden',
      }}>
        {/* Nav links — veliki font */}
        <div style={{ flex: 1 }}>
          {NAV_LINKS.map(([label, href], i) => (
            <a key={label} href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 'clamp(1.8rem, 7vw, 2.4rem)',
                fontFamily: 'var(--fd)', fontWeight: 700, letterSpacing: '0.04em',
                color: '#fff', textDecoration: 'none',
                padding: '18px 0',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateX(0)' : 'translateX(-16px)',
                transition: `opacity 0.35s ${i * 0.06 + 0.05}s ease, transform 0.35s ${i * 0.06 + 0.05}s ease`,
              }}
            >
              {label}
              <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>→</span>
            </a>
          ))}
        </div>

        {/* CTA + back link na dnu */}
        <div style={{
          marginTop: '40px',
          opacity: menuOpen ? 1 : 0,
          transform: menuOpen ? 'translateY(0)' : 'translateY(12px)',
          transition: `opacity 0.35s ${NAV_LINKS.length * 0.06 + 0.1}s ease, transform 0.35s ${NAV_LINKS.length * 0.06 + 0.1}s ease`,
        }}>
          <Link href="/survey" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%', padding: '18px', background: '#fff', color: '#000',
              border: 'none', fontSize: '0.85rem', fontWeight: 800,
              letterSpacing: '0.25em', cursor: 'pointer', fontFamily: 'var(--fm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            }}>
              PRIDRUŽI SE <ArrowRight size={14} strokeWidth={3} />
            </button>
          </Link>

          {backLink && (
            <Link href={backLink.href} onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.72rem', letterSpacing: '0.2em' }}
            >← {backLink.label}</Link>
          )}
        </div>
      </div>

      <style>{`
        /* Desktop */
        @media (min-width: 769px) {
          .nav-desktop  { display: flex !important; }
          .nav-hamburger { display: none !important; }
        }
        /* Mobile */
        @media (max-width: 768px) {
          nav { padding: 0 20px !important; height: 64px !important; }
          .nav-desktop  { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}