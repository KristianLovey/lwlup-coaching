import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Treneri', 'Treneri i stručna podrška LWL UP powerlifting kluba.', '/treneri')

export default function CoachesLayout({ children }: { children: React.ReactNode }) {
  return children
}