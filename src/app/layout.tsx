import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LWL UP Powerlifting',
  description: 'Vodeći powerlifting klub u regiji.',
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
