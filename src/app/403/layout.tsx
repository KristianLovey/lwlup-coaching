import { privatePageMetadata } from '@/lib/page-metadata'

export const metadata = privatePageMetadata('Pristup odbijen')

export default function ForbiddenLayout({ children }: { children: React.ReactNode }) {
  return children
}
