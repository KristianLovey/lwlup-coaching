import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/context/LanguageContext'

export const metadata: Metadata = {
  title: 'LWL UP Coaching',
  description: 'Powerlifting club and coaching system.',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'LWL UP Coaching',
    description: 'Powerlifting club and coaching system.',
    url: 'https://lwlup.com',
    siteName: 'LWL UP Coaching',
    images: [{ url: '/logo.png', width: 512, height: 512 }],
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
