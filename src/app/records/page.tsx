'use client'
import { useState, useMemo } from 'react'
import Footer from '@/app/components/Footer'
import Navbar from '@/app/components/Navbar'
import { Search, Trophy } from 'lucide-react'

// Club members to highlight when they hold a record
const CLUB_MEMBERS = [
  'Walter Smajlović',
]

type RecordEntry = {
  lifter: string
  weight: number
  date: string
  fed: string
  clubRecord?: boolean // will be set automatically
}

type CategoryRecords = {
  squat: RecordEntry | null
  bench: RecordEntry | null
  deadlift: RecordEntry | null
  total: RecordEntry | null
}

type Records = {
  [weightClass: string]: CategoryRecords
}

const MEN_RECORDS: Records = {
  '53': {
    squat:    { lifter: 'Leon Hadeljan',     weight: 118,   date: '2021-12-18', fed: 'HPLS' },
    bench:    { lifter: 'Leon Hadeljan',     weight: 57.5,  date: '2021-12-18', fed: 'HPLS' },
    deadlift: { lifter: 'Leon Hadeljan',     weight: 118,   date: '2021-12-18', fed: 'HPLS' },
    total:    { lifter: 'Leon Hadeljan',     weight: 273.5, date: '2021-12-18', fed: 'HPLS' },
  },
  '59': {
    squat:    { lifter: 'Josip Kovač',      weight: 147.5, date: '2021-09-18', fed: 'HPLS' },
    bench:    { lifter: 'Josip Kovač',      weight: 100,   date: '2021-09-18', fed: 'HPLS' },
    deadlift: { lifter: 'Josip Kovač',      weight: 170,   date: '2021-09-18', fed: 'HPLS' },
    total:    { lifter: 'Josip Kovač',      weight: 417.5, date: '2021-09-18', fed: 'HPLS' },
  },
  '66': {
    squat:    { lifter: 'Luka Babić',       weight: 202.5, date: '2024-10-05', fed: 'EPF'  },
    bench:    { lifter: 'Miljenko Peček',   weight: 125,   date: '2017-06-24', fed: 'HPLS' },
    deadlift: { lifter: 'Eugen Čaušević',   weight: 220.5, date: '2025-05-30', fed: 'HPLS' },
    total:    { lifter: 'Luka Babić',       weight: 522.5, date: '2024-10-05', fed: 'EPF'  },
  },
  '74': {
    squat:    { lifter: 'Tea Kalogjera',    weight: 231,   date: '2021-12-18', fed: 'HPLS' },
    bench:    { lifter: 'Tea Kalogjera',    weight: 190,   date: '2021-12-18', fed: 'HPLS' },
    deadlift: { lifter: 'Alen Kurtović',     weight: 275,   date: '2022-03-12', fed: 'HPLS' },
    total:    { lifter: 'Tea Kalogjera',    weight: 617.5, date: '2024-07-23', fed: 'IPF'  },
  },
  '83': {
    squat:    { lifter: 'Walter Smajlović', weight: 285,   date: '2025-03-18', fed: 'EPF'  },
    bench:    { lifter: 'Tea Kalogjera',    weight: 182.5, date: '2022-03-12', fed: 'EPF'  },
    deadlift: { lifter: 'Luka Benčić',      weight: 305.5, date: '2025-05-30', fed: 'HPLS' },
    total:    { lifter: 'Walter Smajlović', weight: 735,   date: '2025-03-18', fed: 'EPF'  },
  },
  '93': {
    squat:    { lifter: 'Leonardo Blažeković', weight: 290, date: '2025-05-30', fed: 'HPLS' },
    bench:    { lifter: 'Leon Piškač',          weight: 188, date: '2023-12-18', fed: 'HPLS' },
    deadlift: { lifter: 'Leonardo Blažeković', weight: 325, date: '2025-05-30', fed: 'HPLS' },
    total:    { lifter: 'Leonardo Blažeković', weight: 782.5, date: '2025-05-30', fed: 'HPLS' },
  },
  '105': {
    squat:    { lifter: 'Karlo Mikešić',    weight: 315,   date: '2025-03-18', fed: 'EPF'  },
    bench:    { lifter: 'Gordan Klasić',    weight: 202.5, date: '2025-03-18', fed: 'EPF'  },
    deadlift: { lifter: 'Karlo Mikešić',    weight: 340,   date: '2024-12-20', fed: 'HPLS' },
    total:    { lifter: 'Karlo Mikešić',    weight: 805.5, date: '2024-12-20', fed: 'HPLS' },
  },
  '120': {
    squat:    { lifter: 'Karlo Mikešić',    weight: 310.5, date: '2025-05-30', fed: 'HPLS' },
    bench:    { lifter: 'Miro Novaković',   weight: 200.5, date: '2026-03-07', fed: 'HPLS' },
    deadlift: { lifter: 'Karlo Mikešić',    weight: 339.5, date: '2025-05-20', fed: 'HPLS' },
    total:    { lifter: 'Karlo Mikešić',    weight: 837.5, date: '2025-05-30', fed: 'HPLS' },
  },
  '120+': {
    squat:    { lifter: 'Ilija Petrovič',   weight: 325,   date: '2024-05-31', fed: 'HPLS' },
    bench:    { lifter: 'Jakov Tenšera',    weight: 206,   date: '2025-12-18', fed: 'HPLS' },
    deadlift: { lifter: 'Vinko Barić',      weight: 312.5, date: '2019-12-14', fed: 'HPLS' },
    total:    { lifter: 'Ilija Petrovič',   weight: 830,   date: '2024-05-31', fed: 'HPLS' },
  },
}

