import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LWLUP — Coaching System',
  description: 'Elite powerlifting coaching. LWL UP.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body>{children}</body>
    </html>
  )
}
