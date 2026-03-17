import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ── helpers ───────────────────────────────────────────────────────
const val = (v: string | undefined) => (v && v.trim() ? v.trim() : '—')
const total = (s: string, b: string, d: string) => {
  const n = [s, b, d].map(Number)
  return n.every(Boolean) ? n.reduce((a, c) => a + c, 0) : null
}

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

function liftBox(label: string, kg: string) {
  const hasVal = kg && kg !== '—'
  return `
    <td style="width:25%;padding:0">
      <div style="padding:20px 12px;text-align:center;background:#111;border-right:1px solid #1a1a1a">
        <div style="font-size:9px;letter-spacing:0.3em;color:#555;margin-bottom:8px;font-weight:700">${label}</div>
        <div style="font-size:26px;font-weight:800;color:#fff;line-height:1">${val(kg)}${hasVal ? '<span style="font-size:11px;color:#444;margin-left:3px">kg</span>' : ''}</div>
      </div>
    </td>`
}

function buildEmail(data: Record<string, string>): string {
  const isAdvanced = data.experience === 'Napredni'
  const tot = total(data.squat, data.bench, data.deadlift)

  const personalRows =
    row('Puno ime', val(data.full_name)) +
    row('Email', val(data.email)) +
    row('Telefon', val(data.phone_number)) +
    row('Dob', data.age ? `${data.age} god.` : '—') +
    row('Spol', val(data.gender)) +
    row('Tjelesna težina', data.bodyweight ? `${data.bodyweight} kg` : '—')

  const trainingRows =
    row('Iskustvo', val(data.experience)) +
    row('Dana tjedno', val(data.days_per_week)) +
    row('Natjecanja', val(data.has_competed))

  const goalsRows =
    row('Ciljevi', val(data.goals)) +
    row('Ozljede', val(data.injuries)) +
    row('Dodatno', val(data.additional))

  const advancedSection = isAdvanced ? section('Napredni profil',
    row('Tip treninga', val(data.training_style)) +
    row('Programi / treneri', val(data.program_history)) +
    row('Trajanje sesije', val(data.session_duration)) +
    row('Kvaliteta prehrane', val(data.nutrition_quality)) +
    row('Suplementi', val(data.supplements)) +
    row('Oprema', val(data.equipment)) +
    row('Recovery navike', val(data.recovery_habits)) +
    row('Coaching povijest', val(data.coaching_history))
  ) : ''

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
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:9px;letter-spacing:0.55em;color:#444;margin-bottom:16px;font-weight:700">LWLUP COACHING</div>
            <div style="font-size:32px;font-weight:800;color:#fff;line-height:1;letter-spacing:-0.02em">NOVA PRIJAVA</div>
            <div style="font-size:13px;color:#444;margin-top:8px">${new Date().toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </td>
          <td align="right" valign="top">
            <div style="display:inline-block;padding:6px 14px;background:#111;border:1px solid #222;font-size:10px;letter-spacing:0.2em;color:${isAdvanced ? '#c0a060' : '#666'};font-weight:700">
              ${isAdvanced ? '★ NAPREDNI' : (data.experience?.toUpperCase() || 'POČETNIK')}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- IDENTITY -->
  <tr>
    <td style="padding:32px 0 24px">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.01em">${val(data.full_name)}</div>
      <div style="margin-top:8px">
        <a href="mailto:${val(data.email)}" style="color:#888;font-size:13px;text-decoration:none">${val(data.email)}</a>
        ${data.phone_number ? `<span style="color:#333;margin:0 10px">·</span><span style="color:#888;font-size:13px">${data.phone_number}</span>` : ''}
      </div>
    </td>
  </tr>

  <!-- LIFTS -->
  ${(data.squat || data.bench || data.deadlift) ? `
  <tr>
    <td style="padding-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a1a1a">
        <tr>
          ${liftBox('SQUAT', data.squat)}
          ${liftBox('BENCH', data.bench)}
          ${liftBox('DEADLIFT', data.deadlift)}
          ${tot ? `
          <td style="width:25%;padding:0">
            <div style="padding:20px 12px;text-align:center;background:#161616">
              <div style="font-size:9px;letter-spacing:0.3em;color:#555;margin-bottom:8px;font-weight:700">TOTAL</div>
              <div style="font-size:26px;font-weight:800;color:#fff;line-height:1">${tot}<span style="font-size:11px;color:#444;margin-left:3px">kg</span></div>
            </div>
          </td>` : '<td></td>'}
        </tr>
      </table>
    </td>
  </tr>` : ''}

  <!-- SECTIONS -->
  <tr>
    <td>
      ${section('Osobni podaci', personalRows)}
      ${section('Trening', trainingRows)}
      ${advancedSection}
      ${section('Ciljevi i napomene', goalsRows)}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="padding-top:32px;border-top:1px solid #111">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:10px;letter-spacing:0.3em;color:#333;font-weight:700">LWLUP COACHING SYSTEM</div>
            <div style="font-size:11px;color:#2a2a2a;margin-top:4px">Automatski generiran upitnik</div>
          </td>
          <td align="right">
            <div style="font-size:10px;letter-spacing:0.15em;color:#2a2a2a">lwlup.com</div>
          </td>
        </tr>
      </table>
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
    const data = await req.json()
    const tot = total(data.squat, data.bench, data.deadlift)
    const subject = `Nova prijava — ${val(data.full_name)}${tot ? ` · ${tot}kg total` : ''}${data.experience === 'Napredni' ? ' ★' : ''}`

    const { error } = await resend.emails.send({
      from: 'LWLUP Forma <onboarding@resend.dev>', // zamijeni s tvojom domenom kad verificiraš
      to: process.env.CONTACT_EMAIL!,
      subject,
      html: buildEmail(data),
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