const WOMEN_RECORDS: Records = {
  '43': {
    squat:    null,
    bench:    null,
    deadlift: null,
    total:    null,
  },
  '47': {
    squat:    { lifter: 'Ira Tasić',        weight: 98,    date: '2024-12-20', fed: 'HPLS' },
    bench:    { lifter: 'Ira Tasić',        weight: 45.5,  date: '2024-12-20', fed: 'HPLS' },
    deadlift: { lifter: 'Ira Tasić',        weight: 140,   date: '2024-09-28', fed: 'HPLS' },
    total:    { lifter: 'Ira Tasić',        weight: 276,   date: '2024-12-20', fed: 'HPLS' },
  },
  '52': {
    squat:    { lifter: 'Tatjana Vugrinec', weight: 122.5, date: '2023-10-10', fed: 'EPF'  },
    bench:    { lifter: 'Anamaria Mamić',   weight: 65,    date: '2024-02-10', fed: 'HPLS' },
    deadlift: { lifter: 'Tatjana Vugrinec', weight: 147.5, date: '2023-10-10', fed: 'EPF'  },
    total:    { lifter: 'Tatjana Vugrinec', weight: 330,   date: '2023-10-10', fed: 'EPF'  },
  },
  '57': {
    squat:    { lifter: 'Teuta Jakupović',  weight: 157.5, date: '2025-03-18', fed: 'EPF'  },
    bench:    { lifter: 'Melisa Matulin',   weight: 90,    date: '2025-05-18', fed: 'IPF'  },
    deadlift: { lifter: 'Teuta Jakupović',  weight: 175,   date: '2025-12-18', fed: 'HPLS' },
    total:    { lifter: 'Teuta Jakupović',  weight: 420,   date: '2025-12-18', fed: 'HPLS' },
  },
  '63': {
    squat:    { lifter: 'Teuta Jakupović',  weight: 151.5, date: '2025-09-06', fed: 'HPLS' },
    bench:    { lifter: 'Melisa Matulin',   weight: 95.5,  date: '2025-12-18', fed: 'HPLS' },
    deadlift: { lifter: 'Lea Žunić',        weight: 182.5, date: '2025-06-08', fed: 'IPF'  },
    total:    { lifter: 'Melisa Matulin',   weight: 412.5, date: '2025-12-18', fed: 'HPLS' },
  },
  '69': {
    squat:    { lifter: 'Melanija Filipović', weight: 165, date: '2026-02-07', fed: 'HPLS' },
    bench:    { lifter: 'Matea Bumba',        weight: 95,  date: '2025-12-18', fed: 'HPLS' },
    deadlift: { lifter: 'Matea Bumba',        weight: 200, date: '2025-02-08', fed: 'HPLS' },
    total:    { lifter: 'Matea Bumba',        weight: 455, date: '2025-12-18', fed: 'HPLS' },
  },
  '76': {
    squat:    { lifter: 'Kristina Horvat',  weight: 170,   date: '2021-09-23', fed: 'IPF'  },
    bench:    { lifter: 'Kristina Horvat',  weight: 115,   date: '2021-09-23', fed: 'IPF'  },
    deadlift: { lifter: 'Kristina Horvat',  weight: 196,   date: '2025-12-18', fed: 'HPLS' },
    total:    { lifter: 'Kristina Horvat',  weight: 480,   date: '2021-09-23', fed: 'IPF'  },
  },
  '84': {
    squat:    { lifter: 'Tara Bače',        weight: 192.5, date: '2025-11-28', fed: 'EPF'  },
    bench:    { lifter: 'Marinela Fras',    weight: 112.5, date: '2022-12-17', fed: 'HPLS' },
    deadlift: { lifter: 'Tara Bače',        weight: 201,   date: '2025-12-18', fed: 'HPLS' },
    total:    { lifter: 'Tara Bače',        weight: 497.5, date: '2025-11-28', fed: 'EPF'  },
  },
  '84+': {
    squat:    { lifter: 'Josipa Radić',     weight: 168,   date: '2023-02-24', fed: 'HPLS' },
    bench:    { lifter: 'Tara Bače',        weight: 105,   date: '2025-11-28', fed: 'EPF'  },
    deadlift: { lifter: 'Ivana Ferhatbegović', weight: 170, date: '2018-06-16', fed: 'HPLS' },
    total:    { lifter: 'Josipa Radić',     weight: 417.5, date: '2023-02-24', fed: 'HPLS' },
  },
}

