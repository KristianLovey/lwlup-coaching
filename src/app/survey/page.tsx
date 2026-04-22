'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Send, Check } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
type FormData = {
  full_name: string; email: string; phone_number: string; age: string; gender: string; bodyweight: string
  experience: string; days_per_week: string; has_competed: string
  squat: string; bench: string; deadlift: string
  training_style: string; program_history: string; session_duration: string
  nutrition_quality: string; supplements: string; equipment: string
  recovery_habits: string; coaching_history: string
  goals: string; injuries: string; additional: string
  chosen_coach: string
}

const EMPTY: FormData = {
  full_name: '', email: '', phone_number: '', age: '', gender: '', bodyweight: '',
  experience: '', days_per_week: '', has_competed: '',
  squat: '', bench: '', deadlift: '',
  training_style: '', program_history: '', session_duration: '',
  nutrition_quality: '', supplements: '', equipment: '',
  recovery_habits: '', coaching_history: '',
  goals: '', injuries: '', additional: '',
  chosen_coach: '',
}

const BASE_STEPS = ['OSOBNO', 'TRENING', 'PRs', 'CILJEVI']
const ADVANCED_STEPS = ['OSOBNO', 'TRENING', 'PRs', 'NAPREDNI', 'CILJEVI']

// ── Validation helpers ─────────────────────────────────────────────
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
const isValidPhone = (v: string) => !v.trim() || /^[0-9\s\+\-\(\)]{6,20}$/.test(v.trim())

// Parse comma-or-dot decimal string → number
const parseWeight = (v: string): number => {
  const normalized = v.replace(',', '.')
  return parseFloat(normalized)
}

// Check lift value: must be > 0 and a multiple of 0.5
const isValidLift = (v: string): boolean => {
  if (!v.trim()) return false
  const n = parseWeight(v)
  if (isNaN(n) || n <= 0) return false
  return Math.round(n * 2) === n * 2 // multiple of 0.5
}

// Allow only digits, one comma or dot, max one decimal place that's 0 or 5
const filterLiftInput = (raw: string): string => {
  // Allow digits, comma, dot — strip everything else
  let v = raw.replace(/[^0-9.,]/g, '')
  // Only one decimal separator
  const firstComma = v.indexOf(',')
  const firstDot = v.indexOf('.')
  if (firstComma !== -1 && firstDot !== -1) {
    // Keep whichever came first, remove the other
    if (firstComma < firstDot) v = v.replace(/\./g, '')
    else v = v.replace(/,/g, '')
  }
  // Max one separator
  const sep = v.includes(',') ? ',' : v.includes('.') ? '.' : null
  if (sep) {
    const parts = v.split(sep)
    v = parts[0] + sep + (parts.slice(1).join(''))
    // Max 1 decimal digit
    if (parts[1] !== undefined) v = parts[0] + sep + parts[1].slice(0, 1)
  }
  return v
}

// Compute total respecting 0.5 increments
const computeTotal = (s: string, b: string, d: string): number | null => {
  if (!s || !b || !d) return null
  const vals = [parseWeight(s), parseWeight(b), parseWeight(d)]
  if (vals.some(isNaN)) return null
  const t = vals.reduce((a, c) => a + c, 0)
  return Math.round(t * 2) / 2 // round to nearest 0.5
}

// ── Animated counter ───────────────────────────────────────────────
function Counter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const diff = value - start
    if (diff === 0) return
    const duration = 600
    const startTime = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      const raw = start + diff * ease
      // Display in 0.5 increments
      setDisplay(Math.round(raw * 2) / 2)
      if (t < 1) requestAnimationFrame(tick)
      else prev.current = value
    }
    requestAnimationFrame(tick)
  }, [value])
  // Show .5 only if needed
  return <>{display % 1 === 0 ? display : display.toFixed(1).replace('.', ',')}</>
}

