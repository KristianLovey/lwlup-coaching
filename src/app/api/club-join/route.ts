import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { clubJoinEmail, val } from '@/lib/email-templates'

// Obrazac za učlanjenje u klub. Namjerno odvojen od /api/survey (trenerstvo)
// da trenerski upitnik ostane netaknut; sigurnosni obrasci su isti kao tamo.

// ── security helpers ──────────────────────────────────────────────
// Escape HTML entities — korisnički unos ide ravno u HTML maila, pa bi bez
// ovoga netko mogao ubaciti markup/linkove (phishing) u mail koji klub prima.
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Samo string vrijednosti, trim, ograniči duljinu, escape.
function sanitize(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string') continue
    out[k] = esc(v.trim().slice(0, 500))
  }
  return out
}

// Best-effort in-memory rate limit (po IP-u, 5 zahtjeva / 10 min)
const hits = new Map<string, { n: number; t: number }>()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const rec = hits.get(ip)
  if (!rec || now - rec.t > 600_000) { hits.set(ip, { n: 1, t: now }); return false }
  rec.n++
  return rec.n > 5
}

const REQUIRED = ['full_name', 'birth_date', 'citizenship', 'residence', 'email', 'phone_number', 'category', 'competitions']

// ── Route handler ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (rateLimited(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const d = sanitize(await req.json())
    const missing = REQUIRED.filter(k => !d[k])
    if (missing.length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email ?? '')) {
      return NextResponse.json({ error: 'Nedostaju obavezna polja ili email nije ispravan', missing }, { status: 400 })
    }

    const to = process.env.CLUB_CONTACT_EMAIL || process.env.CONTACT_EMAIL
    // Resend klijent tek ovdje: SDK baca grešku bez ključa, pa bi na razini
    // modula srušio i validaciju (npr. lokalno, gdje ključa nema).
    if (!to || !process.env.RESEND_API_KEY) {
      console.error('club-join: nedostaje RESEND_API_KEY ili CONTACT_EMAIL')
      return NextResponse.json({ error: 'Mail failed' }, { status: 500 })
    }
    const resend = new Resend(process.env.RESEND_API_KEY)

    const subject = `Učlanjenje u klub — ${val(d.full_name)}${d.category ? ` · ${d.category}` : ''}${d.current_club ? ' · ispis iz drugog kluba' : ''}`

    const { error } = await resend.emails.send({
      from: 'LWL UP Forma <onboarding@resend.dev>', // zamijeni s tvojom domenom kad verificiraš
      to,
      subject,
      html: clubJoinEmail(d),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Mail failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Club join route error:', err)
    return NextResponse.json({ error: 'Mail failed' }, { status: 500 })
  }
}
