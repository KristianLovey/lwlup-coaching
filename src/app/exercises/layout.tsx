import { privatePageMetadata } from '@/lib/page-metadata'

export const metadata = privatePageMetadata('Baza vježbi')

export default function ExercisesLayout({ children }: { children: React.ReactNode }) {
  return children
}
