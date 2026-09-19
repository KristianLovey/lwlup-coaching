import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Natjecanja', 'Najave powerlifting natjecanja, nastupi i rezultati LWL UP tima.', '/competitions')

export default function CompetitionsLayout({ children }: { children: React.ReactNode }) {
  return children
}