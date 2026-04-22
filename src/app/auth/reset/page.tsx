'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

const supabase = createClient()

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase sets the session from URL hash automatically on page load
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also check if already has a session (in case event fires before listener)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
  }, [])

  const inp = (name: string): React.CSSProperties => ({
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: `1px solid ${focused === name ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.12)'}`,
    color: '#fff', fontSize: '1rem', padding: '14px 0', outline: 'none',
    transition: 'border-color 0.25s', fontFamily: 'var(--fm)',
    boxSizing: 'border-box' as const, paddingRight: '40px',
  })

  const lbl = (name: string): React.CSSProperties => ({
    display: 'block', fontSize: '0.58rem', letterSpacing: '0.4em',
    color: focused === name ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
    marginBottom: '10px', fontWeight: 600, transition: 'color 0.25s',
    fontFamily: 'var(--fm)', textTransform: 'uppercase' as const,
  })

  const handleSubmit = async () => {
    setError('')
    if (!password || !confirm) { setError('Popuni oba polja.'); return }
    if (password.length < 6) { setError('Lozinka mora imati najmanje 6 znakova.'); return }
    if (password !== confirm) { setError('Lozinke se ne podudaraju.'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => router.push('/training'), 2500)
    } catch (e: any) {
      setError(e?.message ?? 'Greška. Pokušaj ponovo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fm)', position: 'relative', overflow: 'hidden', padding: '40px 24px' }}>

      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)', position: 'relative', zIndex: 1 }}>

        <Link href="/">
          <img src="/slike/logopng.png" alt="LWL UP" width="60" height="44" style={{ height: '44px', marginBottom: '48px', display: 'block' }} />
        </Link>

        <div style={{ marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.25em', color: '#fff' }}>
            NOVA LOZINKA
          </div>
        </div>

        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
            <CheckCircle2 size={48} style={{ color: '#4ade80' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>Lozinka uspješno promijenjena!</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>Preusmjeravamo te na trening...</div>
          </div>
        ) : !ready ? (
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', lineHeight: 1.7 }}>
            Učitavanje... Ako se stranica ne učita, klikni link iz emaila ponovo.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <label style={lbl('password')}>Nova lozinka</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                    placeholder="••••••••" style={inp('password')}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={lbl('confirm')}>Potvrdi lozinku</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'} value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)}
                    placeholder="••••••••" style={inp('confirm')}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                  <button onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.2)', color: 'rgba(255,100,100,0.9)', fontSize: '0.8rem' }}>
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
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> SPREMANJE...</>
                : 'SPREMI NOVU LOZINKU →'
              }
            </button>
          </>
        )}
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.12); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin   { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
