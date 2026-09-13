// ─── MAIL PREDLOŠCI ───────────────────────────────────────────────
// Oba obrasca (upitnik + učlanjenje) dijele isti izgled, pa su predlošci ovdje
// umjesto dva puta po route fajlu. Routei zadrže samo sanitizaciju i slanje.
//
// Dvije stvari koje mail HTML razlikuju od stranice:
//  • svi stilovi moraju biti inline (Gmail baca <style> blokove),
//  • web fontovi se u Gmailu NE učitavaju — <link> ispod radi u Apple Mailu,
//    drugdje pada na sljedeći font iz stacka, pa je fallback biran da drži
//    isti dojam (uski grotesk za naslove, neutralni sans za tekst).

// Paleta = tokeni sa stranice (--t-*), da mail i admin panel izgledaju isto.
const C = {
  bg:       '#0a0a0a',
  s1:       '#121212', // ploha kartice
  s2:       '#181818', // zaglavlje sekcije / istaknuto
  border:   '#232323',
  borderHi: '#3a3a3a',
  text:     '#f5f4f1',
  dim:      '#a6a6a2',
  muted:    '#7c7c77',
  faint:    '#565650',
  gold:     '#facc15',
  amber:    '#f59e0b',
}

const FD = "'Oswald','Arial Narrow',Arial,Helvetica,sans-serif"
const FB = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"

// ── prikazni helperi ──────────────────────────────────────────────
export const val = (v: string | undefined) => (v && v.trim() ? v.trim() : '—')

export const total = (s: string, b: string, d: string) => {
  const n = [s, b, d].map(Number)
  return n.every(Boolean) ? n.reduce((a, c) => a + c, 0) : null
}

// 2001-03-14 → 14.03.2001.
export const fmtDate = (iso: string | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  return m ? `${m[3]}.${m[2]}.${m[1]}.` : val(iso)
}

const now = () =>
  new Date().toLocaleDateString('hr-HR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

// ── gradivni blokovi ──────────────────────────────────────────────
function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:11px 16px;font-family:${FB};font-size:10px;letter-spacing:0.18em;color:${C.muted};text-transform:uppercase;font-weight:600;width:38%;border-bottom:1px solid ${C.border};white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:11px 16px;font-family:${FB};font-size:14px;line-height:1.55;color:${C.text};border-bottom:1px solid ${C.border}">${value}</td>
    </tr>`
}

function section(title: string, rows: string) {
  return `
    <div style="margin-bottom:22px">
      <div style="padding:11px 16px;background:${C.s2};border-left:2px solid ${C.borderHi}">
        <span style="font-family:${FB};font-size:10px;letter-spacing:0.42em;color:${C.dim};font-weight:700;text-transform:uppercase">${title}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:${C.s1}">${rows}</table>
    </div>`
}

function statBox(label: string, value: string, unit: string, highlight = false) {
  return `
    <td style="width:25%;padding:0">
      <div style="padding:20px 10px;text-align:center;background:${highlight ? C.s2 : C.s1};border-right:1px solid ${C.border}">
        <div style="font-family:${FB};font-size:9px;letter-spacing:0.3em;color:${C.muted};margin-bottom:10px;font-weight:700">${label}</div>
        <div style="font-family:${FD};font-size:28px;font-weight:700;color:${C.text};line-height:1">${value}${unit}</div>
      </div>
    </td>`
}

const kg = `<span style="font-family:${FB};font-size:11px;font-weight:400;color:${C.faint};margin-left:3px">kg</span>`

/** Zajednički okvir maila — <head>, pozadina, širina, podnožje. */
function shell(eyebrow: string, title: string, badge: string, body: string) {
  return `<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FB};-webkit-font-smoothing:antialiased">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:40px 20px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

  <!-- ZAGLAVLJE -->
  <tr>
    <td style="padding-bottom:28px;border-bottom:1px solid ${C.border}">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-family:${FB};font-size:10px;letter-spacing:0.42em;color:${C.muted};margin-bottom:14px;font-weight:700">${eyebrow}</div>
            <div style="font-family:${FD};font-size:36px;font-weight:700;color:${C.text};line-height:1.05;text-transform:uppercase">${title}</div>
            <div style="font-family:${FB};font-size:12px;color:${C.faint};margin-top:10px">${now()}</div>
          </td>
          ${badge ? `<td align="right" valign="top">${badge}</td>` : ''}
        </tr>
      </table>
    </td>
  </tr>

  ${body}

  <!-- PODNOŽJE -->
  <tr>
    <td style="padding-top:28px;border-top:1px solid ${C.border}">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-family:${FB};font-size:10px;letter-spacing:0.3em;color:${C.faint};font-weight:700">LWL UP COACHING</div>
            <div style="font-family:${FB};font-size:11px;color:${C.faint};margin-top:5px">Automatski generirano s obrasca na stranici</div>
          </td>
          <td align="right" valign="bottom">
            <a href="https://lwlup.com" style="font-family:${FB};font-size:11px;letter-spacing:0.15em;color:${C.muted};text-decoration:none">lwlup.com</a>
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

