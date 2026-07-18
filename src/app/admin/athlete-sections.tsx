'use client'
// LWL UP · ADMIN OS — samostalne sekcije po lifteru za novi sidebar:
// Bilješke, Tjelesna težina, Unos tekućine, Prehrana & kalorije, Wellbeing.
// Sve čitaju stvarne podatke koje lifter upisuje u /training.
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, ChevronDown } from 'lucide-react'
import { LineChart } from './admin-os-charts'

const supabase = createClient()
const fmtDate = (d: string) => { const p = d.split('-'); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0].slice(2)}` : d }

function useRows(load: () => Promise<any[]>, deps: any[]) {
  const [rows, setRows] = useState<any[] | null>(null)
  const reload = useCallback(() => { load().then(setRows) }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRows(null); reload() }, [reload])
  return { rows, reload }
}

const Loading = () => <div className="os-empty" style={{ display: 'flex', justifyContent: 'center' }}><Loader2 size={18} className="os-spin" /></div>

// ── Bilješke (athlete_notes — bilješke trenera/admina o lifteru) ──
export function NotesSection({ athleteId, adminId }: { athleteId: string; adminId: string }) {
  const { rows, reload } = useRows(
    async () => (await supabase.from('athlete_notes').select('id, title, content, created_at, admin_id').eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(200)).data ?? [],
    [athleteId]
  )
  const [title, setTitle] = useState('')
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const add = async () => {
    if (!title.trim() || !txt.trim()) return
    setBusy(true)
    const { error } = await supabase.from('athlete_notes').insert({ athlete_id: athleteId, admin_id: adminId, title: title.trim(), content: txt.trim() })
    setBusy(false)
    if (error) { alert(`Greška pri spremanju bilješke: ${error.message}`); return }
    setTitle(''); setTxt(''); reload()
  }
  const del = async (id: string) => {
    if (!confirm('Obrisati bilješku?')) return
    const { error } = await supabase.from('athlete_notes').delete().eq('id', id)
    if (error) { alert(`Greška: ${error.message}`); return }
    reload()
  }
  // stare bilješke bez naslova: prva linija sadržaja kao naslov
  const noteTitle = (n: any) => n.title || String(n.content ?? '').split('\n')[0].slice(0, 60) || 'Bilješka'
  return (
    <div className="grid c1">
      <div className="card">
        <div className="card-head"><span className="t">Nova bilješka</span></div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Naslov bilješke"
          style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', padding: '11px 14px', fontSize: 14, fontWeight: 600, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
        <textarea value={txt} onChange={e => setTxt(e.target.value)} placeholder="Zapiši opažanje o lifteru — tehnika, plan, dogovor s treninga…"
          style={{ width: '100%', minHeight: 90, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', padding: '12px 14px', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button className="btn-a accent" disabled={busy || !title.trim() || !txt.trim()} onClick={add}><Plus size={14} /> {busy ? 'Spremam…' : 'Spremi bilješku'}</button>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="t">Bilješke</span></div>
        {!rows ? <Loading /> : rows.length === 0 ? <div className="os-empty">Nema bilješki. Zapiši prvu iznad.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((n: any) => {
              const open = openId === n.id
              return (
                <div key={n.id} style={{ borderTop: '1px solid var(--border)' }}>
                  {/* zatvoreno: samo naslov + datum — klik otvara sadržaj */}
                  <div onClick={() => setOpenId(open ? null : n.id)} role="button"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', cursor: 'pointer' }}>
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{noteTitle(n)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(String(n.created_at).slice(0, 10))}</span>
                    <button className="icon-sm danger" onClick={e => { e.stopPropagation(); del(n.id) }} title="Obriši bilješku"><Trash2 size={14} /></button>
                  </div>
                  {open && (
                    <div style={{ padding: '0 2px 14px 28px', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', color: 'var(--text-dim)' }}>{n.content}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tjelesna težina (pr_logs, notes='Tjelesna težina') ──
export function BwSection({ athleteId }: { athleteId: string }) {
  const { rows } = useRows(
    async () => (await supabase.from('pr_logs').select('id, date, weight_kg').eq('athlete_id', athleteId).eq('lift', 'other').eq('notes', 'Tjelesna težina').order('date', { ascending: true }).limit(400)).data ?? [],
    [athleteId]
  )
  if (!rows) return <Loading />
  if (rows.length === 0) return <div className="os-empty">Lifter još nije unio tjelesnu težinu.</div>
  const series = rows.map((r: any) => Number(r.weight_kg))
  const dates = rows.map((r: any) => fmtDate(r.date))
  const last = series[series.length - 1], first = series[0]
  return (
    <div className="grid c1">
      <div className="card">
        <div className="card-head"><span className="t">Trend tjelesne težine</span></div>
        {series.length < 2 ? <div className="os-empty">Premalo unosa za graf</div>
          : <LineChart data={series} dates={dates} labels={[dates[0], dates[dates.length - 1]]} accent height={220} />}
        <div className="readout" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="cell"><div className="k">Trenutno</div><div className="v">{last}<small> kg</small></div></div>
          <div className="cell"><div className="k">Promjena</div><div className="v" style={{ color: 'var(--text-dim)' }}>{(last - first).toFixed(1)} kg</div></div>
          <div className="cell"><div className="k">Unosa</div><div className="v">{rows.length}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="t">Svi unosi</span></div>
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {[...rows].reverse().map((r: any) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 2px', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{fmtDate(r.date)}</span><span style={{ fontWeight: 700 }}>{r.weight_kg} kg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Unos tekućine (water_logs) ──
export function WaterSection({ athleteId }: { athleteId: string }) {
  const { rows } = useRows(
    async () => (await supabase.from('water_logs').select('id, log_date, amount_ml').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(200)).data ?? [],
    [athleteId]
  )
  if (!rows) return <Loading />
  // zbroji po danu (može biti više unosa dnevno)
  const byDay: Record<string, number> = {}
  for (const r of rows) byDay[r.log_date] = (byDay[r.log_date] ?? 0) + Number(r.amount_ml)
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]))
  if (days.length === 0) return <div className="os-empty">Lifter još nije unio tekućinu.</div>
  const last7 = days.slice(0, 7)
  const avg7 = last7.reduce((s, [, ml]) => s + ml, 0) / last7.length
  const maxMl = Math.max(...days.map(([, ml]) => ml), 3000)
  return (
    <div className="grid c1">
      <div className="card">
        <div className="card-head"><span className="t">Unos tekućine</span></div>
        <div className="readout" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 14 }}>
          <div className="cell"><div className="k">Danas</div><div className="v">{((byDay[new Date().toISOString().slice(0, 10)] ?? 0) / 1000).toFixed(1)}<small> L</small></div></div>
          <div className="cell"><div className="k">Prosjek · 7d</div><div className="v">{(avg7 / 1000).toFixed(1)}<small> L</small></div></div>
          <div className="cell"><div className="k">Dana praćeno</div><div className="v">{days.length}</div></div>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {days.map(([d, ml]) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 2px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', flex: '0 0 64px' }}>{fmtDate(d)}</span>
              <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (ml / maxMl) * 100)}%`, height: '100%', background: '#38bdf8', borderRadius: 4 }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700, flex: '0 0 52px', textAlign: 'right' }}>{(ml / 1000).toFixed(1)} L</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Prehrana i kalorije (nutrition_logs) ──
