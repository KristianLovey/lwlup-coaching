// ─── MAIL PREDLOŠCI ───────────────────────────────────────────────
// Oba obrasca (upitnik + učlanjenje) dijele isti izgled, pa su predlošci ovdje
// umjesto dva puta po route fajlu. Routei zadrže samo sanitizaciju i slanje.
//
// Izgled prati editorial jezik stranice: dvotonski naslov (bijela + siva linija),
// eyebrow s jakim trackingom, numerirane sekcije (01/02/03) i tanke crte umjesto
// ispunjenih kartica.
//
// Dvije stvari koje mail HTML razlikuju od stranice:
//  • svi stilovi moraju biti inline (Gmail baca <style> blokove),
//  • web fontovi se u Gmailu NE učitavaju — <link> ispod radi u Apple Mailu,
//    drugdje pada na sljedeći font iz stacka, pa je fallback biran da drži
//    isti dojam (uski grotesk za naslove, neutralni sans za tekst).

// Paleta = tokeni sa stranice, da mail i admin panel izgledaju isto.
const C = {
  bg:      '#0a0a0a',
  text:    '#f5f4f1',
  ghost:   '#5c5c5a', // druga linija naslova (na stranici rgba(255,255,255,0.3))
  dim:     '#a6a6a2',
  muted:   '#7c7c77',
  faint:   '#565650',
  rule:    '#1e1e1e', // crta između redaka
  ruleHi:  '#2e2e2e', // crta ispod naslova sekcije
  gold:    '#facc15',
  amber:   '#f59e0b',
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
      <td style="padding:13px 0;font-family:${FB};font-size:10px;letter-spacing:0.2em;color:${C.muted};text-transform:uppercase;font-weight:600;width:40%;border-bottom:1px solid ${C.rule};vertical-align:top">${label}</td>
      <td style="padding:13px 0;font-family:${FB};font-size:14px;line-height:1.6;color:${C.text};border-bottom:1px solid ${C.rule}">${value}</td>
    </tr>`
}

/** Email u retku — bez eksplicitnog <a> Gmail sam linka adresu i oboji je plavo. */
function rowMail(label: string, email: string) {
  const e = val(email)
  return row(label, `<a href="mailto:${e}" style="color:${C.text};text-decoration:none;border-bottom:1px solid ${C.ruleHi}">${e}</a>`)
}

/** Sekcija: broj + naslov + tanka crta, bez ispunjene trake (kao lista na stranici). */
function section(num: string, title: string, rows: string) {
  return `
    <div style="margin-bottom:34px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${C.ruleHi}">
        <tr>
          <td style="padding:0 0 10px;width:34px;font-family:${FB};font-size:10px;font-weight:700;color:${C.faint};letter-spacing:0.1em;vertical-align:bottom">${num}</td>
          <td style="padding:0 0 10px;font-family:${FB};font-size:11px;letter-spacing:0.3em;color:${C.text};font-weight:700;text-transform:uppercase;vertical-align:bottom">${title}</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${rows}</table>
    </div>`
}

/** Stupac u traci s liftovima — bez ispune, samo tanka crta među njima. */
function statCell(label: string, value: string, unit: string, last = false) {
  return `
    <td style="width:25%;padding:0;${last ? '' : `border-right:1px solid ${C.rule}`}">
      <div style="padding:4px 10px 0;text-align:center">
        <div style="font-family:${FB};font-size:9px;letter-spacing:0.28em;color:${C.muted};margin-bottom:10px;font-weight:700">${label}</div>
        <div style="font-family:${FD};font-size:30px;font-weight:700;color:${C.text};line-height:1">${value}${unit}</div>
      </div>
    </td>`
}

const kg = `<span style="font-family:${FB};font-size:11px;font-weight:400;color:${C.faint};margin-left:3px">kg</span>`

/** Okvir maila — dvotonski naslov, sadržaj, podnožje. */
function shell(eyebrow: string, titleTop: string, titleBottom: string, badge: string, body: string) {
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

<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:56px 20px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

  <!-- ZAGLAVLJE -->
  <tr>
    <td style="padding-bottom:40px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top">
            <div style="font-family:${FB};font-size:10px;letter-spacing:0.42em;color:${C.muted};margin-bottom:18px;font-weight:700">${eyebrow}</div>
            <div style="font-family:${FD};font-size:46px;font-weight:700;color:${C.text};line-height:1.0;text-transform:uppercase">${titleTop}</div>
            <div style="font-family:${FD};font-size:46px;font-weight:700;color:${C.ghost};line-height:1.0;text-transform:uppercase">${titleBottom}</div>
            <div style="font-family:${FB};font-size:12px;color:${C.faint};margin-top:16px">${now()}</div>
          </td>
          ${badge ? `<td align="right" valign="top">${badge}</td>` : ''}
        </tr>
      </table>
    </td>
  </tr>

  ${body}

  <!-- PODNOŽJE -->
  <tr>
    <td style="padding-top:30px;border-top:1px solid ${C.ruleHi}">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-family:${FB};font-size:10px;letter-spacing:0.3em;color:${C.muted};font-weight:700">LWL UP COACHING</div>
            <div style="font-family:${FB};font-size:11px;color:${C.faint};margin-top:6px">Automatski generirano s obrasca na stranici</div>
          </td>
          <td align="right" valign="bottom">
            <a href="https://lwlup.com" style="font-family:${FB};font-size:11px;letter-spacing:0.18em;color:${C.muted};text-decoration:none">lwlup.com</a>
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

/** Ime + kontakt, odvojeno crtom iznad sekcija. */
function identity(name: string, email: string, phone: string | undefined) {
  const e = val(email)
  return `
  <tr>
    <td style="padding:0 0 34px">
      <div style="font-family:${FD};font-size:26px;font-weight:700;color:${C.text};line-height:1.15">${val(name)}</div>
      <div style="margin-top:10px;font-family:${FB};font-size:13px;color:${C.dim}">
        <a href="mailto:${e}" style="color:${C.dim};text-decoration:none">${e}</a>
        ${phone ? `<span style="color:${C.faint};margin:0 10px">·</span>${phone}` : ''}
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
    <div style="display:inline-block;padding:7px 13px;border:1px solid ${isAdvanced ? C.gold : C.ruleHi};font-family:${FB};font-size:10px;letter-spacing:0.2em;color:${isAdvanced ? C.gold : C.dim};font-weight:700">
      ${isAdvanced ? '★ NAPREDNI' : (data.experience?.toUpperCase() || 'POČETNIK')}
    </div>`

  const lifts = hasLifts ? `
  <tr>
    <td style="padding:0 0 34px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.ruleHi};border-bottom:1px solid ${C.ruleHi};padding:0">
        <tr>
          <td style="padding:22px 0">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${statCell('SQUAT', val(data.squat), data.squat ? kg : '')}
                ${statCell('BENCH', val(data.bench), data.bench ? kg : '')}
                ${statCell('DEADLIFT', val(data.deadlift), data.deadlift ? kg : '', !tot)}
                ${tot ? statCell('TOTAL', String(tot), kg, true) : ''}
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>` : ''

  let n = 0
  const num = () => String(++n).padStart(2, '0')

  const body = `
  ${identity(data.full_name, data.email, data.phone_number)}
  ${lifts}
  <tr>
    <td>
      ${section(num(), 'Osobni podaci',
        row('Puno ime', val(data.full_name)) +
        rowMail('Email', data.email) +
        row('Telefon', val(data.phone_number)) +
        row('Dob', data.age ? `${data.age} god.` : '—') +
        row('Spol', val(data.gender)) +
        row('Tjelesna težina', data.bodyweight ? `${data.bodyweight} kg` : '—'))}
      ${section(num(), 'Trening',
        row('Iskustvo', val(data.experience)) +
        row('Dana tjedno', val(data.days_per_week)) +
        row('Natjecanja', val(data.has_competed)))}
      ${isAdvanced ? section(num(), 'Napredni profil',
        row('Tip treninga', val(data.training_style)) +
        row('Programi / treneri', val(data.program_history)) +
        row('Trajanje sesije', val(data.session_duration)) +
        row('Kvaliteta prehrane', val(data.nutrition_quality)) +
        row('Suplementi', val(data.supplements)) +
        row('Oprema', val(data.equipment)) +
        row('Recovery navike', val(data.recovery_habits)) +
        row('Coaching povijest', val(data.coaching_history))) : ''}
      ${section(num(), 'Ciljevi i napomene',
        row('Ciljevi', val(data.goals)) +
        row('Ozljede', val(data.injuries)) +
        row('Dodatno', val(data.additional)))}
    </td>
  </tr>`

  return shell('LWL UP COACHING', 'Nova', 'Prijava', badge, body)
}

// ── UČLANJENJE U KLUB ─────────────────────────────────────────────
export function clubJoinEmail(d: Record<string, string>): string {
  const club = d.current_club?.trim()

  const warning = club ? `
  <tr>
    <td style="padding:0 0 34px">
      <div style="border-left:2px solid ${C.amber};padding:2px 0 2px 16px;font-family:${FB};color:${C.amber};font-size:13px;line-height:1.7">
        Osoba je trenutno član kluba <strong>${club}</strong> — potreban je ispis iz tog kluba prije učlanjenja u LWL UP.
      </div>
    </td>
  </tr>` : ''

  const body = `
  ${identity(d.full_name, d.email, d.phone_number)}
  ${warning}
  <tr>
    <td>
      ${section('01', 'Osobni podaci',
        row('Ime i prezime', val(d.full_name)) +
        row('Datum rođenja', fmtDate(d.birth_date)) +
        row('Državljanstvo', val(d.citizenship)) +
        row('Mjesto prebivališta', val(d.residence)) +
        rowMail('Email', d.email) +
        row('Mobitel', val(d.phone_number)))}
      ${section('02', 'Natjecateljski profil',
        row('Kategorija', val(d.category)) +
        row('Total', d.comp_total ? `${d.comp_total} kg` : '—') +
        row('Broj natjecanja', val(d.competitions)) +
        row('Trenutni klub', club || 'Nije član kluba'))}
    </td>
  </tr>`

  return shell('LWL UP KLUB', 'Učlanjenje', 'u klub', '', body)
}
