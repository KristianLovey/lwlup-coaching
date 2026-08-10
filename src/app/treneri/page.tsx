'use client'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { useLanguage } from '@/context/LanguageContext'

export default function TreneriPage() {
  const { t } = useLanguage()
  return (
    <div style={{ background: '#131317', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="star-field" />
      <Navbar variant="solid" />

      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '160px 24px 100px', position: 'relative', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '900px', maxWidth: '100%', height: '500px', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.4)', marginBottom: '22px' }}>{t('coaches.eyebrow')}</div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3.5rem, 11vw, 8rem)', lineHeight: 0.9, margin: '0 0 28px' }}>
            {t('coaches.title')}
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '10px 22px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', marginBottom: '32px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef3535', boxShadow: '0 0 10px rgba(239,53,53,0.6)', animation: 'pulse-dot 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.28em', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{t('coaches.soon')}</span>
          </div>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.6)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.85, fontWeight: 300 }}>
            {t('coaches.desc')}
          </p>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }
        @media (max-width: 768px) {
          nav { padding: 0 20px !important; }
        }
      `}</style>
    </div>
  )
}
