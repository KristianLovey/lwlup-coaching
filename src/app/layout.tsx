import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/context/LanguageContext'

export const metadata: Metadata = {
  title: 'LWL UP Coaching',
  description: 'Powerlifting club and coaching system from Croatia.',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'LWL UP Coaching',
    description: 'Powerlifting club and coaching system from Croatia.',
    url: 'https://lwlup.com',
    siteName: 'LWL UP Coaching',
    images: [{ url: '/favicon.ico', width: 512, height: 512 }],
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <head>
        {/* Preconnect to font origins before any parsing */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Non-blocking font load — replaces @import in globals.css */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&display=swap"
        />
        {/* dns-prefetch only for Supabase — preconnect flagged as unused by Lighthouse */}
        <link rel="dns-prefetch" href="https://qrnibzwcpbpzjgnebqnv.supabase.co" />
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