export default function SurveyPage() {
  const [showIntro, setShowIntro] = useState(true)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [animating, setAnimating] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState<string | null>(null)
  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const contentRef = useRef<HTMLDivElement>(null)

  const isAdvanced = form.experience === 'Napredni'
  const STEPS = isAdvanced ? ADVANCED_STEPS : BASE_STEPS

  const set = (k: keyof FormData, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    // Clear error on change
    if (fieldErrors[k]) setFieldErrors(p => ({ ...p, [k]: undefined }))
  }

  const setLift = (k: keyof FormData, raw: string) => {
    set(k, filterLiftInput(raw))
  }

  // Validate step 0 fields and return whether valid
  const validateStep0 = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.full_name.trim()) errs.full_name = 'Unesi ime i prezime'
    if (!form.email.trim()) errs.email = 'Unesi email adresu'
    else if (!isValidEmail(form.email)) errs.email = 'Email nije ispravan (npr. ime@domena.com)'
    if (form.phone_number && !isValidPhone(form.phone_number)) errs.phone_number = 'Telefon smije sadržavati samo brojeve'
    if (!form.age.trim() || isNaN(Number(form.age)) || Number(form.age) < 10 || Number(form.age) > 100) errs.age = 'Unesi ispravnu dob'
    if (!form.gender) errs.gender = 'Odaberi spol'
    if (!form.bodyweight.trim() || isNaN(Number(form.bodyweight)) || Number(form.bodyweight) <= 0) errs.bodyweight = 'Unesi ispravnu težinu'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {}
    ;(['squat', 'bench', 'deadlift'] as const).forEach(k => {
      if (!form[k].trim()) {
        errs[k] = 'Unesi vrijednost'
      } else if (!isValidLift(form[k])) {
        errs[k] = 'Mora biti > 0, u koracima od 0,5 kg'
      }
    })
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const canNext = () => {
    if (step === 0) return !!(form.full_name && form.email && form.age && form.gender && form.bodyweight)
    if (step === 1) return !!(form.experience && form.days_per_week)
    if (step === 2) return !!(form.squat && form.bench && form.deadlift)
    if (step === 3 && isAdvanced) return !!(form.training_style && form.nutrition_quality)
    return true
  }

  const navigate = (newStep: number) => {
    if (animating) return
    // Run validation before proceeding forward
    if (newStep > step) {
      if (step === 0 && !validateStep0()) return
      if (step === 2 && !validateStep2()) return
    }
    setDir(newStep > step ? 1 : -1)
    setAnimating(true)
    setTimeout(() => {
      setStep(newStep)
      setAnimating(false)
    }, 320)
  }

  const submit = async () => {
    setSending(true)
    setError('')
    // Normalise comma decimals to dots before sending
    const payload = { ...form }
    ;(['squat', 'bench', 'deadlift', 'bodyweight'] as const).forEach(k => {
      payload[k] = payload[k].replace(',', '.')
    })
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError('Greška pri slanju. Pokušaj ponovo.')
    } finally {
      setSending(false)
    }
  }

  const totalVal = computeTotal(form.squat, form.bench, form.deadlift)
  const totalDisplay = totalVal !== null ? totalVal : 0

  // ── Shared styles ────────────────────────────────────────────────
  const inp = (name: string, hasError?: boolean): React.CSSProperties => ({
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: `1px solid ${hasError ? 'rgba(255,80,80,0.8)' : focused === name ? '#fff' : 'rgba(255,255,255,0.22)'}`,
    color: '#fff', fontSize: '1rem', padding: '14px 0', outline: 'none',
    transition: 'border-color 0.25s', fontFamily: "'Barlow', sans-serif",
    boxSizing: 'border-box', letterSpacing: '0.02em',
  })

  const lbl = (name: string, hasError?: boolean): React.CSSProperties => ({
    display: 'block', fontSize: '0.58rem', letterSpacing: '0.4em',
    color: hasError ? 'rgba(255,100,100,0.9)' : focused === name ? '#fff' : 'rgba(255,255,255,0.55)',
    marginBottom: '10px', fontWeight: 600, transition: 'color 0.25s',
    fontFamily: "'Barlow', sans-serif", textTransform: 'uppercase',
  })

  const errMsg = (msg?: string) => msg ? (
    <div style={{ fontSize: '0.65rem', color: 'rgba(255,100,100,0.85)', marginTop: '6px', letterSpacing: '0.04em', fontFamily: "'Barlow',sans-serif" }}>
      ↑ {msg}
    </div>
  ) : null

  const ff = {
    onFocus: (e: React.FocusEvent<any>) => setFocused(e.target.name),
    onBlur: () => setFocused(null),
  }

  const chipBtn = (val: string, current: string, wide = false): React.CSSProperties => ({
    padding: wide ? '12px 28px' : '11px 20px',
    background: current === val ? '#fff' : 'rgba(255,255,255,0.04)',
    color: current === val ? '#000' : 'rgba(255,255,255,0.7)',
    border: `1px solid ${current === val ? '#fff' : 'rgba(255,255,255,0.18)'}`,
    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
    letterSpacing: '0.08em', transition: 'all 0.2s',
    fontFamily: "'Barlow', sans-serif",
  })

  const ratingBtn = (val: string, current: string, color: string): React.CSSProperties => ({
    flex: 1, padding: '12px 8px', textAlign: 'center' as const,
    background: current === val ? color : 'rgba(255,255,255,0.03)',
    color: current === val ? '#000' : 'rgba(255,255,255,0.45)',
    border: `1px solid ${current === val ? color : 'rgba(255,255,255,0.08)'}`,
    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
    letterSpacing: '0.06em', transition: 'all 0.2s',
    fontFamily: "'Barlow', sans-serif",
  })

  // ── Success screen ───────────────────────────────────────────────
  if (sent) return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow', sans-serif", overflow: 'hidden', position: 'relative' }}>
      <div className="star-field" />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px', maxWidth: '560px', animation: 'successIn 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 48px' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="1.5"
              strokeDasharray="289" strokeDashoffset="0"
              style={{ animation: 'drawCircle 1s cubic-bezier(0.16,1,0.3,1) forwards' }} />
            <polyline points="28,52 44,68 72,36" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="60" strokeDashoffset="0"
              style={{ animation: 'drawCheck 0.5s 0.6s cubic-bezier(0.16,1,0.3,1) both' }} />
          </svg>
        </div>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>PRIJAVA ZAPRIMLJENA</div>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(3rem,8vw,5rem)', fontWeight: 800, lineHeight: 0.9, marginBottom: '24px', letterSpacing: '-0.01em' }}>
          DOBRODOŠAO<br /><span style={{ color: 'rgba(255,255,255,0.25)' }}>U SUSTAV</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, marginBottom: '48px', fontSize: '1rem' }}>
          Tvoja prijava je uspješno zaprimljena.<br />
          Javit ćemo ti se u najkraćem mogućem roku i dogovoriti sljedeće korake.
        </p>
        {totalVal !== null && totalVal > 0 && (
          <div className="survey-success-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '48px' }}>
            {[['SQUAT', form.squat], ['BENCH', form.bench], ['DEAD', form.deadlift], ['TOTAL', String(totalVal)]].map(([l, v]) => (
              <div key={l} style={{ padding: '20px 12px', background: '#060606', textAlign: 'center' }}>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>{l}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Barlow Condensed',sans-serif" }}>
                  {v.replace('.', ',')}<span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: '2px' }}>kg</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '16px 48px', background: '#fff', color: '#000', border: 'none', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.25em', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >NATRAG NA POČETAK</button>
        </Link>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap');
        body { margin: 0; background: #060606; }
        @keyframes successIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes drawCircle { from { stroke-dashoffset: 289; } to { stroke-dashoffset: 0; } }
        @keyframes drawCheck { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  )

  // ── Intro screen ─────────────────────────────────────────────────
  if (showIntro) return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#fff', fontFamily: "'Barlow', sans-serif", position: 'relative', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="star-field" />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(20px,5vw,60px)', background: 'rgba(6,6,6,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/slike/logopng.png" alt="LWL UP" width="82" height="60" style={{ height: '60px' }} />
        </Link>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.7rem', letterSpacing: '0.25em', fontWeight: 600, fontFamily: "'Barlow',sans-serif" }}>
          <ArrowLeft size={13} /> NATRAG
        </Link>
      </nav>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(90px,12vh,120px) clamp(20px,5vw,60px) 60px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '620px', width: '100%', animation: 'successIn 0.7s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>LWL UP · PRIJAVA</div>
          <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(2.8rem,8vw,5rem)', fontWeight: 800, lineHeight: 0.9, marginBottom: '24px', letterSpacing: '-0.01em' }}>
            POSTANI DIO<br /><span style={{ color: 'rgba(255,255,255,0.22)' }}>LWL UP TIMA</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.85, marginBottom: '48px', fontWeight: 300 }}>
            Ispunit ćeš kratki upitnik koji pomaže treneru da bolje razumije tvoje iskustvo, ciljeve i fizičke karakteristike. Na temelju tvojih odgovora, kontaktirat ćemo te i dogovoriti sve detalje.
          </p>

          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', fontWeight: 700 }}>ODABERI TRENERA</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { name: 'Walter', desc: 'Specijalist za tehniku i snagu' },
                { name: 'Grezina', desc: 'Fokus na napredak i natjecanja' },
              ].map(({ name, desc }) => (
                <button key={name} onClick={() => setForm(p => ({ ...p, chosen_coach: name }))}
                  style={{ padding: '20px', background: form.chosen_coach === name ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${form.chosen_coach === name ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontFamily: "'Barlow',sans-serif", position: 'relative' }}>
                  {form.chosen_coach === name && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <Check size={14} color="rgba(255,255,255,0.7)" />
                    </div>
                  )}
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '6px', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.04em' }}>{name.toUpperCase()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { if (form.chosen_coach) setShowIntro(false) }}
            style={{ width: '100%', padding: '18px', background: form.chosen_coach ? '#fff' : 'rgba(255,255,255,0.06)', color: form.chosen_coach ? '#000' : 'rgba(255,255,255,0.2)', border: 'none', cursor: form.chosen_coach ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.25em', fontFamily: "'Barlow',sans-serif", transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            ZAPOČNI UPITNIK <ArrowRight size={14} />
          </button>
          {!form.chosen_coach && (
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
              Odaberi trenera za nastavak
            </div>
          )}
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap');
        body { margin: 0; background: #060606; }
        @keyframes successIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )

  // ── Main form ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#fff', fontFamily: "'Barlow', sans-serif", position: 'relative', overflowX: 'hidden' }}>
      <div className="star-field" />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '20%', right: '-5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,0.04) 0%,transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,0.02) 0%,transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(20px,5vw,60px)', background: 'rgba(6,6,6,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/slike/logopng.png" alt="LWL UP" width="82" height="60" style={{ height: '60px' }} />
        </Link>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.7rem', letterSpacing: '0.25em', fontWeight: 600, transition: '0.2s', fontFamily: "'Barlow',sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
        ><ArrowLeft size={13} /> NATRAG</Link>
      </nav>

      {/* LAYOUT */}
      <div className="survey-layout" style={{ display: 'grid', gridTemplateColumns: 'clamp(200px,28vw,340px) 1fr', minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* LEFT SIDEBAR */}
        <div className="survey-sidebar" style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '100px 40px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          <div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.45)', marginBottom: '40px' }}>PRISTUP PROGRAMU</div>
            <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(2.2rem,3.5vw,3.2rem)', fontWeight: 800, lineHeight: 0.92, marginBottom: '32px', letterSpacing: '-0.01em' }}>
              POSTANI DIO<br /><span style={{ color: 'rgba(255,255,255,0.2)' }}>LWL UP<br />TIMA</span>
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: '48px' }}>
              Ispuni kratki upitnik. Javit ćemo ti se i dogovoriti sve detalje.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {STEPS.map((s, i) => (
                <div key={s + i} style={{ display: 'flex', alignItems: 'stretch', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: i < step ? '#fff' : i === step ? 'rgba(255,255,255,0.12)' : 'transparent', border: i === step ? '1px solid rgba(255,255,255,0.5)' : i < step ? 'none' : '1px solid rgba(255,255,255,0.1)', transition: 'all 0.4s' }}>
                      {i < step
                        ? <Check size={12} color="#000" strokeWidth={3} />
                        : <span style={{ fontSize: '0.6rem', fontWeight: 800, color: i === step ? '#fff' : 'rgba(255,255,255,0.2)', fontFamily: "'Barlow',sans-serif" }}>{i + 1}</span>
                      }
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: '1px', flex: 1, minHeight: '32px', background: i < step ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)', transition: 'background 0.4s', margin: '4px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < STEPS.length - 1 ? '32px' : '0', paddingTop: '4px' }}>
                    <div style={{ fontSize: '0.65rem', letterSpacing: '0.25em', fontWeight: 700, color: i === step ? '#fff' : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)', transition: 'color 0.4s' }}>
                      {s}
                      {s === 'NAPREDNI' && <span style={{ marginLeft: '8px', fontSize: '0.5rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.07)', padding: '2px 6px' }}>EXTRA</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalDisplay > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '24px', animation: 'fadeUp 0.4s ease' }}>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>TVOJ TOTAL</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
                <Counter value={totalDisplay} /><span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>kg</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: FORM */}
        <div style={{ padding: 'clamp(90px,10vh,120px) clamp(24px,6vw,80px) 80px', overflow: 'hidden', position: 'relative' }}>

          {/* Mobile step indicator — only visible on small screens */}
          <div className="survey-mobile-steps">
            {STEPS.map((s, i) => (
              <div key={s + i} className="survey-mobile-step" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: i < step ? '#fff' : i === step ? 'rgba(255,255,255,0.12)' : 'transparent', border: i === step ? '1px solid rgba(255,255,255,0.5)' : i < step ? 'none' : '1px solid rgba(255,255,255,0.1)', fontSize: '0.55rem', fontWeight: 800, color: i === step ? '#fff' : i < step ? '#000' : 'rgba(255,255,255,0.2)', fontFamily: "'Barlow',sans-serif" }}>
                  {i < step ? <Check size={10} color="#000" strokeWidth={3} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: '1px', background: i < step ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)' }} />}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </div>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }}>
                <div style={{ height: '100%', width: `${((step + 1) / STEPS.length) * 100}%`, background: '#fff', transition: '0.6s cubic-bezier(0.16,1,0.3,1)' }} />
              </div>
            </div>
          </div>

          {/* Animated step content */}
          <div ref={contentRef} style={{
            animation: animating
              ? `stepOut${dir > 0 ? 'Left' : 'Right'} 0.32s cubic-bezier(0.4,0,1,1) forwards`
              : `stepIn${dir > 0 ? 'Right' : 'Left'} 0.45s cubic-bezier(0.16,1,0.3,1) forwards`,
            maxWidth: '540px',
          }}>

            {/* ── STEP 0: OSOBNI PODACI ─────────────────────── */}
            {step === 0 && (
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: 800, lineHeight: 0.9, marginBottom: '48px', letterSpacing: '-0.01em' }}>
                  UPOZNAJMO<br /><span style={{ color: 'rgba(255,255,255,0.22)' }}>SE</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div>
                    <label style={lbl('full_name', !!fieldErrors.full_name)}>Puno ime</label>
                    <input name="full_name" style={inp('full_name', !!fieldErrors.full_name)} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Ime i prezime" {...ff} />
                    {errMsg(fieldErrors.full_name)}
                  </div>
                  <div>
                    <label style={lbl('email', !!fieldErrors.email)}>Email adresa</label>
                    <input name="email" type="email" style={inp('email', !!fieldErrors.email)} value={form.email} onChange={e => set('email', e.target.value)} placeholder="tvoj@email.com" {...ff} />
                    {errMsg(fieldErrors.email)}
                  </div>
                  <div>
                    <label style={lbl('phone_number', !!fieldErrors.phone_number)}>Telefon</label>
                    <input name="phone_number" type="tel" style={inp('phone_number', !!fieldErrors.phone_number)} value={form.phone_number}
                      onChange={e => {
                        // Allow only digits, spaces, +, -, ()
                        const v = e.target.value.replace(/[^0-9\s\+\-\(\)]/g, '')
                        set('phone_number', v)
                      }}
                      placeholder="091 234 567" {...ff} />
                    {errMsg(fieldErrors.phone_number)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <label style={lbl('age', !!fieldErrors.age)}>Dob</label>
                      <input name="age" type="number" style={inp('age', !!fieldErrors.age)} value={form.age}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '')
                          set('age', v)
                        }}
                        placeholder="24" {...ff} />
                      {errMsg(fieldErrors.age)}
                    </div>
                    <div>
                      <label style={lbl('bodyweight', !!fieldErrors.bodyweight)}>Težina (kg)</label>
                      <input name="bodyweight" style={inp('bodyweight', !!fieldErrors.bodyweight)} value={form.bodyweight}
                        onChange={e => set('bodyweight', filterLiftInput(e.target.value))}
                        placeholder="83" {...ff} />
                      {errMsg(fieldErrors.bodyweight)}
                    </div>
                  </div>
                  <div>
                    <label style={lbl('gender', !!fieldErrors.gender)}>Spol</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {['Muško', 'Žensko', 'Drugo'].map(g => (
                        <button key={g} onClick={() => set('gender', g)} style={chipBtn(g, form.gender)}>{g}</button>
                      ))}
                    </div>
                    {errMsg(fieldErrors.gender)}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 1: TRENING ──────────────────────────── */}
            {step === 1 && (
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: 800, lineHeight: 0.9, marginBottom: '48px', letterSpacing: '-0.01em' }}>
                  TVOJ<br /><span style={{ color: 'rgba(255,255,255,0.25)' }}>TRENING</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
                  <div>
                    <label style={lbl('experience')}>Iskustvo u powerliftingu</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {[
                        { val: 'Početnik', sub: 'Manje od 1 godine' },
                        { val: 'Srednji', sub: '1–3 godine treninga' },
                        { val: 'Napredni', sub: '3+ godine, možda i natjecanja' },
                      ].map(({ val, sub }) => (
                        <button key={val} onClick={() => set('experience', val)} style={{
                          padding: '16px 20px', textAlign: 'left',
                          background: form.experience === val ? 'rgba(255,255,255,0.07)' : 'transparent',
                          border: `1px solid ${form.experience === val ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
                          cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Barlow',sans-serif",
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                          onMouseEnter={e => { if (form.experience !== val) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                          onMouseLeave={e => { if (form.experience !== val) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                        >
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>{val}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>{sub}</div>
                          </div>
                          {form.experience === val && <Check size={16} color="rgba(255,255,255,0.6)" />}
                        </button>
                      ))}
                    </div>
                    {form.experience === 'Napredni' && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', animation: 'fadeUp 0.3s ease' }}>
                        ↓ Dodat ćemo ti dodatni korak s naprednijim pitanjima
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={lbl('days_per_week')}>Dana tjedno</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {['2', '3', '4', '5', '6'].map(d => (
                        <button key={d} onClick={() => set('days_per_week', d)} style={{
                          width: '52px', height: '52px',
                          background: form.days_per_week === d ? '#fff' : 'transparent',
                          color: form.days_per_week === d ? '#000' : 'rgba(255,255,255,0.5)',
                          border: `1px solid ${form.days_per_week === d ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer', fontSize: '1.1rem', fontWeight: 800, transition: 'all 0.2s',
                          fontFamily: "'Barlow Condensed',sans-serif",
                        }}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl('has_competed')}>Natjecao/la si se?</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {['Da', 'Ne', 'Planiram'].map(v => (
                        <button key={v} onClick={() => set('has_competed', v)} style={chipBtn(v, form.has_competed, true)}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: PRs ──────────────────────────────── */}
            {step === 2 && (
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: 800, lineHeight: 0.9, marginBottom: '16px', letterSpacing: '-0.01em' }}>
                  TVOJE<br /><span style={{ color: 'rgba(255,255,255,0.25)' }}>BROJKE</span>
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', lineHeight: 1.7 }}>
                  Unesi procijenjene 1RM maksimale ili zadnji težak set.
                </p>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginBottom: '36px', letterSpacing: '0.05em' }}>
                  Decimale upiši zarezom — npr. <span style={{ color: 'rgba(255,255,255,0.4)' }}>142,5</span>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {([
                    { key: 'squat', label: 'Squat' },
                    { key: 'bench', label: 'Bench Press' },
                    { key: 'deadlift', label: 'Deadlift' },
                  ] as { key: keyof FormData; label: string }[]).map(f => (
                    <div key={f.key}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'end' }}>
                        <div>
                          <label style={lbl(f.key, !!fieldErrors[f.key])}>{f.label}</label>
                          <input
                            name={f.key}
                            inputMode="decimal"
                            style={inp(f.key, !!fieldErrors[f.key])}
                            value={form[f.key]}
                            onChange={e => setLift(f.key, e.target.value)}
                            placeholder="0"
                            {...ff}
                          />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', paddingBottom: '14px', letterSpacing: '0.1em' }}>KG</div>
                      </div>
                      {errMsg(fieldErrors[f.key])}
                    </div>
                  ))}

                  {totalVal !== null && totalVal > 0 && (
                    <div style={{ marginTop: '8px', padding: '20px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeUp 0.3s ease' }}>
                      <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.3)' }}>TOTAL</div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '2.2rem', fontWeight: 800 }}>
                        <Counter value={totalDisplay} /><span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>kg</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: NAPREDNI ─────────────────────────── */}
            {step === 3 && isAdvanced && (
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: 800, lineHeight: 0.9, marginBottom: '16px', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                  NAPREDNIJI<br /><span style={{ color: 'rgba(255,255,255,0.25)' }}>PROFIL</span>
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '40px', lineHeight: 1.7 }}>
                  Budući da imaš iskustva, želimo znati više kako bismo program što bolje prilagodili.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
                  <div>
                    <label style={lbl('training_style')}>Kakav tip treninga si dosad radio/la?</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {[
                        { val: 'Powerlifting specifičan', sub: 'SBD fokus, peaking, comp prep' },
                        { val: 'Powerbuilding', sub: 'Miks snage i hipertrofije' },
                        { val: 'General strength', sub: 'Strongman, Olympic, CrossFit...' },
                        { val: 'Autodidakt', sub: 'Sam/sama sastavljao/la trening' },
                      ].map(({ val, sub }) => (
                        <button key={val} onClick={() => set('training_style', val)} style={{
                          padding: '14px 18px', textAlign: 'left',
                          background: form.training_style === val ? 'rgba(255,255,255,0.07)' : 'transparent',
                          border: `1px solid ${form.training_style === val ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                          cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Barlow',sans-serif",
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                          onMouseEnter={e => { if (form.training_style !== val) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                          onMouseLeave={e => { if (form.training_style !== val) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{val}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
                          </div>
                          {form.training_style === val && <Check size={15} color="rgba(255,255,255,0.6)" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl('program_history')}>Koji programi / treneri su te oblikovali?</label>
                    <input name="program_history" style={inp('program_history')} value={form.program_history} onChange={e => set('program_history', e.target.value)} placeholder="npr. Sheiko, Juggernaut, Nučec, Sam..." {...ff} />
                  </div>
                  <div>
                    <label style={lbl('session_duration')}>Koliko traje tipična sesija?</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {['< 60 min', '60–90 min', '90–120 min', '2h+'].map(d => (
                        <button key={d} onClick={() => set('session_duration', d)} style={chipBtn(d, form.session_duration, true)}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl('nutrition_quality')}>Kako bi ocijenio/la svoju prehranu?</label>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      {[
                        { val: 'Kaotično', color: '#c0392b' },
                        { val: 'Solidno', color: '#e67e22' },
                        { val: 'Dobro', color: '#27ae60' },
                        { val: 'Trackam sve', color: '#2980b9' },
                      ].map(({ val, color }) => (
                        <button key={val} onClick={() => set('nutrition_quality', val)} style={ratingBtn(val, form.nutrition_quality, color)}>{val}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl('supplements')}>Koje suplemente koristiš?</label>
                    <input name="supplements" style={inp('supplements')} value={form.supplements} onChange={e => set('supplements', e.target.value)} placeholder="npr. Kreatin, protein, kofein, vitamini..." {...ff} />
                  </div>
                  <div>
                    <label style={lbl('equipment')}>Oprema koju koristiš / imaš</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {['Belt', 'Sleeves', 'Wraps', 'Suit', 'Shirt', 'Slingshot', 'Ništa'].map(eq => {
                        const selected = form.equipment.split(',').map(s => s.trim()).filter(Boolean)
                        const isSelected = selected.includes(eq)
                        return (
                          <button key={eq} onClick={() => {
                            const current = form.equipment.split(',').map(s => s.trim()).filter(Boolean)
                            if (eq === 'Ništa') { set('equipment', isSelected ? '' : 'Ništa') }
                            else {
                              const next = isSelected ? current.filter(x => x !== eq && x !== 'Ništa') : [...current.filter(x => x !== 'Ništa'), eq]
                              set('equipment', next.join(', '))
                            }
                          }} style={{ padding: '10px 18px', background: isSelected ? '#fff' : 'rgba(255,255,255,0.04)', color: isSelected ? '#000' : 'rgba(255,255,255,0.55)', border: `1px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', transition: 'all 0.2s', fontFamily: "'Barlow', sans-serif" }}>{eq}</button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={lbl('recovery_habits')}>Recovery navike</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {['Dovoljno spavam', 'Pratim stres', 'Deload tjedni', 'Masaže / PT', 'Sauna', 'Ništa posebno'].map(r => {
                        const selected = form.recovery_habits.split(',').map(s => s.trim()).filter(Boolean)
                        const isSelected = selected.includes(r)
                        return (
                          <button key={r} onClick={() => {
                            const current = form.recovery_habits.split(',').map(s => s.trim()).filter(Boolean)
                            const next = isSelected ? current.filter(x => x !== r) : [...current, r]
                            set('recovery_habits', next.join(', '))
                          }} style={{ padding: '10px 16px', background: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)', color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)', border: `1px solid ${isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)'}`, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, letterSpacing: '0.05em', transition: 'all 0.2s', fontFamily: "'Barlow', sans-serif" }}>{r}</button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={lbl('coaching_history')}>Jesi li imao/la trenera dosad?</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {['Da, online', 'Da, in-person', 'Nikad', 'Trenutno imam'].map(v => (
                        <button key={v} onClick={() => set('coaching_history', v)} style={chipBtn(v, form.coaching_history, true)}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3 (base) or 4 (advanced): CILJEVI ───── */}
            {((step === 3 && !isAdvanced) || (step === 4 && isAdvanced)) && (
              <div>
                <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: 800, lineHeight: 0.9, marginBottom: '16px', letterSpacing: '-0.01em' }}>
                  TVOJI<br /><span style={{ color: 'rgba(255,255,255,0.25)' }}>CILJEVI</span>
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '40px', lineHeight: 1.7 }}>
                  Ovo je opcionalno — ali što više znaš nam reći, bolje možemo prilagoditi program.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {[
                    { key: 'goals', label: 'Ciljevi', ph: 'npr. Natjecanje, povećati total za 50kg, naučiti tehniku...' },
                    { key: 'injuries', label: 'Ozljede ili ograničenja', ph: 'npr. Bol u koljenu, ozljeda ramena...' },
                    { key: 'additional', label: 'Dodatno (opcionalno)', ph: 'Sve što misliš da je bitno...' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={lbl(f.key)}>{f.label}</label>
                      <textarea name={f.key} value={(form as any)[f.key]}
                        onChange={e => set(f.key as keyof FormData, e.target.value)}
                        placeholder={f.ph} rows={3}
                        style={{ width: '100%', background: 'transparent', resize: 'vertical', border: `1px solid ${focused === f.key ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)'}`, color: '#fff', padding: '14px 16px', fontSize: '0.9rem', outline: 'none', fontFamily: "'Barlow',sans-serif", lineHeight: 1.7, transition: 'border-color 0.25s', boxSizing: 'border-box', marginTop: '8px' }}
                        onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── NAVIGATION ──────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '56px', maxWidth: '540px' }}>
            <button onClick={() => navigate(step - 1)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '13px 22px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', fontFamily: "'Barlow',sans-serif", transition: 'all 0.2s', visibility: step === 0 ? 'hidden' : 'visible' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
            ><ArrowLeft size={13} /> NATRAG</button>

            {step < STEPS.length - 1 ? (
              <button onClick={() => canNext() && navigate(step + 1)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: canNext() ? '#fff' : 'rgba(255,255,255,0.06)', color: canNext() ? '#000' : 'rgba(255,255,255,0.2)', border: 'none', padding: '15px 36px', cursor: canNext() ? 'pointer' : 'not-allowed', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.2em', fontFamily: "'Barlow',sans-serif", transition: 'all 0.25s' }}
                onMouseEnter={e => { if (canNext()) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(255,255,255,0.18)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >DALJE <ArrowRight size={13} /></button>
            ) : (
              <button onClick={submit} disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: sending ? 'rgba(255,255,255,0.08)' : '#fff', color: sending ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', padding: '15px 40px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.2em', fontFamily: "'Barlow',sans-serif", transition: 'all 0.25s' }}
                onMouseEnter={e => { if (!sending) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 35px rgba(255,255,255,0.2)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {sending
                  ? <><div style={{ width: '13px', height: '13px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> ŠALJE SE...</>
                  : <><Send size={13} /> POŠALJI PRIJAVU</>
                }
              </button>
            )}
          </div>

          {error && (
            <div style={{ marginTop: '16px', maxWidth: '540px', padding: '12px 18px', background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.2)', color: 'rgba(255,100,100,0.9)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060606; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        textarea { color: rgba(255,255,255,0.85) !important; }
        @keyframes stepOutLeft  { from{opacity:1;transform:translateX(0)}    to{opacity:0;transform:translateX(-40px)} }
        @keyframes stepOutRight { from{opacity:1;transform:translateX(0)}    to{opacity:0;transform:translateX(40px)} }
        @keyframes stepInRight  { from{opacity:0;transform:translateX(50px)} to{opacity:1;transform:translateX(0)} }
        @keyframes stepInLeft   { from{opacity:0;transform:translateX(-50px)}to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp       { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin         { to{transform:rotate(360deg)} }
        .survey-mobile-steps { display: none; }
        @media (max-width: 768px) {
          .survey-layout { grid-template-columns: 1fr !important; }
          .survey-sidebar { display: none !important; }
          .survey-mobile-steps {
            display: flex;
            align-items: center;
            gap: 0;
            margin-bottom: 28px;
          }
          .survey-mobile-step { flex: 1; }
          .survey-success-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 480px) {
          nav { padding: 0 16px !important; }
        }
      `}</style>
    </div>
  )
}