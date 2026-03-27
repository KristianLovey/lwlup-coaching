import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LWL UP Coaching System',
  description: 'Powerlifting club and                                                            coaching system.',
  icons: {
    icon: '/slike/logopng.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body>{children}</body>
    </html>
  )
}
