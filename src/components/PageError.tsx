'use client'

export function PageError({ message = 'Greška pri učitavanju podataka.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--fm)', lineHeight: 1.6, maxWidth: '280px' }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ marginTop: '4px', padding: '8px 20px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', color: 'rgba(255,255,255,0.65)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--fm)', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}>
          POKUŠAJ PONOVO
        </button>
      )}
    </div>
  )
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: '64px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', animation: 'shimmer 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
      ))}
      <style>{`@keyframes shimmer { 0%,100% { opacity:0.5 } 50% { opacity:1 } }`}</style>
    </div>
  )
}

export function EmptyState({ message = 'Nema podataka za prikaz.', icon = '📭' }: { message?: string; icon?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', gap: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', maxWidth: '260px', lineHeight: 1.6 }}>{message}</div>
    </div>
  )
}
