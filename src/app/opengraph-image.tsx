import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'LWL UP – Powerlifting klub Zagreb'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TITLE = 'LWL UP – Powerlifting klub Zagreb'
const FOOTER_LEFT = 'LWLUP.COM'
const FOOTER_RIGHT = 'TRENINZI I NATJECANJA'

// Oswald (font naslova na stranici), podskup samo za znakove sa slike. Ako Google
// Fonts nije dostupan, slika se crta zadanim fontom umjesto da build padne.
async function loadOswald(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(
      `https://fonts.googleapis.com/css2?family=Oswald:wght@700&text=${encodeURIComponent(text)}`,
      { cache: 'force-cache' },
    )).text()
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)
    if (!src) return null
    const res = await fetch(src[1], { cache: 'force-cache' })
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function Image() {
  const [logo, oswald] = await Promise.all([
    readFile(join(process.cwd(), 'public/slike/logopng.png'), 'base64'),
    loadOswald(TITLE + FOOTER_LEFT + FOOTER_RIGHT),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#131317',
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.07) 0%, transparent 70%)',
          color: '#fff',
          fontFamily: oswald ? 'Oswald' : undefined,
        }}
      >
        {/* logopng.png je 1481×1080 */}
        <img src={`data:image/png;base64,${logo}`} width={165} height={120} alt="" />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 72, height: 4, background: '#fff', marginBottom: 32 }} />
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.01em', maxWidth: 1000 }}>
            {TITLE}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)' }}>
          <span>{FOOTER_LEFT}</span>
          <span>{FOOTER_RIGHT}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: oswald ? [{ name: 'Oswald', data: oswald, weight: 700, style: 'normal' }] : undefined,
    },
  )
}
