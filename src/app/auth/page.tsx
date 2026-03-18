'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'

const supabase = createClient()

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [focused, setFocused] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!email || !password) { setError('Popuni sve obavezne podatke.'); return }
    if (password.length < 6) { setError('Lozinka mora imati najmanje 6 znakova.'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/training')
      } else {
        if (!fullName.trim()) { setError('Unesi puno ime.'); setLoading(false); return }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        setSuccess('Račun kreiran! Provjeri email za potvrdu, zatim se prijavi.')
        setMode('login')
      }
    } catch (e: any) {
      const msg = e?.message ?? 'Greška. Pokušaj ponovo.'
      if (msg.includes('Invalid login')) setError('Pogrešan email ili lozinka.')
      else if (msg.includes('already registered')) setError('Email je već registriran. Prijavi se.')
      else setError(msg)
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
      <div style={{ width: 'clamp(280px,40vw,520px)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '60px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '52px', marginBottom: '80px', display: 'block' }} />
          </Link>

          <div style={{ fontSize: '0.58rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.2)', marginBottom: '20px' }}>
            {mode === 'login' ? 'DOBRODOŠAO NAZAD' : 'PRIDRUŽI SE'}
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,4vw,4rem)', fontWeight: 800, lineHeight: 0.88, letterSpacing: '-0.02em', margin: '0 0 32px' }}>
            {mode === 'login' ? <>PRIJAVA<br /><span style={{ color: 'rgba(255,255,255,0.2)' }}>U SUSTAV</span></> : <>NOVI<br /><span style={{ color: 'rgba(255,255,255,0.2)' }}>RAČUN</span></>}
          </h1>

          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, maxWidth: '320px' }}>
            {mode === 'login'
              ? 'Prijavi se da pristupiš svom programu treninga, prati napredak i upravljaj treninzima.'
              : 'Kreiraj račun i dobij pristup personaliziranom programu powerliftinga.'
            }
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '440px', animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{ padding: '12px 0', marginRight: '32px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.25em', fontFamily: 'var(--fm)', color: mode === m ? '#fff' : 'rgba(255,255,255,0.25)', borderBottom: `2px solid ${mode === m ? '#fff' : 'transparent'}`, marginBottom: '-1px', transition: 'all 0.2s' }}>
                {m === 'login' ? 'PRIJAVA' : 'REGISTRACIJA'}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {mode === 'register' && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <label style={lbl('fullName')}>Puno ime</label>
                <input
                  name="fullName" value={fullName} onChange={e => setFullName(e.target.value)}
                  onFocus={() => setFocused('fullName')} onBlur={() => setFocused(null)}
                  placeholder="Ime i prezime" style={inp('fullName')}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            )}

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

          {/* Error / success */}
          {error && (
            <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.2)', color: 'rgba(255,100,100,0.9)', fontSize: '0.8rem', animation: 'fadeUp 0.2s ease' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(39,174,96,0.07)', border: '1px solid rgba(39,174,96,0.2)', color: 'rgba(100,200,130,0.9)', fontSize: '0.8rem', animation: 'fadeUp 0.2s ease' }}>
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', marginTop: '36px', padding: '18px', background: loading ? 'rgba(255,255,255,0.08)' : '#fff', color: loading ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.25em', fontFamily: 'var(--fm)', transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(255,255,255,0.15)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            {loading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {mode === 'login' ? 'PRIJAVA...' : 'KREIRANJE...'}</>
              : mode === 'login' ? 'PRIJAVI SE →' : 'KREIRAJ RAČUN →'
            }
          </button>

          {/* Back link */}
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontSize: '0.68rem', letterSpacing: '0.2em', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
            >
              <ArrowLeft size={12} /> NATRAG NA POČETAK
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.12); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin   { to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          div[style*="clamp(280px,40vw"] { display: none !important; }
        }
      `}</style>
    </div>
  )
}