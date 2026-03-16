'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, X } from 'lucide-react'

interface Exercise {
  id: string
  name: string
  category: string
  notes: string
  created_at: string
}

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  const categories = ['ALL', 'Primary Squat', 'Primary Bench', 'Primary Deadlift', 'Secondary Squat', 'Secondary Bench', 'Secondary Deadlift', 'Back Mid', 'Back Lats', 'Quads', 'Hamstring', 'Glute', 'Biceps Inner', 'Biceps Brachialis', 'Triceps Lateral', 'Triceps Medial', 'Delts Rear']

  useEffect(() => {
    fetchExercises()
  }, [])

  useEffect(() => {
    filterExercises()
  }, [selectedCategory, searchQuery, exercises])

  async function fetchExercises() {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true })

    setExercises(data || [])
  }

  function filterExercises() {
    let filtered = exercises

    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(ex => ex.category === selectedCategory)
    }

    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredExercises(filtered)
  }

  return (
    <div style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)' }}>
      
      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '80px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 60px',
        background: 'rgba(5,5,5,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)'
      }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:'15px', textDecoration:'none', color:'#fff' }}>
          <img src="/slike/logopng.png" alt="LWLUP" style={{ height:'60px', width:'auto' }} />
        </Link>

        <Link href="/training" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.75rem', letterSpacing: '0.2em', transition: '0.3s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <ArrowLeft size={14} /> TRAINING
        </Link>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: '140px', paddingBottom: '60px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 60px' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '15px' }}>
            POWERLIFTING KNOWLEDGE
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(4rem, 10vw, 8rem)', lineHeight: 0.9, marginBottom: '30px' }}>
            EXERCISE<br/>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>LIBRARY</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.5)', maxWidth: '600px', margin: '0 auto' }}>
            Potpuna baza vježbi s detaljnim tehničkim uputama i video materijalima.
          </p>
        </div>
      </section>

      {/* FILTERS */}
      <section style={{ padding: '0 60px 40px', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input 
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 12px 12px 45px', 
                background: '#0a0a0a', 
                border: '1px solid rgba(255,255,255,0.1)', 
                color: '#fff', 
                fontSize: '0.9rem',
                transition: '0.3s'
              }}
            />
          </div>

          <select 
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ 
              padding: '12px 20px', 
              background: '#0a0a0a', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: '#fff', 
              fontSize: '0.85rem',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
          Showing {filteredExercises.length} of {exercises.length} exercises
        </div>
      </section>

      {/* EXERCISE GRID */}
      <section style={{ padding: '0 60px 120px', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {filteredExercises.map(exercise => (
            <div
              key={exercise.id}
              onClick={() => setSelectedExercise(exercise)}
              className="exercise-card"
              style={{
                background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '30px',
                cursor: 'pointer',
                transition: '0.4s',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>
                {exercise.category}
              </div>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', marginBottom: '15px' }}>
                {exercise.name}
              </h3>
              {exercise.notes && (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {exercise.notes.substring(0, 100)}...
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* EXERCISE DETAIL MODAL */}
      {selectedExercise && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.95)', 
            zIndex: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '40px',
            backdropFilter: 'blur(10px)'
          }}
          onClick={() => setSelectedExercise(null)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              width: '100%', 
              maxWidth: '800px', 
              maxHeight: '90vh', 
              overflow: 'auto', 
              background: '#0a0a0a', 
              border: '1px solid rgba(255,255,255,0.1)', 
              padding: '50px',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setSelectedExercise(null)}
              style={{ position: 'absolute', top: '30px', right: '30px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
            >
              <X size={30} />
            </button>

            <div style={{ fontSize: '0.7rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '15px' }}>
              {selectedExercise.category}
            </div>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '3.5rem', marginBottom: '30px', lineHeight: 1 }}>
              {selectedExercise.name}
            </h2>

            <div style={{ width: '100%', height: '400px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}>VIDEO / GIF PLACEHOLDER</div>
                <div style={{ fontSize: '0.7rem' }}>Upload exercise demonstration</div>
              </div>
            </div>

            {selectedExercise.notes && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', marginBottom: '15px' }}>TECHNICAL NOTES</h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.7)' }}>
                  {selectedExercise.notes}
                </p>
              </div>
            )}

            <div style={{ padding: '25px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', marginBottom: '15px' }}>KEY POINTS</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#fff' }}>•</span>
                  Maintain proper form throughout the movement
                </li>
                <li style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#fff' }}>•</span>
                  Control the eccentric phase
                </li>
                <li style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#fff' }}>•</span>
                  Focus on mind-muscle connection
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&display=swap');
        :root { --fm: 'Space Grotesk', sans-serif; --fd: 'Space Grotesk', sans-serif; }
        
        .exercise-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  )
}