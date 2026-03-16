'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Pogrešan email ili lozinka.')
        setLoading(false)
        return
      }

      // Provjeri role u profiles tablici
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/training')
      }
    } catch {
      setError('Nešto je pošlo po krivu. Pokušaj ponovo.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Space Grotesk', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        zIndex: 0,
      }} />

      {/* Glow top-left */}
      <div style={{
        position: 'absolute',
        top: '-200px',
        left: '-200px',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      {/* Glow bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: '-200px',
        right: '-200px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      {/* Login container */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '460px',
        padding: '0 24px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <img
            src="/slike/logopng.png"
            alt="LWLUP"
            style={{ height: '70px', width: 'auto', marginBottom: '24px', filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.15))' }}
          />
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
            ATHLETE PORTAL
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '48px 40px',
          backdropFilter: 'blur(20px)',
        }}>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            marginBottom: '8px',
            lineHeight: 1.1,
          }}>
            DOBRODOŠAO<br />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.6rem' }}>NATRAG</span>
          </h1>

          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: '40px', letterSpacing: '0.05em' }}>
            Prijavi se kako bi pristupio svom treningu
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Email field */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '0.6rem',
                letterSpacing: '0.3em',
                color: focused === 'email' ? '#fff' : 'rgba(255,255,255,0.35)',
                marginBottom: '10px',
                transition: 'color 0.3s',
                fontWeight: 700,
              }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${focused === 'email' ? '#fff' : 'rgba(255,255,255,0.15)'}`,
                  color: '#fff',
                  fontSize: '1rem',
                  padding: '12px 0',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxSizing: 'border-box',
                }}
                placeholder="ime@primjer.com"
              />
            </div>

            {/* Password field */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '0.6rem',
                letterSpacing: '0.3em',
                color: focused === 'password' ? '#fff' : 'rgba(255,255,255,0.35)',
                marginBottom: '10px',
                transition: 'color 0.3s',
                fontWeight: 700,
              }}>
                LOZINKA
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${focused === 'password' ? '#fff' : 'rgba(255,255,255,0.15)'}`,
                  color: '#fff',
                  fontSize: '1rem',
                  padding: '12px 0',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxSizing: 'border-box',
                }}
                placeholder="••••••••"
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 80, 80, 0.9)',
                padding: '12px 16px',
                border: '1px solid rgba(255, 80, 80, 0.2)',
                background: 'rgba(255, 80, 80, 0.05)',
                letterSpacing: '0.05em',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '12px',
                padding: '18px',
                background: loading ? 'rgba(255,255,255,0.1)' : '#fff',
                color: loading ? 'rgba(255,255,255,0.4)' : '#000',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.3em',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                fontFamily: "'Space Grotesk', sans-serif",
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(255,255,255,0.2)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{
                    width: '14px', height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  PRIJAVA...
                </span>
              ) : 'PRIJAVI SE'}
            </button>

          </form>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: 'center',
          marginTop: '30px',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.15em',
        }}>
          PRISTUP SAMO ZA LWLUP ATLETE
        </p>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input::placeholder { color: rgba(255,255,255,0.15); }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}