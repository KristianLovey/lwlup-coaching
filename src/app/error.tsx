'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[Route Error]', error) }, [error])

  return (
    <div style={{ background: '#08080a', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fm)', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
      <div style={{ fontSize: '0.52rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>GREŠKA</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: '8px' }}>Nešto je pošlo po zlu.</div>
      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', maxWidth: '320px', lineHeight: 1.6, marginBottom: '32px' }}>
        Stranica nije mogla učitati podatke. Pokušaj ponovo ili se vrati na početnu.
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={reset} style={{ padding: '12px 28px', background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'opacity 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          POKUŠAJ PONOVO
        </button>
        <a href="/" style={{ padding: '12px 28px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)' }}>
          POČETNA
        </a>
      </div>
    </div>
  )
}
