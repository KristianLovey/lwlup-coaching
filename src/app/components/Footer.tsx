'use client'
import Link from 'next/link'
import { Instagram, Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--fm)', position: 'relative', overflow: 'hidden' }}>

      {/* Big background wordmark */}
      <div style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--fd)', fontSize: 'clamp(6rem,14vw,16rem)', fontWeight: 800, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.03)', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}>
        LWL UP
      </div>



      {/* Main footer content */}
      <div style={{ padding: '64px 60px 56px', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="footer-inner" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '60px', alignItems: 'start' }}>

          {/* Brand col */}
          <div>
            <img src="/slike/logopng.png" alt="LWL UP" style={{ height: '70px', marginBottom: '24px', display: 'block' }} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', lineHeight: 1.75, margin: '0 0 28px', maxWidth: '260px' }}>
              Vodeći powerlifting klub u regiji. Specijalizirani za razvoj snage i vrhunsku pripremu sportaša za natjecanja na svim razinama.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href="https://www.instagram.com/lwlup/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
              >
                <Instagram size={14} />
              </a>
              <a
                href="#"
                className="footer-social-btn"
                style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
              >
                <Facebook size={14} />
              </a>
            </div>
          </div>

          {/* Nav col */}
          <div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.2)', marginBottom: '24px', fontWeight: 700 }}>NAVIGACIJA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                ['Powerlifting',      '/#info'],
                ['O klubu',  '/#club'],
                ['Trener',   '/#coach'],
                ['Sustav',   '/#system'],
                ['Trening',  '/training'],
              ] as [string, string][]).map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="footer-link"
                  style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.paddingLeft = '6px' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.paddingLeft = '0' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Club col */}
          <div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.2)', marginBottom: '24px', fontWeight: 700 }}>KLUB</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                ['Upitnik',       '/survey'],
                ['Natjecanja',    '/competitions'],
                ['LWL UP Tim',    '/team'],
                
              ] as [string, string][]).map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="footer-link"
                  style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'all 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.paddingLeft = '6px' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.paddingLeft = '0' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Stats col */}
          <div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.2)', marginBottom: '24px', fontWeight: 700 }}>BROJKE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { val: '10+',  label: 'Aktivnih natjecatelja' },
                { val: '12',   label: 'Državnih rekorda' },
                { val: '6',    label: 'Europskih nastupa' },
                { val: '2023', label: 'Godina osnivanja' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{s.val}</span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 60px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>
            © 2026 LWL UP POWERLIFTING. ALL RIGHTS RESERVED.
          </span>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>
            DESIGNED BY <span style={{ color: 'rgba(255,255,255,0.3)' }}>[NexusCortex]</span>
          </span>
        </div>
      </div>

      <style>{`
        .footer-link { transition: color 0.25s, padding-left 0.25s !important; }
        @media (max-width: 1024px) {
          .footer-inner { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
        }
        @media (max-width: 768px) {
          .footer-inner { grid-template-columns: 1fr !important; gap: 36px !important; }
          footer > div { padding-left: 20px !important; padding-right: 20px !important; }
          footer > div:first-child { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
    </footer>
  )
}