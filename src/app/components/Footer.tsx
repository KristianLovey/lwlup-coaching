'use client'
import Link from 'next/link'
import { Instagram, Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ padding: '80px 60px', background: '#000', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="footer-inner" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '40px' }} />
            <span style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', letterSpacing: '0.2em' }}>LWL UP</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', maxWidth: '300px', lineHeight: 1.6 }}>
            Vodeći powerlifting klub u regiji. Specijalizirani za razvoj snage i vrhunsku pripremu sportaša.
          </p>
        </div>

        {/* Links */}
        <div className="footer-nav-row" style={{ display: 'flex', gap: '80px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <span style={{ fontSize: '0.7rem', color: '#fff', letterSpacing: '0.2em', fontWeight: 800 }}>NAVIGACIJA</span>
            {([
              ['O klubu',  '/#club'],
              ['Trener',   '/#coach'],
              ['Sustav',   '/#system'],
              ['Tim',      '/team'],
              ['Upitnik',  '/survey'],
            ] as [string, string][]).map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="footer-link"
                style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: '0.3s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                {label}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <span style={{ fontSize: '0.7rem', color: '#fff', letterSpacing: '0.2em', fontWeight: 800 }}>SOCIJALNO</span>
            <a
              href="https://www.instagram.com/lwlup/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: '0.3s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              <Instagram size={14} /> Instagram
            </a>
            <a
              href="#"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: '0.3s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              <Facebook size={14} /> Facebook
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div style={{ maxWidth: '1400px', margin: '60px auto 0', paddingTop: '30px', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', textAlign: 'center' }}>
        © 2026 LWLUP POWERLIFTING. ALL RIGHTS RESERVED.
      </div>

      <style>{`
        .footer-link:hover { color: #fff !important; transform: translateX(5px); }

        @media (max-width: 768px) {
          .footer-inner { flex-direction: column !important; gap: 40px !important; padding: 0 !important; }
          footer { padding: 60px 20px !important; }
          .footer-nav-row { gap: 40px !important; }
        }
      `}</style>
    </footer>
  )
}