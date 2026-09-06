const fs = require('fs')

const FILES = [
  'src/app/training/page.tsx',
  'src/app/training/training-components.tsx',
  'src/app/training/training-hub.tsx',
  'src/app/training/training-meet.tsx',
  'src/app/training/training-priority.tsx',
]

// alpha bijelog overlaya -> neprozirni sloj (nikad --t-s1: to je boja same kartice,
// a ovi overlayi gotovo uvijek stoje UNUTAR kartice pa moraju biti stepenicu iznad)
const bgTok   = a => (a <= 0.03 ? 'var(--t-s2)' : a <= 0.07 ? 'var(--t-s3)' : 'var(--t-hi)')
const lineTok = a => (a <= 0.12 ? 'var(--t-border)' : 'var(--t-border-hi)')

const HEX = {
  '#090909': 'var(--t-bg)', '#080808': 'var(--t-bg)', '#060606': 'var(--t-bg)',
  '#111111': 'var(--t-s1)', '#0e0e0e': 'var(--t-s1)', '#0d0d0d': 'var(--t-s1)',
  '#09090e': 'var(--t-s1)', '#0d0d16': 'var(--t-s1)', '#13131f': 'var(--t-s1)',
  '#1a1a2e': 'var(--t-s1)', '#131317': 'var(--t-s1)', '#1c1c20': 'var(--t-s2)',
  '#1e1e1e': 'var(--t-s3)',
}

const BG_PROPS   = ['background', 'backgroundColor']
const BORD_PROPS = ['border', 'borderTop', 'borderBottom', 'borderLeft', 'borderRight', 'borderColor']

// Maska: sadržaj svih stringova/template literala -> razmaci, da brojanje vitičastih
// zagrada i traženje svojstava ne upadne u tekst.
const BS = String.fromCharCode(92)
function mask(src) {
  const out = src.split('')
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === "'" || c === '"') {
      const q = c; i++
      while (i < src.length && src[i] !== q) { if (src[i] === BS) { out[i] = ' '; i++ } out[i] = ' '; i++ }
      i++
    } else if (c === '`') {
      i++; let depth = 0
      while (i < src.length) {
        if (src[i] === BS) { out[i] = ' '; out[i + 1] = ' '; i += 2; continue }
        if (src[i] === '$' && src[i + 1] === '{') depth++
        if (src[i] === '}' && depth > 0) depth--
        else if (src[i] === '`' && depth === 0) break
        out[i] = ' '; i++
      }
      i++
    } else i++
  }
  return out.join('')
}

// Objekt stila oko pozicije: unatrag do neuparene '{', pa naprijed do njezinog para.
function enclosingObject(masked, pos) {
  let d = 0, start = -1
  for (let i = pos; i >= 0; i--) {
    const c = masked[i]
    if (c === '}') d++
    else if (c === '{') { if (d === 0) { start = i; break } d-- }
  }
  if (start < 0) return null
  d = 0
  for (let i = start; i < masked.length; i++) {
    const c = masked[i]
    if (c === '{') d++
    else if (c === '}') { d--; if (d === 0) return { start, end: i } }
  }
  return null
}

// Vrijednost svojstva: od ':' do zareza/zatvaranja na dubini 0.
function valueRange(masked, colon) {
  let i = colon + 1, d = 0
  while (i < masked.length) {
    const c = masked[i]
    if ('([{'.includes(c)) d++
    else if (')]}'.includes(c)) { if (d === 0) break; d-- }
    else if (c === ',' && d === 0) break
    i++
  }
  return { start: colon + 1, end: i }
}

const RGBA = /rgba\(255,\s*255,\s*255,\s*([0-9.]+)\)/g

let grand = 0
for (const f of FILES) {
  const orig = fs.readFileSync(f, 'utf8')
  const CRLF = orig.includes('\r\n')
  const src = orig.split('\r\n').join('\n')
  const masked = mask(src)

  const edits = []
  for (const [props, kind] of [[BG_PROPS, 'bg'], [BORD_PROPS, 'border']]) {
    for (const p of props) {
      const re = new RegExp('(?<![A-Za-z])' + p + '\s*:', 'g')
      let m
      while ((m = re.exec(masked))) {
        const colon = m.index + m[0].length - 1
        const { start, end } = valueRange(masked, colon)
        let val = src.slice(start, end)
        if (/gradient/.test(val)) continue                    // gradijenti ostaju prozirni
        let isLine = false
        if (kind === 'bg') {
          const obj = enclosingObject(masked, colon)
          const objTxt = obj ? src.slice(obj.start, obj.end) : ''
          // 1px crte i točkice nisu plohe — njima pripada boja ruba
          isLine = /height:\s*'1px'|width:\s*'1px'|borderRadius:\s*'50%'/.test(objTxt)
        }
        const before = val
        val = val.replace(RGBA, (_, a) => (kind === 'bg' && !isLine ? bgTok(parseFloat(a)) : lineTok(parseFloat(a))))
        val = val.replace(/#[0-9a-fA-F]{6}\b/g, h => HEX[h.toLowerCase()] ?? h)
        if (val !== before) edits.push({ start, end, val })
      }
    }
  }

  edits.sort((a, b) => b.start - a.start)
  let out = src
  const seen = new Set()
  for (const e of edits) {
    if (seen.has(e.start)) continue
    seen.add(e.start)
    out = out.slice(0, e.start) + e.val + out.slice(e.end)
  }
  fs.writeFileSync(f, CRLF ? out.split('\n').join('\r\n') : out)
  console.log(f.padEnd(45), edits.length, 'zamjena')
  grand += edits.length
}
console.log('ukupno:', grand)
