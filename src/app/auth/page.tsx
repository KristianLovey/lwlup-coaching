'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'

const supabase = createClient()

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Popuni sve obavezne podatke.'); return }
    if (password.length < 6) { setError('Lozinka mora imati najmanje 6 znakova.'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.refresh()
      router.push('/training')
    } catch (e: any) {
      const msg = e?.message ?? 'Greška. Pokušaj ponovo.'
      if (msg.includes('Invalid login')) setError('Pogrešan email ili lozinka.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    setError('')
    if (!email) { setError('Unesi svoju email adresu.'); return }
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/auth/reset`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setResetSent(true)
    } catch (e: any) {
      setError(e?.message ?? 'Greška. Pokušaj ponovo.')
    } finally {
      setLoading(false)
    }
  }

  const inp = (name: string): React.CSSProperties => ({
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: `1px solid ${focused === name ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.12)'}`,
    color: '#fff', fontSize: '1rem', padding: '14px 0', outline: 'none',
    transition: 'border-color 0.25s', fontFamily: 'var(--fm)',
    boxSizing: 'border-box' as const,
  })

  const lbl = (name: string): React.CSSProperties => ({
    display: 'block', fontSize: '0.58rem', letterSpacing: '0.4em',
    color: focused === name ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
    marginBottom: '10px', fontWeight: 600, transition: 'color 0.25s',
    fontFamily: 'var(--fm)', textTransform: 'uppercase' as const,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#fff', display: 'flex', fontFamily: 'var(--fm)', position: 'relative', overflow: 'hidden' }}>

      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

      {/* Glow */}
      <div style={{ position: 'fixed', top: '20%', left: '60%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,0.02) 0%,transparent 70%)', pointerEvents: 'none' }} />

      {/* ── LEFT: branding ──────────────────────────────────────── */}
      <div className="auth-left-panel" style={{ width: 'clamp(280px,40vw,520px)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '60px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/slike/logopng.png" alt="LWL UP" width="173" height="52" style={{ height: '52px', marginBottom: '80px', display: 'block' }} />
          </Link>

          <div style={{ fontSize: '0.58rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.2)', marginBottom: '20px' }}>
            DOBRODOŠAO NAZAD
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,4vw,4rem)', fontWeight: 800, lineHeight: 0.88, letterSpacing: '-0.02em', margin: '0 0 32px' }}>
            PRIJAVA<br /><span style={{ color: 'rgba(255,255,255,0.2)' }}>U SUSTAV</span>
          </h1>

          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, maxWidth: '320px' }}>
            Prijavi se da pristupiš svom programu treninga, prati napredak i upravljaj treninzima.
          </p>
        </div>

        {/* Bottom stats */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {[['10+', 'ATLETA'], ['12', 'REKORDA']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.3em', marginTop: '4px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: form ─────────────────────────────────────────── */}
      <div className="auth-form-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', position: 'relative', zIndex: 1 }}>
        <div className="auth-form-inner" style={{ width: '100%', maxWidth: '440px', animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>

          {/* Title */}
          <div style={{ marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.25em', fontFamily: 'var(--fm)', color: '#fff' }}>
              {mode === 'login' ? 'PRIJAVA' : 'PROMJENA LOZINKE'}
            </div>
          </div>

          {mode === 'login' ? (
            <>
              {/* Login fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div>
                  <label style={lbl('email')}>Email adresa</label>
                  <input
                    name="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    placeholder="tvoj@email.com" style={inp('email')}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>

                <div>
                  <label style={lbl('password')}>Lozinka</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="password" type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                      placeholder="••••••••" style={{ ...inp('password'), paddingRight: '40px' }}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                    <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '4px', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.2)', color: 'rgba(255,100,100,0.9)', fontSize: '0.8rem', animation: 'fadeUp 0.2s ease' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ width: '100%', marginTop: '36px', padding: '18px', background: loading ? 'rgba(255,255,255,0.08)' : '#fff', color: loading ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.25em', fontFamily: 'var(--fm)', transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(255,255,255,0.15)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {loading
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> PRIJAVA...</>
                  : 'PRIJAVI SE →'
                }
              </button>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={() => { setMode('forgot'); setError(''); setResetSent(false) }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                >
                  ZABORAVILI STE LOZINKU?
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Forgot / reset fields */}
              {resetSent ? (
                <div style={{ padding: '24px', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', color: 'rgba(74,222,128,0.9)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  Email s uputama za promjenu lozinke poslan je na <strong>{email}</strong>. Provjeri inbox i klikni link.
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: '32px' }}>
                    Unesi svoju email adresu i poslat ćemo ti link za postavljanje nove lozinke.
                  </p>
                  <div>
                    <label style={lbl('email')}>Email adresa</label>
                    <input
                      name="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                      placeholder="tvoj@email.com" style={inp('email')}
                      onKeyDown={e => e.key === 'Enter' && handleForgot()}
                    />
                  </div>

                  {error && (
                    <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.2)', color: 'rgba(255,100,100,0.9)', fontSize: '0.8rem' }}>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleForgot}
                    disabled={loading}
                    style={{ width: '100%', marginTop: '36px', padding: '18px', background: loading ? 'rgba(255,255,255,0.08)' : '#fff', color: loading ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.25em', fontFamily: 'var(--fm)', transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(255,255,255,0.15)' } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {loading
                      ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> SLANJE...</>
                      : 'POŠALJI LINK →'
                    }
                  </button>
                </>
              )}

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button
                  onClick={() => { setMode('login'); setError(''); setResetSent(false) }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                >
                  <ArrowLeft size={12} /> NATRAG NA PRIJAVU
                </button>
              </div>
            </>
          )}

          {/* Back link (only on login mode) */}
          {mode === 'login' && (
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontSize: '0.68rem', letterSpacing: '0.2em', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
              >
                <ArrowLeft size={12} /> NATRAG NA POČETAK
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.12); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin   { to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
          .auth-form-panel {
            padding: 48px 24px !important;
            align-items: center !important;
          }
          .auth-form-inner {
            max-width: 100% !important;
          }
        }
        @media (max-width: 400px) {
          .auth-form-panel {
            padding: 40px 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
