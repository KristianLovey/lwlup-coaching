'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, Shield } from 'lucide-react'

export default function ForbiddenPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div style={{
      background: '#08080a', color: '#fff', minHeight: '100vh',
      fontFamily: 'var(--fm)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
        backgroundSize: '48px 48px' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(220,38,38,0.05) 0%,transparent 70%)',
        pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px 24px',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Icon */}
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <Shield size={28} color="rgba(239,68,68,0.6)" />
        </div>

        {/* 403 */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(6rem,16vw,12rem)', fontWeight: 800, lineHeight: 0.85, letterSpacing: '-0.04em', color: 'transparent', WebkitTextStroke: '1px rgba(239,68,68,0.08)', userSelect: 'none' }}>403</div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)', fontSize: 'clamp(6rem,16vw,12rem)', fontWeight: 800, lineHeight: 0.85, letterSpacing: '-0.04em', background: 'linear-gradient(180deg,rgba(239,68,68,0.25) 0%,rgba(239,68,68,0.05) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>403</div>
        </div>

        <div style={{ width: '48px', height: '1px', background: 'rgba(239,68,68,0.2)', margin: '24px auto 28px' }} />

        <div style={{ fontSize: '0.55rem', letterSpacing: '0.6em', color: 'rgba(239,68,68,0.4)', marginBottom: '12px' }}>
          PRISTUP ODBIJEN
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--fd)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
          Nemate admin ovlasti.
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.25)', maxWidth: '300px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Ova stranica dostupna je samo administratorima sustava.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: '#fff', color: '#000', textDecoration: 'none', fontSize: '0.68rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.85)'}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = '#fff'}>
            <Home size={13} /> POČETNA
          </Link>
          <Link href="/training" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.68rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)' }}>
            MOJ TRENING
          </Link>
        </div>

        <div style={{ marginTop: '60px', fontSize: '0.52rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.08)' }}>
          LWLUP · LIFT WITH LEVEL UP
        </div>
      </div>
    </div>
  )
}