export function NutritionSection({ athleteId }: { athleteId: string }) {
  const { rows } = useRows(
    async () => (await supabase.from('nutrition_logs').select('id, date, day_type, calories, protein_g, carbs_g, fat_g, steps, notes').eq('user_id', athleteId).order('date', { ascending: false }).limit(120)).data ?? [],
    [athleteId]
  )
  if (!rows) return <Loading />
  if (rows.length === 0) return <div className="os-empty">Lifter još nije unio prehranu.</div>
  const m = rows[0]
  return (
    <div className="grid c1">
      <div className="card">
        <div className="card-head"><span className="t">Zadnji unos · {fmtDate(m.date)}{m.day_type ? ` · ${m.day_type}` : ''}</span></div>
        <div className="readout" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="cell"><div className="k">Kcal</div><div className="v">{m.calories ?? '—'}</div></div>
          <div className="cell"><div className="k">Protein</div><div className="v">{m.protein_g ?? '—'}<small> g</small></div></div>
          <div className="cell"><div className="k">UH</div><div className="v">{m.carbs_g ?? '—'}<small> g</small></div></div>
          <div className="cell"><div className="k">Masti</div><div className="v">{m.fat_g ?? '—'}<small> g</small></div></div>
          <div className="cell"><div className="k">Koraci</div><div className="v">{m.steps != null ? Number(m.steps).toLocaleString('hr') : '—'}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="t">Povijest</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr 1fr 1fr 1fr 1fr', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 4px 8px', borderBottom: '1px solid var(--border)' }}>
          <span>Datum</span><span style={{ textAlign: 'right' }}>kcal</span><span style={{ textAlign: 'right' }}>P</span><span style={{ textAlign: 'right' }}>UH</span><span style={{ textAlign: 'right' }}>M</span><span style={{ textAlign: 'right' }}>Koraci</span>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {rows.map((r: any) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 1fr 1fr 1fr 1fr', gap: 4, padding: '9px 4px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: 'var(--text-muted)' }}>{fmtDate(r.date)}</span>
              <span style={{ textAlign: 'right', fontWeight: 700 }}>{r.calories ?? '—'}</span>
              <span style={{ textAlign: 'right' }}>{r.protein_g ?? '—'}</span>
              <span style={{ textAlign: 'right' }}>{r.carbs_g ?? '—'}</span>
              <span style={{ textAlign: 'right' }}>{r.fat_g ?? '—'}</span>
              <span style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{r.steps != null ? Number(r.steps).toLocaleString('hr') : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Wellbeing (wellbeing_logs) ──
export function WellbeingSection({ athleteId }: { athleteId: string }) {
  const { rows } = useRows(
    async () => (await supabase.from('wellbeing_logs').select('id, log_date, sleep_hours, stress_level, caffeine_mg, notes').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(120)).data ?? [],
    [athleteId]
  )
  if (!rows) return <Loading />
  if (rows.length === 0) return <div className="os-empty">Lifter još nije unio wellbeing podatke.</div>
  const stressColor = (v: number) => v > 7 ? '#f87171' : v > 4 ? '#f59e0b' : '#4ade80'
  return (
    <div className="grid c1">
      <div className="card">
        <div className="card-head"><span className="t">Wellbeing dnevnik</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr 1fr 1fr', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 4px 8px', borderBottom: '1px solid var(--border)' }}>
          <span>Datum</span><span style={{ textAlign: 'right' }}>San (h)</span><span style={{ textAlign: 'right' }}>Stres</span><span style={{ textAlign: 'right' }}>Kofein (mg)</span>
        </div>
        <div style={{ maxHeight: 460, overflowY: 'auto' }}>
          {rows.map((r: any) => (
            <div key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr 1fr 1fr', gap: 4, padding: '9px 4px', fontFamily: 'var(--font-mono)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: 'var(--text-muted)' }}>{fmtDate(r.log_date)}</span>
                <span style={{ textAlign: 'right', fontWeight: 700 }}>{r.sleep_hours ?? '—'}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: r.stress_level != null ? stressColor(Number(r.stress_level)) : undefined }}>{r.stress_level != null ? `${r.stress_level}/10` : '—'}</span>
                <span style={{ textAlign: 'right' }}>{r.caffeine_mg ?? '—'}</span>
              </div>
              {r.notes && <div style={{ padding: '0 4px 9px', fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>"{r.notes}"</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