const MEN_CLASSES    = ['53','59','66','74','83','93','105','120','120+']
const WOMEN_CLASSES  = ['43','47','52','57','63','69','76','84','84+']
const LIFTS: { key: keyof CategoryRecords; label: string }[] = [
  { key: 'squat',    label: 'SQUAT'      },
  { key: 'bench',    label: 'BENCH PRESS' },
  { key: 'deadlift', label: 'DEADLIFT'   },
  { key: 'total',    label: 'TOTAL'      },
]

function isClubMember(name: string) {
  return CLUB_MEMBERS.some(m => name.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(name.toLowerCase()))
}

function RecordCell({ entry, highlight }: { entry: RecordEntry | null; highlight: boolean }) {
  if (!entry) {
    return (
      <td style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', textAlign: 'center' }}>
        —
      </td>
    )
  }

  const isClub = isClubMember(entry.lifter)
  const nameMatch = highlight && isClub

  return (
    <td style={{
      padding: '14px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: nameMatch ? 'rgba(250,204,21,0.06)' : 'transparent',
      transition: 'background 0.2s',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--fd)',
            fontSize: '1.1rem',
            fontWeight: 800,
            color: nameMatch ? '#facc15' : '#fff',
          }}>
            {entry.weight} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>kg</span>
          </span>
          {isClub && (
            <span style={{
              fontSize: '0.48rem', letterSpacing: '0.2em', padding: '2px 6px',
              background: 'rgba(250,204,21,0.15)', color: '#facc15',
              border: '1px solid rgba(250,204,21,0.3)', fontWeight: 700,
            }}>KLUB</span>
          )}
        </div>
        <span style={{ fontSize: '0.7rem', color: nameMatch ? 'rgba(250,204,21,0.8)' : 'rgba(255,255,255,0.5)', fontWeight: nameMatch ? 700 : 400 }}>
          {entry.lifter}
        </span>
        <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
          {new Date(entry.date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' })} · {entry.fed}
        </span>
      </div>
    </td>
  )
}

export default function RecordsPage() {
  const [gender, setGender] = useState<'men' | 'women'>('men')
  const [search, setSearch] = useState('')
  const [liftFilter, setLiftFilter] = useState<'all' | keyof CategoryRecords>('all')

  const records  = gender === 'men' ? MEN_RECORDS : WOMEN_RECORDS
  const classes  = gender === 'men' ? MEN_CLASSES : WOMEN_CLASSES
  const highlight = search.trim().length > 0

  const visibleLifts = liftFilter === 'all' ? LIFTS : LIFTS.filter(l => l.key === liftFilter)

  // Filter categories that match search
  const matchingClasses = useMemo(() => {
    if (!search.trim()) return classes
    const q = search.trim().toLowerCase()
    return classes.filter(cls => {
      const cat = records[cls]
      return LIFTS.some(l => {
        const e = cat?.[l.key]
        return e && e.lifter.toLowerCase().includes(q)
      })
    })
  }, [search, classes, records])

  return (
    <div style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>
      <Navbar variant="solid" simple />

      {/* HERO */}
      <section style={{ paddingTop: 'clamp(100px,14vw,150px)', paddingBottom: '40px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse at center top, rgba(255,255,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 clamp(16px,4vw,60px)', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.3)', marginBottom: '14px' }}>
            LWL UP · REKORDI
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(3rem,8vw,6rem)', lineHeight: 0.88, margin: '0 0 40px', letterSpacing: '-0.02em' }}>
            DRŽAVNI<br /><span style={{ color: 'rgba(255,255,255,0.18)' }}>REKORDI</span>
          </h1>

          {/* Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            {/* Gender toggle */}
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              {(['men','women'] as const).map((g) => (
                <button key={g} onClick={() => setGender(g)}
                  style={{
                    padding: '10px 24px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em',
                    cursor: 'pointer', fontFamily: 'var(--fm)', border: 'none', transition: 'all 0.2s',
                    background: gender === g ? '#fff' : 'transparent',
                    color: gender === g ? '#000' : 'rgba(255,255,255,0.4)',
                  }}>
                  {g === 'men' ? 'MUŠKARCI' : 'ŽENE'}
                </button>
              ))}
            </div>

            {/* Lift filter */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => setLiftFilter('all')}
                style={{ padding: '10px 16px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'var(--fm)', border: `1px solid ${liftFilter === 'all' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, background: liftFilter === 'all' ? 'rgba(255,255,255,0.08)' : 'transparent', color: liftFilter === 'all' ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
                SVE
              </button>
              {LIFTS.map(l => (
                <button key={l.key} onClick={() => setLiftFilter(l.key)}
                  style={{ padding: '10px 16px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'var(--fm)', border: `1px solid ${liftFilter === l.key ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, background: liftFilter === l.key ? 'rgba(255,255,255,0.08)' : 'transparent', color: liftFilter === l.key ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', flex: '0 0 auto', minWidth: '240px' }}>
              <Search size={14} color="rgba(255,255,255,0.3)" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pretraži po imenu..."
                style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.78rem', fontFamily: 'var(--fm)', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 clamp(16px,4vw,60px) 80px', position: 'relative', zIndex: 1 }}>
        {matchingClasses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.2)' }}>
            <Trophy size={36} style={{ opacity: 0.15, display: 'block', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.3em' }}>NEMA REZULTATA ZA "{search}"</div>
          </div>
        ) : (
          matchingClasses.map(cls => {
            const cat = records[cls]
            if (!cat) return null
            const hasAny = LIFTS.some(l => cat[l.key] !== null)

            return (
              <div key={cls} style={{ marginBottom: '32px' }}>
                {/* Weight class header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontFamily: 'var(--fd)', fontSize: '2.2rem', fontWeight: 800, color: 'rgba(255,255,255,0.1)', lineHeight: 1 }}>{cls}</span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>KG</span>
                  </div>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {!hasAny ? (
                  <div style={{ padding: '20px 0', color: 'rgba(255,255,255,0.15)', fontSize: '0.72rem', letterSpacing: '0.2em' }}>
                    NEMA UPISANIH REKORDI
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          {visibleLifts.map(l => (
                            <th key={l.key} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', fontWeight: 700, fontFamily: 'var(--fm)' }}>
                              {l.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {visibleLifts.map(l => {
                            const entry = cat[l.key]
                            const isHighlighted = highlight && !!entry && entry.lifter.toLowerCase().includes(search.trim().toLowerCase())
                            return (
                              <RecordCell key={l.key} entry={entry} highlight={isHighlighted} />
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>

      <Footer />

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        @media (max-width: 768px) {
          table { font-size: 0.85rem; }
        }
      `}</style>
    </div>
  )
}
