import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { surveyEmail, val, total } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

// ── security helpers ──────────────────────────────────────────────
// Escape HTML entities — user input goes straight into the e-mail HTML,
// so without this an attacker could inject markup/links (phishing) into
// the mail the coach receives.
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Sanitize the whole payload: keep only string values, trim, cap length, escape.
function sanitize(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string') continue
    out[k] = esc(v.trim().slice(0, 2000))
  }
  return out
}

// Best-effort in-memory rate limit (per IP, 5 zahtjeva / 10 min)
const hits = new Map<string, { n: number; t: number }>()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const rec = hits.get(ip)
  if (!rec || now - rec.t > 600_000) { hits.set(ip, { n: 1, t: now }); return false }
  rec.n++
  return rec.n > 5
}

// ── Route handler ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (rateLimited(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const data = sanitize(await req.json())
    if (!data.full_name || !data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return NextResponse.json({ error: 'Ime i ispravan email su obavezni' }, { status: 400 })
    }
    const tot = total(data.squat, data.bench, data.deadlift)
    const subject = `Nova prijava — ${val(data.full_name)}${tot ? ` · ${tot}kg total` : ''}${data.experience === 'Napredni' ? ' ★' : ''}`

    const { error } = await resend.emails.send({
      from: 'LWL UP Forma <onboarding@resend.dev>', // zamijeni s tvojom domenom kad verificiraš
      to: process.env.CONTACT_EMAIL!,
      subject,
      html: surveyEmail(data),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Mail failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Survey route error:', err)
    return NextResponse.json({ error: 'Mail failed' }, { status: 500 })
  }
}