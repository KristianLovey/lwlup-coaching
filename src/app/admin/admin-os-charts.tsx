'use client'
// LWL UP · ADMIN OS — monochrome SVG charts (B&W + red accent)
// Pure presentational; all data comes from props (real Supabase aggregates).
import { useId, useState, useRef } from 'react'

const SERIES_COLORS = ['#6b8cff', '#22c55e', '#f59e0b', '#f472b6', '#fb923c', '#38bdf8', '#a78bfa', '#ef4444', '#10b981', '#eab308']

function pathFrom(data: number[], w: number, h: number, pad: number) {
  const min = Math.min(...data), max = Math.max(...data)
  const range = (max - min) || 1
  const X = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (w - 2 * pad)
  const Y = (v: number) => h - pad - ((v - min) / range) * (h - 2 * pad)
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')
  const area = line + ` L${X(data.length - 1).toFixed(1)},${h - pad} L${X(0).toFixed(1)},${h - pad} Z`
  return { line, area, X, Y }
}

export function Spark({ data, accent = false, height = 56 }: { data: number[]; accent?: boolean; height?: number }) {
  const w = 200, h = height, pad = 6
  const gid = useId().replace(/:/g, '')
  if (!data || data.length < 2) return <svg width="100%" height={h} />
  const { line, area, X, Y } = pathFrom(data, w, h, pad)
  const color = accent ? 'var(--accent)' : 'var(--text)'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
      <defs>
        <linearGradient id={'sg' + gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${gid})`} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={X(data.length - 1)} cy={Y(data[data.length - 1])} r="3" fill={color} />
    </svg>
  )
}

export function LineChart({ data, labels, dates, accent = false, height = 220, valueSuffix = '', unit = 'kg', segments }: {
  data: number[]; labels?: string[]; dates?: string[]; accent?: boolean; height?: number; valueSuffix?: string; unit?: string
  segments?: { s: number; e: number; label: string; color: string }[]
}) {
  const w = 640, h = height, padL = 50, padR = 14, padT = 18, padB = 16
  const gid = useId().replace(/:/g, '')
  const [hi, setHi] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  if (!data || data.length < 2) return <div className="os-empty">Nema dovoljno podataka za graf</div>
  const min = Math.min(...data), max = Math.max(...data)
  const range = (max - min) || 1
  const X = (i: number) => padL + (i / (data.length - 1)) * (w - padL - padR)
  const Y = (v: number) => h - padB - ((v - min) / range) * (h - padT - padB)
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')
  const area = line + ` L${X(data.length - 1).toFixed(1)},${h - padB} L${X(0).toFixed(1)},${h - padB} Z`
  const color = accent ? 'var(--accent)' : 'var(--text)'
  const ticks = 4
  const last = data[data.length - 1]
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => min + (range * i) / ticks)
  const onMove = (clientX: number) => {
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const frac = (clientX - r.left) / r.width
    setHi(Math.max(0, Math.min(data.length - 1, Math.round(frac * (data.length - 1)))))
  }
  return (
    <div ref={wrapRef} style={{ position: 'relative', touchAction: 'none' }}
      onMouseMove={e => onMove(e.clientX)} onMouseLeave={() => setHi(null)}
      onTouchStart={e => onMove(e.touches[0].clientX)} onTouchMove={e => onMove(e.touches[0].clientX)} onTouchEnd={() => setHi(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={'lg' + gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* block bands — faint fill + dashed boundary (label rendered as HTML chip below) */}
        {segments && segments.map((seg, k) => {
          const leftX = seg.s <= 0 ? padL : (X(seg.s - 1) + X(seg.s)) / 2
          const rightX = seg.e >= data.length - 1 ? w - padR : (X(seg.e) + X(seg.e + 1)) / 2
          return (
            <g key={'seg' + k}>
              <rect x={leftX} y={padT} width={Math.max(0, rightX - leftX)} height={h - padT - padB} fill={seg.color} opacity={0.07} />
              {seg.s > 0 && <line x1={leftX} y1={padT} x2={leftX} y2={h - padB} stroke={seg.color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" vectorEffect="non-scaling-stroke" />}
            </g>
          )
        })}
        {tickVals.map((v, i) => (
          <line key={i} x1={padL} y1={Y(v)} x2={w - padR} y2={Y(v)} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity={i === 0 ? 0.9 : 0.55} />
        ))}
        <path d={area} fill={`url(#lg${gid})`} stroke="none" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hi != null ? (
          <>
            <line x1={X(hi)} y1={padT} x2={X(hi)} y2={h - padB} stroke="var(--accent)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7" />
            <circle cx={X(hi)} cy={Y(data[hi])} r="5" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2.5" />
          </>
        ) : (
          <>
            <line x1={X(data.length - 1)} y1={padT} x2={X(data.length - 1)} y2={h - padB} stroke={color} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.45" />
            <circle cx={X(data.length - 1)} cy={Y(last)} r="4.5" fill="var(--bg)" stroke={color} strokeWidth="2.5" />
          </>
        )}
      </svg>
      {/* y-axis labels as HTML — crisp, never stretched/overflowing (vertical is 1:1 px) */}
      {tickVals.map((v, i) => (
        <div key={'yl' + i} style={{ position: 'absolute', left: 0, width: `${(padL / w) * 100}%`, top: Y(v), transform: 'translateY(-50%)', textAlign: 'right', paddingRight: 9, boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{Math.round(v)}</div>
      ))}
      {labels && labels.map((l, i) => {
        const idx = i * Math.floor((data.length - 1) / Math.max(1, labels.length - 1))
        return <div key={'xl' + i} style={{ position: 'absolute', left: `${(X(idx) / w) * 100}%`, bottom: 0, transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{l}</div>
      })}
      {segments && segments.map((seg, k) => {
        const leftX = seg.s <= 0 ? 0 : (X(seg.s - 1) + X(seg.s)) / 2
        const rightX = seg.e >= data.length - 1 ? w : (X(seg.e) + X(seg.e + 1)) / 2
        const cx = (leftX + rightX) / 2
        return (
          <div key={'sl' + k} style={{ position: 'absolute', left: `${(cx / w) * 100}%`, bottom: 5, transform: 'translateX(-50%)', pointerEvents: 'none', maxWidth: `${((rightX - leftX) / w) * 100}%` }}>
            <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: seg.color, background: `color-mix(in srgb, ${seg.color} 16%, var(--surface-1))`, border: `1px solid color-mix(in srgb, ${seg.color} 45%, transparent)`, borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{seg.label}</span>
          </div>
        )
      })}
      {hi != null && (
        <div style={{ position: 'absolute', left: `${(X(hi) / w) * 100}%`, top: 2, transform: `translateX(${hi > data.length / 2 ? '-100%' : '0'})`, pointerEvents: 'none', background: 'var(--surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '5px 9px', whiteSpace: 'nowrap', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
          {dates?.[hi] && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{dates[hi]}</div>}
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{data[hi]}{valueSuffix}<span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 2 }}>{unit}</span></div>
        </div>
      )}
    </div>
  )
}

// Multi-series line chart with a color legend + hover tooltip (volume by variation)
export function MultiLineChart({ series, dates, height = 240 }: {
  series: { name: string; data: number[] }[]; dates?: string[]; height?: number
}) {
  const w = 640, h = height, padL = 36, padR = 16, padT = 16, padB = 28
  const [hi, setHi] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const n = Math.max(0, ...series.map(s => s.data.length))
  const all = series.flatMap(s => s.data).filter(v => v > 0)
  if (!series.length || all.length === 0 || n < 2) return <div className="os-empty">Nema podataka za odabir</div>
  const max = Math.max(...all) * 1.08 || 1
  const X = (i: number) => padL + (i / (n - 1)) * (w - padL - padR)
  const Y = (v: number) => h - padB - (v / max) * (h - padT - padB)
  const colored = series.map((s, i) => ({ ...s, color: SERIES_COLORS[i % SERIES_COLORS.length] }))
  const onMove = (clientX: number) => {
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    setHi(Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left) / r.width) * (n - 1)))))
  }
  return (
    <div>
      <div ref={wrapRef} style={{ position: 'relative', touchAction: 'none' }}
        onMouseMove={e => onMove(e.clientX)} onMouseLeave={() => setHi(null)}
        onTouchStart={e => onMove(e.touches[0].clientX)} onTouchMove={e => onMove(e.touches[0].clientX)} onTouchEnd={() => setHi(null)}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
          {Array.from({ length: 5 }).map((_, i) => {
            const v = (max * i) / 4, y = Y(v)
            return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" /><text x={padL - 8} y={y + 3} textAnchor="end" className="chart-axis">{Math.round(v)}</text></g>
          })}
          {colored.map(s => {
            const pts = s.data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')
            return <path key={s.name} d={pts} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          })}
          {hi != null && <line x1={X(hi)} y1={padT} x2={X(hi)} y2={h - padB} stroke="var(--text-muted)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          {hi != null && colored.map(s => s.data[hi] > 0 ? <circle key={s.name} cx={X(hi)} cy={Y(s.data[hi])} r="3.5" fill={s.color} stroke="var(--bg)" strokeWidth="1.5" /> : null)}
        </svg>
        {hi != null && (
          <div style={{ position: 'absolute', left: `${(X(hi) / w) * 100}%`, top: 2, transform: `translateX(${hi > n / 2 ? '-100%' : '0'})`, pointerEvents: 'none', background: 'var(--surface-3)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 9px', whiteSpace: 'nowrap', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
            {dates?.[hi] && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 3 }}>{dates[hi]}</div>}
            {colored.filter(s => s.data[hi] > 0).map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-dim)', flex: 1 }}>{s.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{(s.data[hi] * 100).toLocaleString('hr')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12 }}>
        {colored.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function VolumeBars({ volume, rpe, labels }: { volume: number[]; rpe: number[]; labels?: string[] }) {
  const w = 640, h = 220, padL = 30, padR = 30, padT = 16, padB = 28
  if (!volume || volume.length === 0) return <div className="os-empty">Nema podataka o volumenu</div>
  const maxV = Math.max(...volume) * 1.1 || 1
  const bw = (w - padL - padR) / volume.length
  const rMin = 4, rMax = 10
  const X = (i: number) => padL + i * bw + bw / 2
  const RY = (v: number) => h - padB - ((Math.max(rMin, Math.min(rMax, v)) - rMin) / (rMax - rMin)) * (h - padT - padB)
  // Keep RPE points aligned to their bar index; skip weeks with no RPE (v<=0)
  const rpePts = (rpe || []).map((v, i) => ({ v, i })).filter(p => p.v > 0)
  const rpeLine = rpePts.map((p, k) => `${k ? 'L' : 'M'}${X(p.i).toFixed(1)},${RY(p.v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
      <defs>
        <linearGradient id="volbar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--text)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--text)" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {volume.map((v, i) => {
        const bh = Math.max(0, (v / maxV) * (h - padT - padB))
        return <rect key={i} x={padL + i * bw + bw * 0.2} y={h - padB - bh} width={bw * 0.6} height={bh} rx="3" fill="url(#volbar)" />
      })}
      {rpePts.length > 1 && <path d={rpeLine} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {rpePts.map(p => <circle key={p.i} cx={X(p.i)} cy={RY(p.v)} r="3" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />)}
      {labels && labels.map((l, i) => (
        i % Math.ceil(labels.length / 6) === 0 ? <text key={i} x={X(i)} y={h - 8} textAnchor="middle" className="chart-axis">{l}</text> : null
      ))}
    </svg>
  )
}

export function Donut({ pct, label, sub, size = 170, stroke = 16, accent = true }: {
  pct: number; label: string; sub?: string; size?: number; stroke?: number; accent?: boolean
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100)
  const color = accent ? 'var(--accent)' : 'var(--text)'
  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div className="donut-center">
        <div className="donut-val">{label}</div>
        {sub && <div className="donut-sub">{sub}</div>}
      </div>
    </div>
  )
}

export function StrengthRadar({ balance }: { balance: { sqTotal: number; bpTotal: number; dlTotal: number } }) {
  const w = 260, h = 220, cx = w / 2, cy = h / 2 + 6, R = 78
  const axes = [
    { label: 'SQ/Total', val: balance.sqTotal, ang: -90, max: 50 },
    { label: 'DL/Total', val: balance.dlTotal, ang: 30, max: 50 },
    { label: 'BP/Total', val: balance.bpTotal, ang: 150, max: 50 },
  ]
  const pt = (ang: number, frac: number): [number, number] => {
    const a = (ang * Math.PI) / 180
    return [cx + Math.cos(a) * R * frac, cy + Math.sin(a) * R * frac]
  }
  const ring = (frac: number) => axes.map(a => pt(a.ang, frac).join(',')).join(' ')
  const poly = axes.map(a => pt(a.ang, Math.min(1, a.val / a.max)).join(',')).join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      {[0.33, 0.66, 1].map((f, i) => <polygon key={i} points={ring(f)} fill="none" stroke="var(--border)" strokeWidth="1" />)}
      {axes.map((a, i) => { const [x, y] = pt(a.ang, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" /> })}
      <polygon points={poly} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
      {axes.map((a, i) => { const [x, y] = pt(a.ang, Math.min(1, a.val / a.max)); return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" /> })}
    </svg>
  )
}

export function MetricBar({ value, max = 10 }: { value: number; max?: number }) {
  return (
    <div className="metric-track">
      <div className="metric-fill" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  )
}
