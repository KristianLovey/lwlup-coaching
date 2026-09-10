import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

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

// ── helpers ───────────────────────────────────────────────────────
const val = (v: string | undefined) => (v && v.trim() ? v.trim() : '—')
// 2001-03-14 → 14.03.2001.
const fmtDate = (iso: string | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  return m ? `${m[3]}.${m[2]}.${m[1]}.` : val(iso)
}

const REQUIRED = ['full_name', 'birth_date', 'citizenship', 'residence', 'email', 'phone_number', 'category', 'competitions']

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 16px;font-size:11px;letter-spacing:0.12em;color:#888;text-transform:uppercase;font-weight:600;width:38%;border-bottom:1px solid #1a1a1a;white-space:nowrap">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#e8e8e8;border-bottom:1px solid #1a1a1a">${value}</td>
    </tr>`
}

function section(title: string, rows: string) {
  return `
    <div style="margin-bottom:24px">
      <div style="padding:10px 16px;background:#111;border-left:2px solid #333">
        <span style="font-size:9px;letter-spacing:0.5em;color:#555;font-weight:700;text-transform:uppercase">${title}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#0d0d0d">${rows}</table>
    </div>`
}

function buildEmail(d: Record<string, string>): string {
  const club = d.current_club?.trim()

  const personalRows =
    row('Ime i prezime', val(d.full_name)) +
    row('Datum rođenja', fmtDate(d.birth_date)) +
    row('Državljanstvo', val(d.citizenship)) +
    row('Mjesto prebivališta', val(d.residence)) +
    row('Email', val(d.email)) +
    row('Mobitel', val(d.phone_number))

  const compRows =
    row('Kategorija', val(d.category)) +
    row('Total', d.comp_total ? `${d.comp_total} kg` : '—') +
    row('Broj natjecanja', val(d.competitions)) +
    row('Trenutni klub', club || 'Nije član kluba')

  return `<!DOCTYPE html>
<html lang="hr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

  <!-- HEADER -->
  <tr>
    <td style="padding-bottom:32px;border-bottom:1px solid #111">
      <div style="font-size:9px;letter-spacing:0.55em;color:#444;margin-bottom:16px;font-weight:700">LWL UP KLUB</div>
      <div style="font-size:32px;font-weight:800;color:#fff;line-height:1;letter-spacing:-0.02em">UČLANJENJE U KLUB</div>
      <div style="font-size:13px;color:#444;margin-top:8px">${new Date().toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </td>
  </tr>

  <!-- IDENTITY -->
  <tr>
    <td style="padding:32px 0 24px">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.01em">${val(d.full_name)}</div>
      <div style="margin-top:8px">
        <a href="mailto:${val(d.email)}" style="color:#888;font-size:13px;text-decoration:none">${val(d.email)}</a>
        ${d.phone_number ? `<span style="color:#333;margin:0 10px">·</span><span style="color:#888;font-size:13px">${d.phone_number}</span>` : ''}
      </div>
    </td>
  </tr>

  ${club ? `
  <!-- ISPIS IZ KLUBA -->
  <tr>
    <td style="padding-bottom:24px">
      <div style="padding:14px 16px;background:#1a1405;border:1px solid #3d2f0a;color:#e0b050;font-size:13px;line-height:1.6">
        ⚠ Osoba je trenutno član kluba <strong>${club}</strong> — potreban je ispis iz tog kluba prije učlanjenja u LWL UP.
      </div>
    </td>
  </tr>` : ''}

  <!-- SECTIONS -->
  <tr>
    <td>
      ${section('Osobni podaci', personalRows)}
      ${section('Natjecateljski profil', compRows)}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="padding-top:32px;border-top:1px solid #111">
      <div style="font-size:10px;letter-spacing:0.3em;color:#333;font-weight:700">LWL UP</div>
      <div style="font-size:11px;color:#2a2a2a;margin-top:4px">Automatski generiran obrazac za učlanjenje · lwlup.com</div>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

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
      html: buildEmail(d),
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
