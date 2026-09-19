import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Rekordi', 'Powerlifting rekordi i najbolji rezultati LWL UP sportaša.', '/records')

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return children
}