/** Ime + kontakt ispod zaglavlja. */
function identity(name: string, email: string, phone: string | undefined) {
  return `
  <tr>
    <td style="padding:30px 0 22px">
      <div style="font-family:${FD};font-size:24px;font-weight:700;color:${C.text};line-height:1.15">${val(name)}</div>
      <div style="margin-top:9px">
        <a href="mailto:${val(email)}" style="font-family:${FB};font-size:13px;color:${C.dim};text-decoration:none">${val(email)}</a>
        ${phone ? `<span style="color:${C.border};margin:0 10px">·</span><span style="font-family:${FB};font-size:13px;color:${C.dim}">${phone}</span>` : ''}
      </div>
    </td>
  </tr>`
}

// ── UPITNIK ───────────────────────────────────────────────────────
export function surveyEmail(data: Record<string, string>): string {
  const isAdvanced = data.experience === 'Napredni'
  const tot = total(data.squat, data.bench, data.deadlift)
  const hasLifts = !!(data.squat || data.bench || data.deadlift)

  const badge = `
    <div style="display:inline-block;padding:7px 14px;background:${C.s2};border:1px solid ${isAdvanced ? C.gold : C.border};font-family:${FB};font-size:10px;letter-spacing:0.2em;color:${isAdvanced ? C.gold : C.dim};font-weight:700">
      ${isAdvanced ? '★ NAPREDNI' : (data.experience?.toUpperCase() || 'POČETNIK')}
    </div>`

  const lifts = hasLifts ? `
  <tr>
    <td style="padding-bottom:22px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border}">
        <tr>
          ${statBox('SQUAT', val(data.squat), data.squat ? kg : '')}
          ${statBox('BENCH', val(data.bench), data.bench ? kg : '')}
          ${statBox('DEADLIFT', val(data.deadlift), data.deadlift ? kg : '')}
          ${tot ? statBox('TOTAL', String(tot), kg, true) : '<td style="width:25%"></td>'}
        </tr>
      </table>
    </td>
  </tr>` : ''

  const advanced = isAdvanced ? section('Napredni profil',
    row('Tip treninga', val(data.training_style)) +
    row('Programi / treneri', val(data.program_history)) +
    row('Trajanje sesije', val(data.session_duration)) +
    row('Kvaliteta prehrane', val(data.nutrition_quality)) +
    row('Suplementi', val(data.supplements)) +
    row('Oprema', val(data.equipment)) +
    row('Recovery navike', val(data.recovery_habits)) +
    row('Coaching povijest', val(data.coaching_history))
  ) : ''

  const body = `
  ${identity(data.full_name, data.email, data.phone_number)}
  ${lifts}
  <tr>
    <td>
      ${section('Osobni podaci',
        row('Puno ime', val(data.full_name)) +
        row('Email', val(data.email)) +
        row('Telefon', val(data.phone_number)) +
        row('Dob', data.age ? `${data.age} god.` : '—') +
        row('Spol', val(data.gender)) +
        row('Tjelesna težina', data.bodyweight ? `${data.bodyweight} kg` : '—'))}
      ${section('Trening',
        row('Iskustvo', val(data.experience)) +
        row('Dana tjedno', val(data.days_per_week)) +
        row('Natjecanja', val(data.has_competed)))}
      ${advanced}
      ${section('Ciljevi i napomene',
        row('Ciljevi', val(data.goals)) +
        row('Ozljede', val(data.injuries)) +
        row('Dodatno', val(data.additional)))}
    </td>
  </tr>`

  return shell('LWL UP COACHING', 'Nova prijava', badge, body)
}

// ── UČLANJENJE U KLUB ─────────────────────────────────────────────
export function clubJoinEmail(d: Record<string, string>): string {
  const club = d.current_club?.trim()

  const warning = club ? `
  <tr>
    <td style="padding-bottom:22px">
      <div style="padding:14px 16px;background:#2a1e05;border:1px solid #4a3a0c;border-left:3px solid ${C.amber};font-family:${FB};color:${C.amber};font-size:13px;line-height:1.65">
        Osoba je trenutno član kluba <strong>${club}</strong> — potreban je ispis iz tog kluba prije učlanjenja u LWL UP.
      </div>
    </td>
  </tr>` : ''

  const body = `
  ${identity(d.full_name, d.email, d.phone_number)}
  ${warning}
  <tr>
    <td>
      ${section('Osobni podaci',
        row('Ime i prezime', val(d.full_name)) +
        row('Datum rođenja', fmtDate(d.birth_date)) +
        row('Državljanstvo', val(d.citizenship)) +
        row('Mjesto prebivališta', val(d.residence)) +
        row('Email', val(d.email)) +
        row('Mobitel', val(d.phone_number)))}
      ${section('Natjecateljski profil',
        row('Kategorija', val(d.category)) +
        row('Total', d.comp_total ? `${d.comp_total} kg` : '—') +
        row('Broj natjecanja', val(d.competitions)) +
        row('Trenutni klub', club || 'Nije član kluba'))}
    </td>
  </tr>`

  return shell('LWL UP KLUB', 'Učlanjenje u klub', '', body)
}
