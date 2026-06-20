'use client'
// LWL UP · ADMIN OS — monochrome SVG charts (B&W + red accent)
// Pure presentational; all data comes from props (real Supabase aggregates).
import { useId } from 'react'

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

export function LineChart({ data, labels, accent = false, height = 220, valueSuffix = '' }: {
  data: number[]; labels?: string[]; accent?: boolean; height?: number; valueSuffix?: string
}) {
  const w = 640, h = height, padL = 36, padR = 16, padT = 16, padB = 28
  const gid = useId().replace(/:/g, '')
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
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
      <defs>
        <linearGradient id={'lg' + gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = min + (range * i) / ticks
        const y = Y(v)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={padL - 8} y={y + 3} textAnchor="end" className="chart-axis">{Math.round(v)}</text>
          </g>
        )
      })}
      <path d={area} fill={`url(#lg${gid})`} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1={X(data.length - 1)} y1={padT} x2={X(data.length - 1)} y2={h - padB} stroke={color} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.5" />
      <circle cx={X(data.length - 1)} cy={Y(last)} r="4.5" fill="var(--bg)" stroke={color} strokeWidth="2.5" />
      <g transform={`translate(${X(data.length - 1) - 4}, ${Y(last) - 12})`}>
        <text textAnchor="end" className="chart-endlabel" fill={color}>{last}{valueSuffix}</text>
      </g>
      {labels && labels.map((l, i) => (
        <text key={i} x={X(i * Math.floor((data.length - 1) / Math.max(1, labels.length - 1)))} y={h - 8} textAnchor="middle" className="chart-axis">{l}</text>
      ))}
    </svg>
  )
}

export function VolumeBars({ volume, rpe, labels }: { volume: number[]; rpe: number[]; labels?: string[] }) {
  const w = 640, h = 220, padL = 30, padR = 30, padT = 16, padB = 28
  if (!volume || volume.length === 0) return <div className="os-empty">Nema podataka o volumenu</div>
  const maxV = Math.max(...volume) * 1.1 || 1
  const bw = (w - padL - padR) / volume.length
  const rMin = 4, rMax = 10
  const X = (i: number) => padL + i * bw + bw / 2
  const RY = (v: number) => h - padB - ((v - rMin) / (rMax - rMin)) * (h - padT - padB)
  const rpeLine = (rpe || []).map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${RY(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
      {volume.map((v, i) => {
        const bh = (v / maxV) * (h - padT - padB)
        return <rect key={i} x={padL + i * bw + bw * 0.18} y={h - padB - bh} width={bw * 0.64} height={bh} rx="2" fill="var(--text)" opacity="0.22" />
      })}
      {rpe && rpe.length > 1 && <path d={rpeLine} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {(rpe || []).map((v, i) => <circle key={i} cx={X(i)} cy={RY(v)} r="2.5" fill="var(--accent)" />)}
      {labels && labels.map((l, i) => (
        <text key={i} x={padL + (i / Math.max(1, labels.length - 1)) * (w - padL - padR)} y={h - 8} textAnchor="middle" className="chart-axis">{l}</text>
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

export function StrengthRadar({ balance }: { balance: { benchSquat: number; totalSquat: number; deadliftSquat: number } }) {
  const w = 260, h = 220, cx = w / 2, cy = h / 2 + 6, R = 78
  const axes = [
    { label: 'Bench/Squat', val: balance.benchSquat, ang: -90, max: 120 },
    { label: 'Total/Squat', val: balance.totalSquat, ang: 30, max: 280 },
    { label: 'Deadlift/Squat', val: balance.deadliftSquat, ang: 150, max: 150 },
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
