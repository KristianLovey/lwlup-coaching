'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[Global Error]', error) }, [error])

  return (
    <html lang="hr">
      <body style={{ background: '#08080a', margin: 0, padding: 0 }}>
        <div style={{ color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: '8px' }}>Kritična greška aplikacije</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginBottom: '28px' }}>Nešto je ozbiljno pošlo po zlu. Osvježi stranicu.</div>
          <button onClick={reset} style={{ padding: '12px 28px', background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em' }}>
            OSVJEŽI
          </button>
        </div>
      </body>
    </html>
  )
}
