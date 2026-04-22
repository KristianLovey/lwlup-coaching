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
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
