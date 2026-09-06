import type { Metadata, Viewport } from 'next'
import { Oswald, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/context/LanguageContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CapacitorDetect } from '@/app/components/CapacitorDetect'

// Naslovi — uski, visoki sportski sans (varijabilni font: cijeli raspon 200–700)
const oswald = Oswald({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-os',
})

// Tekst, tablice i brojke — neutralan i čitljiv na ekranu
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-in',
})

// Mono — used by the admin "OS" design for labels / tabular numbers
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-jb',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'LWL UP Coaching',
  description: 'Powerlifting klub i sustav treninga iz Hrvatske. Individualni program, analiza tehnike i natjecateljski fokus — LWL UP YOUR GAME.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '1302x980' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'LWL UP Coaching',
    description: 'Powerlifting klub i sustav treninga iz Hrvatske. Individualni program, analiza tehnike i natjecateljski fokus — LWL UP YOUR GAME.',
    url: 'https://lwlup.com',
    siteName: 'LWL UP Coaching',
    images: [{ url: 'https://lwlup.com/icon.png', width: 1302, height: 980, alt: 'LWL UP Coaching Logo' }],
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={`${oswald.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* preconnect: uspostavi DNS+TCP+TLS prema Supabaseu prije prvog API poziva */}
        <link rel="preconnect" href="https://qrnibzwcpbpzjgnebqnv.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://qrnibzwcpbpzjgnebqnv.supabase.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'LWL UP Coaching',
            url: 'https://lwlup.com',
            logo: 'https://lwlup.com/icon.png',
          })}}
        />
      </head>
      <body className={inter.className}>
        <CapacitorDetect />
        <LanguageProvider>
          <ErrorBoundary label="App">{children}</ErrorBoundary>
        </LanguageProvider>
      </body>
    </html>
  )
}
