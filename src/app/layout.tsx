import type { Metadata } from 'next'
import { Space_Grotesk, Bricolage_Grotesque } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/context/LanguageContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
  variable: '--font-sg',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-bg',
})

export const metadata: Metadata = {
  title: 'LWL UP Coaching',
  description: 'Powerlifting club and coaching system from Croatia.',
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
    description: 'Powerlifting club and coaching system from Croatia.',
    url: 'https://lwlup.com',
    siteName: 'LWL UP Coaching',
    images: [{ url: 'https://lwlup.com/icon.png', width: 1302, height: 980, alt: 'LWL UP Coaching Logo' }],
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={`${spaceGrotesk.variable} ${bricolage.variable}`}>
      <head>
        {/* dns-prefetch only for Supabase */}
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
      <body className={spaceGrotesk.className}>
        <LanguageProvider>
          <ErrorBoundary label="App">{children}</ErrorBoundary>
        </LanguageProvider>
      </body>
    </html>
  )
}
