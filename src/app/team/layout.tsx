import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Tim', 'Upoznajte LWL UP powerlifting tim, naše sportaše i njihove rezultate.', '/team')

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children
}